import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Checks if an instrument's calibration due date has passed.
 * Supports DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD, ISO date strings, or Date objects.
 * Returns true only if the date is valid and strictly before the current day (start of today).
 */
export function isInstrumentOverdue(dateStr) {
  if (!dateStr) return false;

  let targetDate = null;

  if (dateStr instanceof Date) {
    targetDate = dateStr;
  } else if (typeof dateStr === "string") {
    const trimmed = dateStr.trim();
    if (!trimmed || trimmed === "-") return false;

    // Check DD-MM-YYYY or DD/MM/YYYY
    const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1;
      const year = parseInt(dmyMatch[3], 10);
      targetDate = new Date(year, month, day);
    } else {
      // Check YYYY-MM-DD or YYYY/MM/DD
      const ymdMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
      if (ymdMatch) {
        const year = parseInt(ymdMatch[1], 10);
        const month = parseInt(ymdMatch[2], 10) - 1;
        const day = parseInt(ymdMatch[3], 10);
        targetDate = new Date(year, month, day);
      } else {
        const parsed = new Date(trimmed);
        if (!isNaN(parsed.getTime())) {
          targetDate = parsed;
        }
      }
    }
  }

  if (!targetDate || isNaN(targetDate.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(targetDate);
  due.setHours(0, 0, 0, 0);

  return due < today;
}

