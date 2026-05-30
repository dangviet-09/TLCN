/**
 * Shared utility functions for formatting display values.
 */

/**
 * Formats a salary range into a human-readable Vietnamese string.
 * - Accepts string / number / null / undefined to be resilient against API inconsistencies
 * - Coerces input via Number() first; NaN results are treated as "empty"
 * - null / undefined / 0 / NaN values → "Thoả thuận"
 * - Output uses Vietnamese "Triệu" abbreviation
 */
export const formatSalary = (
  min: number | string | null | undefined,
  max: number | string | null | undefined
): string => {
  const minNum = Number(min);
  const maxNum = Number(max);

  const isMinEmpty =
    min == null || Number.isNaN(minNum) || minNum === 0;
  const isMaxEmpty =
    max == null || Number.isNaN(maxNum) || maxNum === 0;

  if (isMinEmpty && isMaxEmpty) return "Thoả thuận";

  const fmt = (n: number): string => {
    const trieu = n / 1_000_000;
    return trieu % 1 === 0
      ? `${trieu} Triệu`
      : `${trieu.toFixed(1)} Triệu`;
  };

  if (!isMinEmpty && !isMaxEmpty) return `${fmt(minNum)} - ${fmt(maxNum)}`;
  if (!isMinEmpty) return `Từ ${fmt(minNum)}`;
  return `Lên đến ${fmt(maxNum)}`;
};
