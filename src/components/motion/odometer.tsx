import { useEffect, useState, type CSSProperties } from "react";
import { formatOdometerPieces, formatOdometerText } from "./odometer-format";

const DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const;

interface OdometerProps {
  /** Número a mostrar. null/undefined/NaN mostram o placeholder. */
  value: number | null | undefined;
  prefix?: string;
  suffix?: string;
  showPlus?: boolean;
  /** O que a tela já mostra hoje quando não há valor. Padrão: "—". */
  placeholder?: string;
  className?: string;
}

/** Uma coluna de 0–9. Monta em 0 e rola até o dígito; muda de dígito => rola de novo. */
function DigitCell({ digit }: { digit: number }) {
  const [shown, setShown] = useState(0);

  useEffect(() => {
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setShown(digit));
    });
    return () => {
      cancelAnimationFrame(first);
      cancelAnimationFrame(second);
    };
  }, [digit]);

  return (
    <span className="odo-cell" style={{ "--odo-n": shown, "--odo-final": digit } as CSSProperties}>
      <span className="odo-strip">
        {DIGITS.map((d) => (
          <span key={d} className="odo-glyph">
            {d}
          </span>
        ))}
      </span>
    </span>
  );
}

export function Odometer({ value, prefix, suffix, showPlus, placeholder = "—", className }: OdometerProps) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  if (value == null || !Number.isFinite(value)) {
    return <span className={className}>{placeholder}</span>;
  }

  const options = { prefix, suffix, showPlus };
  const text = formatOdometerText(value, options);
  const pieces = formatOdometerPieces(value, options);

  return (
    <span className={className ? `odo ${className}` : "odo"} data-ready={ready ? "true" : "false"}>
      <span className="sr-only">{text}</span>
      <span className="odo-ghost" aria-hidden="true">
        {text}
      </span>
      <span className="odo-reels" aria-hidden="true">
        {pieces.map((piece, index) =>
          piece.kind === "digit" ? (
            <DigitCell key={index} digit={piece.digit} />
          ) : (
            <span key={index} className="odo-static">
              {piece.text}
            </span>
          ),
        )}
      </span>
    </span>
  );
}
