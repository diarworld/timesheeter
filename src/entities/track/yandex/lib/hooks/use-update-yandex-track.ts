import { yandexTrackApi } from 'entities/track/yandex/model/yandex-api';
import { TTrackInputEditForm } from 'entities/track/common/model/types';
import { useCallback } from 'react';
import { TTrackerConfig } from 'entities/tracker/model/types';
import { DateWrapper } from 'features/date/lib/DateWrapper';
import { useFilters } from 'features/filters/lib/useFilters';

export function useUpdateYandexTrack(tracker: TTrackerConfig) {
  const [startUpdateMutation, { isLoading: isTrackUpdateLoading }] = yandexTrackApi.useUpdateYandexTrackMutation();
  const { utcOffsetInMinutes } = useFilters();

  const updateTrack = useCallback(
    (input: Partial<TTrackInputEditForm>, issueIdOrKey?: string, trackId?: number | string) => {
      if (!trackId || !issueIdOrKey) return;

      const form = { ...input };
      if (input.start && utcOffsetInMinutes !== undefined) {
        form.start = DateWrapper.getDateFormat(
          DateWrapper.getDate({ date: input.start, utcOffsetInMinutes }),
          undefined,
          utcOffsetInMinutes,
        );
      }

      startUpdateMutation({
        tracker,
        form,
        param: {
          issueIdOrKey,
          trackId,
        },
      });
    },
    [tracker, startUpdateMutation, utcOffsetInMinutes],
  );

  return { updateTrack, isTrackUpdateLoading };
}
