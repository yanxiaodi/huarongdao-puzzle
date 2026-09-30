export function formatElapsedTime(elapsedMs: number | null, locale: string): string | null {
  if (elapsedMs === null || !Number.isFinite(elapsedMs) || elapsedMs < 0) return null;

  const totalSeconds = Math.floor(elapsedMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const digits = new Intl.NumberFormat(locale, {
    minimumIntegerDigits: 2,
    useGrouping: false,
  });

  return hours > 0
    ? `${hours}:${digits.format(minutes)}:${digits.format(seconds)}`
    : `${minutes}:${digits.format(seconds)}`;
}
