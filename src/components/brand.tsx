import { cn } from "@/lib/utils";

/**
 * ChangeLens lens mark. A thick segmented ring — seven arc segments separated
 * by thin radial cuts. Reads as "structure / perspective / measured insight"
 * without literal eye/camera references.
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
  const color =
    tone === "inverse"
      ? "var(--card)"
      : tone === "ink"
        ? "var(--ink)"
        : "var(--ink)";

  // Segmented ring: 7 arc segments around the centre, with thin gaps.
  const cx = 32;
  const cy = 32;
  const r = 22;
  const inner = 14;
  const segments = 7;
  const gap = 6; // degrees of gap between segments
  const span = 360 / segments;

  const polar = (radius: number, deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
  };

  const arc = (i: number) => {
    const start = i * span + gap / 2;
    const end = (i + 1) * span - gap / 2;
    const [x1, y1] = polar(r, start);
    const [x2, y2] = polar(r, end);
    const [x3, y3] = polar(inner, end);
    const [x4, y4] = polar(inner, start);
    const large = end - start > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${inner} ${inner} 0 ${large} 0 ${x4} ${y4} Z`;
  };

  return (
    <svg
      className={cn("shrink-0", className)}
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden="true"
    >
      {Array.from({ length: segments }).map((_, i) => (
        <path key={i} d={arc(i)} fill={color} />
      ))}
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
  const subColor = tone === "inverse" ? "color-mix(in oklab, var(--card) 60%, transparent)" : "var(--muted-foreground)";
  const accent = tone === "inverse" ? "var(--card)" : "var(--primary)";
  const sizes = {
    sm: { mark: 26, text: "text-[16px]", gap: "gap-2.5", sub: "text-[8.5px]" },
    md: { mark: 34, text: "text-[20px]", gap: "gap-3", sub: "text-[9.5px]" },
    lg: { mark: 44, text: "text-[26px]", gap: "gap-3.5", sub: "text-[11px]" },
  }[size];

  return (
    <div className={cn("inline-flex items-start", sizes.gap, className)}>
      <LensMark
        size={sizes.mark}
        tone={tone === "inverse" ? "inverse" : "primary"}
        className="shrink-0 translate-y-[1px]"
      />
      <div className="leading-none flex flex-col justify-center" style={{ minHeight: sizes.mark }}>
        <div
          className={cn(sizes.text, "font-medium tracking-[-0.018em]")}
          style={{ color }}
        >
          ChangeLens
        </div>
        {withFramework && (
          <div
            className={cn(
              sizes.sub,
              "font-mono uppercase tracking-[0.22em] mt-2 font-medium",
            )}
            style={{ color: subColor }}
          >
            Powered by the <span style={{ color: accent }}>CORE7</span> framework
          </div>
        )}
      </div>
    </div>
  );
}