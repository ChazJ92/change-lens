import { RELATIONS, type Row, type TableName } from "./db";
import { getAll, insertRows, updateWhere, deleteWhere } from "./store";
import { MOCK_SESSION, MOCK_USER } from "./seed";

/**
 * A localStorage-backed stand-in for the Supabase browser client.
 *
 * It implements the subset of the Supabase query-builder, auth and storage
 * APIs that the app uses, delegating all reads/writes to the shared mock store.
 * Because it presents the same surface as `@supabase/supabase-js`, screens stay
 * completely unchanged — swapping back to the real client is a one-line change
 * in `src/lib/supabase-browser.ts`.
 */

type Result<T> = { data: T; error: { message: string } | null };
type Filter =
  | { op: "eq"; col: string; val: unknown }
  | { op: "in"; col: string; vals: unknown[] };
type OrderBy = { col: string; ascending: boolean };

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;

// ---- Embedded-select parsing -------------------------------------------------

function splitTopLevel(input: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of input) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      if (cur.trim()) out.push(cur.trim());
      cur = "";
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

function parseToken(token: string): { name: string; inner: string | null } {
  const open = token.indexOf("(");
  if (open === -1) return { name: token.trim(), inner: null };
  const name = token.slice(0, open).trim();
  const inner = token.slice(open + 1, token.lastIndexOf(")"));
  return { name, inner };
}

function resolveEmbedded(table: TableName, row: Record<string, unknown>, selectStr: string): Record<string, unknown> {
  const result: Record<string, unknown> = { ...row };
  for (const token of splitTopLevel(selectStr)) {
    const { name, inner } = parseToken(token);
    if (name === "*" || inner === null) continue; // scalar column — full row is already returned
    const rel = RELATIONS[table]?.[name];
    if (!rel) continue;
    if (rel.kind === "to-one") {
      const target = getAll(rel.target).find(
        (r) => (r as Record<string, unknown>)[rel.targetKey] === row[rel.fk],
      ) as Record<string, unknown> | undefined;
      result[name] = target ? resolveEmbedded(rel.target, target, inner || "*") : null;
    } else {
      const targets = getAll(rel.target).filter(
        (r) => (r as Record<string, unknown>)[rel.fk] === row[rel.localKey],
      ) as Record<string, unknown>[];
      result[name] = targets.map((t) => resolveEmbedded(rel.target, t, inner || "*"));
    }
  }
  return result;
}

function hasEmbeds(table: TableName, selectStr: string): boolean {
  if (!selectStr.includes("(")) return false;
  return splitTopLevel(selectStr).some((t) => parseToken(t).inner !== null);
}

// ---- Query builders ----------------------------------------------------------

class SelectQuery<T extends TableName> implements PromiseLike<Result<Row<T>[] | Row<T> | null>> {
  private filters: Filter[] = [];
  private orderBys: OrderBy[] = [];
  private limitN: number | null = null;
  private rowMode: "many" | "single" | "maybe" = "many";

  constructor(private table: T, private selectStr: string) {}

  eq(col: string, val: unknown) {
    this.filters.push({ op: "eq", col, val });
    return this;
  }
  in(col: string, vals: unknown[]) {
    this.filters.push({ op: "in", col, vals });
    return this;
  }
  order(col: string, opts?: { ascending?: boolean }) {
    this.orderBys.push({ col, ascending: opts?.ascending ?? true });
    return this;
  }
  limit(n: number) {
    this.limitN = n;
    return this;
  }
  single() {
    this.rowMode = "single";
    return this;
  }
  maybeSingle() {
    this.rowMode = "maybe";
    return this;
  }

  private run(): Result<Row<T>[] | Row<T> | null> {
    let rows = getAll(this.table) as Record<string, unknown>[];
    for (const f of this.filters) {
      if (f.op === "eq") rows = rows.filter((r) => r[f.col] === f.val);
      else rows = rows.filter((r) => f.vals.includes(r[f.col]));
    }
    if (this.orderBys.length) {
      rows = [...rows].sort((a, b) => {
        for (const o of this.orderBys) {
          const av = a[o.col];
          const bv = b[o.col];
          if (av === bv) continue;
          if (av == null) return 1;
          if (bv == null) return -1;
          const cmp = av < bv ? -1 : 1;
          return o.ascending ? cmp : -cmp;
        }
        return 0;
      });
    }
    if (this.limitN != null) rows = rows.slice(0, this.limitN);
    if (hasEmbeds(this.table, this.selectStr)) {
      rows = rows.map((r) => resolveEmbedded(this.table, r, this.selectStr));
    }
    if (this.rowMode === "single") {
      if (rows.length === 0) return { data: null, error: { message: "No rows found" } };
      return { data: rows[0] as Row<T>, error: null };
    }
    if (this.rowMode === "maybe") {
      return { data: (rows[0] as Row<T>) ?? null, error: null };
    }
    return { data: rows as Row<T>[], error: null };
  }

  then<R1 = Result<Row<T>[] | Row<T> | null>, R2 = never>(
    onfulfilled?: ((value: Result<Row<T>[] | Row<T> | null>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return Promise.resolve(this.run()).then(onfulfilled, onrejected);
  }
}

function withInsertDefaults<T extends TableName>(table: T, row: Record<string, unknown>): Row<T> {
  const next = { ...row };
  if (next.id == null) next.id = uid();
  if (next.created_at == null) next.created_at = new Date().toISOString();
  if (next.updated_at == null) next.updated_at = new Date().toISOString();
  return next as Row<T>;
}

class InsertQuery<T extends TableName> implements PromiseLike<Result<Row<T>[] | Row<T> | null>> {
  private returnRows = false;
  private single_ = false;
  constructor(private table: T, private rows: Record<string, unknown>[]) {}

  select() {
    this.returnRows = true;
    return this;
  }
  single() {
    this.returnRows = true;
    this.single_ = true;
    return this;
  }

  private run(): Result<Row<T>[] | Row<T> | null> {
    const prepared = this.rows.map((r) => withInsertDefaults(this.table, r));
    const inserted = insertRows(this.table, prepared);
    if (this.single_) return { data: inserted[0] ?? null, error: null };
    if (this.returnRows) return { data: inserted, error: null };
    return { data: null, error: null };
  }

  then<R1 = Result<Row<T>[] | Row<T> | null>, R2 = never>(
    onfulfilled?: ((value: Result<Row<T>[] | Row<T> | null>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return Promise.resolve(this.run()).then(onfulfilled, onrejected);
  }
}

class MutationQuery<T extends TableName> implements PromiseLike<Result<Row<T>[]>> {
  private filters: Filter[] = [];
  constructor(
    private table: T,
    private kind: "update" | "delete",
    private patch: Record<string, unknown> | null,
  ) {}

  eq(col: string, val: unknown) {
    this.filters.push({ op: "eq", col, val });
    return this;
  }
  in(col: string, vals: unknown[]) {
    this.filters.push({ op: "in", col, vals });
    return this;
  }

  private matches = (row: Record<string, unknown>) =>
    this.filters.every((f) => (f.op === "eq" ? row[f.col] === f.val : f.vals.includes(row[f.col])));

  private run(): Result<Row<T>[]> {
    if (this.kind === "delete") {
      deleteWhere(this.table, this.matches as (r: Row<T>) => boolean);
      return { data: [], error: null };
    }
    const patch = { ...(this.patch ?? {}) };
    const updated = updateWhere(this.table, this.matches as (r: Row<T>) => boolean, patch as Partial<Row<T>>);
    return { data: updated, error: null };
  }

  then<R1 = Result<Row<T>[]>, R2 = never>(
    onfulfilled?: ((value: Result<Row<T>[]>) => R1 | PromiseLike<R1>) | null,
    onrejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
  ): PromiseLike<R1 | R2> {
    return Promise.resolve(this.run()).then(onfulfilled, onrejected);
  }
}

function from<T extends TableName>(table: T) {
  return {
    select: (selectStr = "*") => new SelectQuery(table, selectStr),
    insert: (rows: Record<string, unknown> | Record<string, unknown>[]) =>
      new InsertQuery(table, Array.isArray(rows) ? rows : [rows]),
    update: (patch: Record<string, unknown>) => new MutationQuery(table, "update", patch),
    delete: () => new MutationQuery(table, "delete", null),
  };
}

// ---- Auth + storage ----------------------------------------------------------

const auth = {
  async getSession() {
    return { data: { session: MOCK_SESSION }, error: null };
  },
  async getUser() {
    return { data: { user: MOCK_USER }, error: null };
  },
  onAuthStateChange(callback: (event: string, session: typeof MOCK_SESSION) => void) {
    Promise.resolve().then(() => callback("SIGNED_IN", MOCK_SESSION));
    return { data: { subscription: { unsubscribe() {} } } };
  },
  async signOut() {
    return { error: null };
  },
  async signInWithPassword() {
    return { data: { session: MOCK_SESSION, user: MOCK_USER }, error: null };
  },
  async signUp() {
    return { data: { session: MOCK_SESSION, user: MOCK_USER }, error: null };
  },
};

const storage = {
  from() {
    return {
      async upload(path: string) {
        return { data: { path }, error: null };
      },
      async remove() {
        return { data: [], error: null };
      },
      async createSignedUrl(path: string) {
        return { data: { signedUrl: `#mock/${path}` }, error: null };
      },
    };
  },
};

let client: ReturnType<typeof buildClient> | null = null;

function buildClient() {
  return { from, auth, storage };
}

/** Returns a singleton localStorage-backed mock Supabase client. */
export function getMockSupabaseClient() {
  client ??= buildClient();
  return client;
}