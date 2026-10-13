type BrandLogoProps = {
  tone?: "blue" | "light";
  compact?: boolean;
  className?: string;
};

export function BrandMark({ tone = "blue", className = "h-9 w-10" }: { tone?: "blue" | "light"; className?: string }) {
  const foreground = tone === "light" ? "#FFFFFF" : "#0242D7";
  const secondary = tone === "light" ? "#DCE9FF" : "#7AA9F7";

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 48 40"
      fill="none"
      className={`brand-mark ${className} shrink-0`}
    >
      <path d="M4 13.4 24 4l20 9.4-20 9.4L4 13.4Z" fill={foreground} />
      <path d="M11 17.3v9.3c0 1.8 1.2 3.4 2.9 4.1l7.1 2.8c1.9.7 4 .7 5.9 0l7.1-2.8c1.7-.7 2.9-2.3 2.9-4.1v-9.3L24 23.2 11 17.3Z" fill={foreground} />
      <path d="M42 14v14.7" stroke={foreground} strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="42" cy="31.4" r="2.3" fill={secondary} />
    </svg>
  );
}

export function BrandLogo({
  tone = "blue",
  compact = false,
  className = "",
}: BrandLogoProps) {
  const textColor = tone === "light" ? "text-white" : "text-[#0242D7]";

  return (
    <span
      className={[
        "inline-flex items-center font-bold tracking-[-0.045em]",
        compact ? "gap-2" : "gap-2.5",
        textColor,
        className,
      ].join(" ")}
      style={{ fontFamily: '"Nunito", ui-sans-serif, system-ui, sans-serif' }}
    >
      <BrandMark tone={tone} className={compact ? "h-8 w-9" : "h-10 w-12"} />
      <span className={compact ? "text-[19px] leading-none" : "text-[25px] leading-none"}>
        ensina-me
      </span>
    </span>
  );
}
