import { cn } from "@/lib/utils";

/**
 * ChangeLens lens mark. A semi-circular structured lens built from layered
 * frames with seven implied segments — abstract enough to read as
 * "structure / perspective / measured insight" without literal eye/camera
 * references. The seven segments are deliberately understated.
 */
export function LensMark({
  className,
  size = 28,
  tone = "primary",
}: {
  className?: string;
  size?: number;
  tone?: "primary" | "ink" | "inverse";
}) {
  const stroke =
    tone === "inverse"
      ? "var(--card)"
      : tone === "ink"
        ? "var(--ink)"
        : "var(--primary)";
  const subtle =
    tone === "inverse"
      ? "color-mix(in oklab, var(--card) 55%, transparent)"
      : "color-mix(in oklab, var(--primary) 35%, transparent)";

  return (
    <svg
      className={cn("shrink-0", className)}
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      {/* Outer frame */}
      <rect
        x="1.25"
        y="1.25"
        width="29.5"
        height="29.5"
        rx="1.25"
        stroke={stroke}
        strokeWidth="1.25"
      />
      {/* Inner lens — semi-circular aperture, layered */}
      <path
        d="M5 22 A11 11 0 0 1 27 22"
        stroke={stroke}
        strokeWidth="1.25"
        strokeLinecap="square"
      />
      <path
        d="M8.5 22 A7.5 7.5 0 0 1 23.5 22"
        stroke={subtle}
        strokeWidth="1"
      />
      {/* Seven implied structural divisions — short radial ticks, restrained */}
      {Array.from({ length: 7 }).map((_, i) => {
        const angle = Math.PI - (Math.PI * i) / 6; // 180° → 0°
        const cx = 16;
        const cy = 22;
        const r1 = 11.6;
        const r2 = 12.4;
        const x1 = cx + Math.cos(angle) * r1;
        const y1 = cy - Math.sin(angle) * r1;
        const x2 = cx + Math.cos(angle) * r2;
        const y2 = cy - Math.sin(angle) * r2;
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={stroke}
            strokeWidth="1"
            strokeLinecap="square"
          />
        );
      })}
      {/* Baseline rule grounding the lens */}
      <line
        x1="5"
        y1="22"
        x2="27"
        y2="22"
        stroke={stroke}
        strokeWidth="1.25"
      />
    </svg>
  );
}

/**
 * ChangeLens primary lockup — lens mark + wordmark. Typography carries most
 * of the sophistication. CORE7 is referenced as the framework underneath.
 */
export function Wordmark({
  className,
  tone = "ink",
  size = "md",
  withFramework = false,
}: {
  className?: string;
  tone?: "ink" | "inverse";
  size?: "sm" | "md" | "lg";
  withFramework?: boolean;
}) {
  const color = tone === "inverse" ? "var(--card)" : "var(--ink)";
  const sizes = {
    sm: { mark: 22, text: "text-[15px]", gap: "gap-2", sub: "text-[9px]" },
    md: { mark: 28, text: "text-[18px]", gap: "gap-2.5", sub: "text-[10px]" },
    lg: { mark: 36, text: "text-[22px]", gap: "gap-3", sub: "text-[11px]" },
  }[size];

  return (
    <div className={cn("inline-flex items-center", sizes.gap, className)}>
      <LensMark size={sizes.mark} tone={tone === "inverse" ? "inverse" : "primary"} />
      <div className="leading-none">
        <div
          className={cn(sizes.text, "font-semibold tracking-[-0.012em]")}
          style={{ color }}
        >
          Change<span className="font-medium" style={{ color: "var(--primary)" }}>Lens</span>
        </div>
        {withFramework && (
          <div
            className={cn(
              sizes.sub,
              "font-mono uppercase tracking-[0.18em] mt-1.5",
            )}
            style={{ color: "var(--muted-foreground)" }}
          >
            CORE7 framework
          </div>
        )}
      </div>
    </div>
  );
}