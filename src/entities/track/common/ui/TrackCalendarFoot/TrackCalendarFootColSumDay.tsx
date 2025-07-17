import { DurationFormat } from 'features/date/ui/DurationFormat';
import { memo, useMemo } from 'react';
import { useISODurationsToTotalDurationData } from 'entities/track/common/lib/hooks/use-iso-dirations-to-total-duration-data';
import { TTrack } from 'entities/track/common/model/types';
import { comparePropsWithTracks } from 'entities/track/common/lib/compare-props-with-tracks';
import { DateWrapper } from 'features/date/lib/DateWrapper';
import { clsx } from 'clsx';
import { getExpectedHoursForDay } from 'entities/track/common/lib/hooks/use-expected-hours-for-day';
import { Text } from 'components';
import { msToBusinessDurationData } from 'entities/track/common/lib/ms-to-business-duration-data';
import { Progress } from 'antd';
import { useMessage } from 'entities/locale/lib/hooks';
import styles from './TrackCalendarFootColSumDay.module.scss';

type TProps = {
  tracks: TTrack[] | undefined;
  date: string;
  utcOffsetInMinutes: number | undefined;
  isDarkMode: boolean;
};

// !NOTICE that this memo component has custom compareProps function implementation
export const TrackCalendarFootColSumDay = memo(({ tracks = [], date, utcOffsetInMinutes, isDarkMode }: TProps) => {
  const durationTotal = useISODurationsToTotalDurationData(tracks);
  const expected = getExpectedHoursForDay(date);
  const message = useMessage();

  const tracked = durationTotal.hours + durationTotal.minutes / 60 + durationTotal.seconds / 3600;
  const percent = expected > 0 ? Math.min(100, Math.round((tracked / expected) * 100)) : 0;

  const isExactTracked = expected > 0 && Math.abs(tracked - expected) < 0.01;
  const isUndertracked = Boolean(tracks.length) && expected > 0 && tracked < expected;
  const isOvertracked = Boolean(tracks.length) && expected > 0 && tracked > expected;

  const dateObj = useMemo(() => DateWrapper.getDate({ date, utcOffsetInMinutes }), [date, utcOffsetInMinutes]);
  const isWeekend = useMemo(() => DateWrapper.isWeekend(dateObj), [dateObj]);
  const isHoliday = useMemo(() => DateWrapper.isHoliday(dateObj), [dateObj]);

  return (
    <td
      className={clsx(styles.col, { [styles.col_weekend_light]: (isWeekend || isHoliday) && !isDarkMode }, { [styles.col_weekend_dark]: (isWeekend || isHoliday) && isDarkMode  })}
      data-is-undertracked={isUndertracked}
      data-is-exact-tracked={isExactTracked}
      data-is-over-tracked={isOvertracked}
      data-is-dark-mode={isDarkMode}
    >
      {/* <span aria-label="total day sum">{tracks.length ? <DurationFormat duration={durationTotal} /> : '—'}</span> */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, minWidth: 120 }}>
        <Text aria-label="total day sum" fs={13} fw={800} style={{ textTransform: 'capitalize', minWidth: 55 }}>
          <DurationFormat duration={durationTotal} />
        </Text>
        <span style={{ color: '#888', fontSize: 10 }}>
          {expected > 0 ? (
            <DurationFormat duration={msToBusinessDurationData(expected * 60 * 60 * 1000)} />
          ) : (
            message('date.hours.short', { value: expected })
          )}
        </span>
        {expected > 0 && (
          <Progress
            percent={percent}
            size="small"
            showInfo
            strokeColor={percent < 50 ? 'red' : undefined}
            // style={{ width: 100 }}
          />
        )}
      </div>
    </td>
  );
}, comparePropsWithTracks);

TrackCalendarFootColSumDay.displayName = 'TrackCalendarFootColSumDay';
