export function retryDelayMs(retryAfterSeconds: number): number {
  const seconds = Number.isFinite(retryAfterSeconds)
    ? Math.max(1, Math.min(120, Math.ceil(retryAfterSeconds)))
    : 30;
  return (seconds + 1) * 1000;
}
