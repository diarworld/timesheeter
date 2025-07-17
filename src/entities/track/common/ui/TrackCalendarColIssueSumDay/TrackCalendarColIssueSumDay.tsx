import { memo, useMemo } from 'react';
import { TrackCalendarSum } from 'entities/track/common/ui/TrackCalendarSum';
import { useAddNewTrackAction } from 'entities/track/common/lib/hooks/use-add-new-track-action';
import { dashIsEmpty } from 'entities/track/common/lib/helpers';
import { TTrack } from 'entities/track/common/model/types';
import { DateWrapper } from 'features/date/lib/DateWrapper';
import { STANDARD_WORK_DAY_START_LOCAL_HOUR } from 'features/date/lib/constants';
import { comparePropsWithTracks } from 'entities/track/common/lib/compare-props-with-tracks';
import { useFilterValues } from 'features/filters/lib/useFilterValues';
import { clsx } from 'clsx';
import styles from './TrackCalendarColIssueSumDay.module.scss';

type TProps = {
  tracks: TTrack[] | undefined;
  date: string;
  issueKey: string;
  isEdit?: boolean;
  isDarkMode: boolean;
};

// !NOTICE that this memo component has custom compareProps function implementation
export const TrackCalendarColIssueSumDay = memo(({ tracks = [], date, issueKey, isEdit, isDarkMode }: TProps) => {
  const addNewTrack = useAddNewTrackAction(issueKey);
  const { utcOffsetInMinutes } = useFilterValues();

  const dateObj = useMemo(() => DateWrapper.getDate({ date, utcOffsetInMinutes }), [date, utcOffsetInMinutes]);

  const isWeekend = useMemo(() => DateWrapper.isWeekend(dateObj), [dateObj]);
  const isHoliday = useMemo(() => DateWrapper.isHoliday(dateObj), [dateObj]);

  const handleClick = () => {
    const dateWithStartHour = dateObj.set('hour', STANDARD_WORK_DAY_START_LOCAL_HOUR);
    addNewTrack(dateWithStartHour);
  };

  const issueSum = dashIsEmpty(tracks, <TrackCalendarSum tracksOrTrack={tracks} />);

  return (
    <td className={clsx(styles.col, { [styles.col_dark]: isDarkMode },
       { [styles.col_light]: !isDarkMode },
       { [styles.col_weekend_light]: (isWeekend || isHoliday) && !isDarkMode },
       { [styles.col_weekend_dark]: (isWeekend || isHoliday) && isDarkMode })}>
      {isEdit ? (
        <button type="button" className={styles.button} onClick={handleClick}>
          {issueSum}
        </button>
      ) : (
        issueSum
      )}
    </td>
  );
}, comparePropsWithTracks);

TrackCalendarColIssueSumDay.displayName = 'TrackCalendarColIssueSumDay';
