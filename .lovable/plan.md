Sync these 4 files from `https://github.com/ChazJ92/change-lens` (branch `main`) into the sandbox, overwriting current contents:

- `src/routes/__root.tsx`
- `src/routes/_authenticated.app.index.tsx`
- `src/components/app-shell.tsx`
- `src/styles.css`

Steps:
1. `curl` each raw GitHub URL (all confirmed reachable, HTTP 200) and write to the corresponding sandbox path.
2. Verify each file wrote successfully (non-empty, expected path).
3. Let Vite/TanStack pick up the changes; no other files touched.

Out of scope: any other repo files, the existing `@supabase/supabase-js` runtime error, or dependency installs. If the synced files reference new imports that fail to build, I'll surface that and ask before making further changes.