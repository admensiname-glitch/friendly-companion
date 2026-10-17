type BrandLogoProps = {
  tone?: "blue" | "light";
  compact?: boolean;
  className?: string;
};

export function BrandMark({ tone = "blue", className = "h-9 w-10" }: { tone?: "blue" | "light"; className?: string }) {
  const foreground = tone === "light" ? "#FFFFFF" : "#0242D7";
  const secondary = tone === "light" ? "#FFFFFF" : "#7AA9F7";

  return (
    <>
      <style>{`
        @keyframes ensina-mark-float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-2px) rotate(-1deg); }
        }
        @keyframes ensina-mark-glow {
          0%, 100% { opacity: .2; transform: scale(.94); }
          50% { opacity: .55; transform: scale(1.08); }
        }
        .brand-mark-motion {
          transform-box: fill-box;
          transform-origin: center;
          animation: ensina-mark-float 4.8s ease-in-out infinite;
        }
        .brand-mark-halo {
          transform-box: fill-box;
          transform-origin: center;
          animation: ensina-mark-glow 4.8s ease-in-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .brand-mark-motion, .brand-mark-halo { animation: none !important; }
        }
      `}</style>
      <svg
        aria-hidden="true"
        viewBox="0 0 48 40"
        fill="none"
        className={`brand-mark ${className} shrink-0`}
      >
        <ellipse className="brand-mark-halo" cx="24" cy="19" rx="22" ry="17" fill={secondary} opacity=".2" />
        <g className="brand-mark-motion">
          <path d="M4 13.4 24 4l20 9.4-20 9.4L4 13.4Z" fill={foreground} />
          <path d="M11 17.3v9.3c0 1.8 1.2 3.4 2.9 4.1l7.1 2.8c1.9.7 4 .7 5.9 0l7.1-2.8c1.7-.7 2.9-2.3 2.9-4.1v-9.3L24 23.2 11 17.3Z" fill={foreground} />
          <path d="M42 14v14.7" stroke={foreground} strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="42" cy="31.4" r="2.3" fill={secondary} />
        </g>
      </svg>
    </>
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
