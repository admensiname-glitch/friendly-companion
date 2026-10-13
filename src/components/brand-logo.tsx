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
      className={`${className} shrink-0`}
    >
      <path d="M3.5 12.5 15 7.5c5.6-2.4 12.4-2.4 18 0l11.5 5-20.5 9-20.5-9Z" fill={foreground} opacity=".12" />
      <path d="M4 13.5 22.5 5.7c1-.4 2-.4 3 0L44 13.5 25.5 21c-1 .4-2 .4-3 0L4 13.5Z" fill={foreground} />
      <path d="M7 17.5v10.2c0 1.2.7 2.3 1.8 2.8l12.3 5.2c1.8.8 3.9.8 5.7 0l12.4-5.2c1.1-.5 1.8-1.6 1.8-2.8V17.5L25.5 24c-1 .4-2 .4-3 0L7 17.5Z" fill={foreground} />
      <path d="M13 19.8v7.1l9.5 4c1.1.5 2.4.5 3.5 0l9.5-4v-7.1l-10 4.3c-.8.3-1.7.3-2.5 0L13 19.8Z" fill={secondary} />
      <path d="m38.5 4 .9 2.8 2.8.9-2.8.9-.9 2.8-.9-2.8-2.8-.9 2.8-.9.9-2.8Z" fill={secondary} />
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
