import { useRouter } from 'next/router';
import { useCallback } from 'react';
import { useFilterValues } from 'features/filters/lib/useFilterValues';
import { TSortOrder } from 'shared/lib/types';
import { saveTimezonePreference } from 'features/filters/lib/useTimeOffsetFilter';
import { DateWrapper } from 'features/date/lib/DateWrapper';

export const useFilters = () => {
  const router = useRouter();

  const filterValues = useFilterValues();

  const simpleUpdateFilter = useCallback(
    (name: string, nextValue: string | string[]) => {
      router.replace({
        query: {
          ...router.query,
          [name]: nextValue,
        },
      });
    },
    [router],
  );

  const updateRangeFilter = useCallback(
    ({ from: nextFrom, to: nextTo }: { from?: string; to?: string }) => {
      if (!nextFrom && !nextTo) {
        return;
      }

      router.replace({
        query: {
          ...router.query,
          from: nextFrom,
          to: nextTo,
        },
      });
    },
    [router],
  );

  const updateWeekendVisibility = useCallback(
    (nextShowWeekends: string) => {
      simpleUpdateFilter('weekends', nextShowWeekends);
    },
    [simpleUpdateFilter],
  );

  const updateUserId = useCallback(
    (nextUserId: string | undefined) => {
      const nextQuery = {
        ...router.query,
        user_id: nextUserId,
      };

      if (!nextUserId) {
        delete nextQuery.user_id;
      }
      router.replace({
        query: nextQuery,
      });
    },
    [router],
  );

  const updateIssueStatus = useCallback(
    (status: string[]) => {
      simpleUpdateFilter('status', status);
    },
    [simpleUpdateFilter],
  );

  const updateSummary = useCallback(
    (nextSummary: string) => {
      simpleUpdateFilter('summary', nextSummary);
    },
    [simpleUpdateFilter],
  );

  const updateQueue = useCallback(
    (nextQueue: string[]) => {
      simpleUpdateFilter('queue', nextQueue);
    },
    [simpleUpdateFilter],
  );

  const updateSorting = useCallback(
    (sortBy: string, order: TSortOrder) => {
      router.replace({
        query: {
          ...router.query,
          sort_by: sortBy,
          sort_order: order,
        },
      });
    },
    [router],
  );

  const updateTimeOffset = useCallback(
    (timeOffsetInMinutes: number) => {
      saveTimezonePreference(timeOffsetInMinutes);

      const currentFrom = router.query.from as string | undefined;
      const currentTo = router.query.to as string | undefined;

      let newFrom: string;
      let newTo: string;

      if (currentFrom && currentTo) {
        newFrom = DateWrapper.getDate({ date: currentFrom, utcOffsetInMinutes: timeOffsetInMinutes }).format();
        newTo = DateWrapper.getDate({ date: currentTo, utcOffsetInMinutes: timeOffsetInMinutes }).format();
      } else {
        newFrom = DateWrapper.getDate({ utcOffsetInMinutes: timeOffsetInMinutes }).startOf('week').format();
        newTo = DateWrapper.getDate({ utcOffsetInMinutes: timeOffsetInMinutes }).endOf('week').format();
      }

      router.replace({
        query: {
          ...router.query,
          time_offset: timeOffsetInMinutes,
          from: newFrom,
          to: newTo,
        },
      });
    },
    [router],
  );

  return {
    ...filterValues,
    updateRangeFilter,
    updateWeekendVisibility,
    updateUserId,
    updateIssueStatus,
    updateSummary,
    updateQueue,
    updateSorting,
    updateTimeOffset,
  };
};
