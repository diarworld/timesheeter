import { useRouter } from 'next/router';
import { useMemo } from 'react';

const TIMEZONE_STORAGE_KEY = 'time_offset';

export const getBrowserTimezoneOffset = (): number => {
  return -new Date().getTimezoneOffset();
};

const getStoredTimezone = (): number | undefined => {
  if (typeof window === 'undefined') return undefined;
  const stored = localStorage.getItem(TIMEZONE_STORAGE_KEY);
  if (!stored) return undefined;
  const parsed = parseInt(stored, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
};

export const saveTimezonePreference = (offset: number | undefined): void => {
  if (typeof window === 'undefined') return;
  if (offset === undefined) {
    localStorage.removeItem(TIMEZONE_STORAGE_KEY);
  } else {
    localStorage.setItem(TIMEZONE_STORAGE_KEY, offset.toString());
  }
};

export const getStoredTimezonePreference = (): number | undefined => {
  return getStoredTimezone();
};

export const useTimeOffsetFilter = () => {
  const router = useRouter();

  const timeOffsetQuery = router.query.time_offset as string | undefined;

  const timeOffset = useMemo(() => {
    if (timeOffsetQuery !== undefined) {
      const parsedInt = parseInt(timeOffsetQuery, 10);
      return Number.isNaN(parsedInt) ? getBrowserTimezoneOffset() : parsedInt;
    }
    return getStoredTimezone() ?? getBrowserTimezoneOffset();
  }, [timeOffsetQuery]);

  return timeOffset;
};
