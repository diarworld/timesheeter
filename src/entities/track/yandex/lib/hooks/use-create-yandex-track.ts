import { useCallback } from 'react';
import { yandexTrackApi } from 'entities/track/yandex/model/yandex-api';
import { useAppDispatch } from 'shared/lib/hooks';
import { track } from 'entities/track/common/model/reducers';
import { humanReadableDurationToISO } from 'entities/track/common/lib/human-readable-duration-to-iso';
import { TTrackFormCreateFields } from 'entities/track/common/ui/TrackFormCreate/types';
import { TTrackerConfig } from 'entities/tracker/model/types';
import { DateWrapper } from 'features/date/lib/DateWrapper';
import { useFilters } from 'features/filters/lib/useFilters';

export function useCreateYandexTrack(tracker: TTrackerConfig) {
  const [createTrackMutation, { isLoading: isTrackCreateLoading }] = yandexTrackApi.useCreateYandexTrackMutation();
  const dispatch = useAppDispatch();
  const { utcOffsetInMinutes } = useFilters();

  const createTrack = useCallback(
    async (params: TTrackFormCreateFields) => {
      const duration = humanReadableDurationToISO(params.duration);
      if (!duration) {
        return;
      }

      const startInTimezone =
        utcOffsetInMinutes !== undefined
          ? DateWrapper.getDateFormat(
              DateWrapper.getDate({ date: params.start, utcOffsetInMinutes }),
              undefined,
              utcOffsetInMinutes,
            )
          : params.start;

      await createTrackMutation({
        ...params,
        duration,
        start: startInTimezone,
        tracker,
      });
      dispatch(track.actions.setInputCreate());
    },
    [tracker, createTrackMutation, dispatch, utcOffsetInMinutes],
  );

  return { isTrackCreateLoading, createTrack };
}
