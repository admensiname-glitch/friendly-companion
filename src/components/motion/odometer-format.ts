export type OdometerPiece =
  | { kind: "digit"; digit: number }
  | { kind: "text"; text: string };

export interface OdometerFormatOptions {
  prefix?: string;
  suffix?: string;
  /** Quando true, valores positivos recebem "+" na frente (ex.: tendência). */
  showPlus?: boolean;
}

/**
 * Texto final do número. Usa String(value) de propósito: é exatamente o formato
 * que o app já mostra hoje (ponto decimal, sem separador de milhar, sem zeros extras).
 */
export function formatOdometerText(value: number, options: OdometerFormatOptions = {}): string {
  const { prefix = "", suffix = "", showPlus = false } = options;
  const sign = showPlus && value > 0 ? "+" : "";
  return `${prefix}${sign}${String(value)}${suffix}`;
}

/** Quebra o texto em dígitos (que giram) e caracteres fixos (".", "-", "+", "%", " min"...). */
export function formatOdometerPieces(value: number, options: OdometerFormatOptions = {}): OdometerPiece[] {
  return Array.from(formatOdometerText(value, options)).map((char) =>
    char >= "0" && char <= "9"
      ? { kind: "digit", digit: Number(char) }
      : { kind: "text", text: char },
  );
}
