import { memo } from 'react';
import { TTrack } from 'entities/track/common/model/types';
import { getExpectedHoursForDay } from 'entities/track/common/lib/hooks/use-expected-hours-for-day';
import { msToBusinessDurationData } from 'entities/track/common/lib/ms-to-business-duration-data';
import { DurationFormat } from 'features/date/ui/DurationFormat';
import { Progress } from 'antd';
import { Text } from 'components';
import { useMessage } from 'entities/locale/lib/hooks';
import styles from './TrackCalendarFootColSum.module.scss';


interface ITrackCalendarFootColSumProps {
  tracks: TTrack[];
  range: string[];
}


export const TrackCalendarFootColSum = memo(({ tracks = [], range }: ITrackCalendarFootColSumProps) => {
  const message = useMessage();
  // Calculate total tracked ms
  const trackedMs = tracks.reduce((sum, t) => {
    if (t.duration) {
      try {
        const { isoDurationToBusinessMs } = require('entities/track/common/lib/iso-duration-to-business-ms');
        return sum + isoDurationToBusinessMs(t.duration);
      } catch {
        return sum;
      }
    }
    return sum;
  }, 0);

  // Calculate expected hours for the period
  const expectedHours = range.reduce((sum, date) => sum + getExpectedHoursForDay(date), 0);
  const expectedMs = expectedHours * 60 * 60 * 1000;

  const percent = expectedMs > 0 ? Math.min(100, Math.round((trackedMs / expectedMs) * 100)) : 0;

  const isExactTracked = trackedMs === expectedMs;
  const isUndertracked = Boolean(tracks.length) && trackedMs < expectedMs;
  const isOvertracked = Boolean(tracks.length) && trackedMs > expectedMs;

  return (
    <th className={styles.col}
      data-is-exact-tracked={isExactTracked}
      data-is-undertracked={isUndertracked}
      data-is-over-tracked={isOvertracked}
    >
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, minWidth: 120 }}>
        <Text fs={13} fw={800} aria-label="total sum" >
          <DurationFormat duration={msToBusinessDurationData(trackedMs)} />
        </Text>
        <span style={{ color: '#888', fontSize: 10 }}>
          {expectedHours > 0 ? (
            <DurationFormat duration={msToBusinessDurationData(expectedMs)} />
          ) : (
            message('date.hours.short', { value: expectedHours })
          )}
        </span>
        {percent > 0 && (
          <Progress
            percent={percent}
            size="small"
            showInfo={true}
            strokeColor={percent < 50 ? 'red' : undefined}
          />
        )}
      </div>
    </th>
  );
});

TrackCalendarFootColSum.displayName = 'TrackCalendarFootColSum';
