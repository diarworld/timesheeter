import { TBusinessDurationData, TISODuration } from 'entities/track/common/model/types';
import { parse as parseIsoDuration } from 'iso8601-duration';

// Sums an array of ISO 8601 durations and returns a normalized business duration object
export function sumIsoDurations(durations: (TISODuration | undefined)[]): TBusinessDurationData {
  const total = durations
    .filter(Boolean)
    .map(d => parseIsoDuration(d!))
    .reduce(
      (acc, cur) => ({
        years: (acc.years ?? 0) + (cur.years || 0),
        months: (acc.months ?? 0) + (cur.months || 0),
        days: (acc.days ?? 0) + (cur.days || 0),
        hours: (acc.hours ?? 0) + (cur.hours || 0),
        minutes: (acc.minutes ?? 0) + (cur.minutes || 0),
        seconds: (acc.seconds ?? 0) + (cur.seconds || 0),
      }),
      { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 }
    );

  // Normalize seconds to minutes
  if ((total.seconds ?? 0) >= 60) {
    total.minutes = (total.minutes ?? 0) + Math.floor((total.seconds ?? 0) / 60);
    total.seconds = (total.seconds ?? 0) % 60;
  }
  // Normalize minutes to hours
  if ((total.minutes ?? 0) >= 60) {
    total.hours = (total.hours ?? 0) + Math.floor((total.minutes ?? 0) / 60);
    total.minutes = (total.minutes ?? 0) % 60;
  }


  return total as TBusinessDurationData;
}