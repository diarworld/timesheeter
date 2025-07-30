// Shared hook for getting expected hours for a given day (Yandex-specific)
import calendar from 'entities/track/yandex/ui/YandexTimesheet/calendar.json';

/**
 * Returns the expected number of hours for a given day string (YYYY-MM-DD).
 * Yandex-specific: uses calendar.json from YandexTimesheet.
 * @param day - date string in YYYY-MM-DD format
 */
export function getExpectedHoursForDay(day: string): number {
  // Normalize to YYYY-MM-DD if needed
  let dayStr = day;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    // Try to parse as ISO string
    try {
      const d = new Date(day);
      if (!Number.isNaN(d.getTime())) {
        // Get YYYY-MM-DD in local time
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const date = String(d.getDate()).padStart(2, '0');
        dayStr = `${year}-${month}-${date}`;
      }
    } catch {
      // Ignore parse error
    }
  }
  if (calendar.holidays.includes(dayStr) || calendar.nowork.includes(dayStr)) return 0;
  if (calendar.preholidays.includes(dayStr)) return 7;
  return 8;
}
