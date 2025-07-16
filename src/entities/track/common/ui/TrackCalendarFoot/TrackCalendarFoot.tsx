import { memo } from 'react';
import { Message } from 'entities/locale/ui/Message';
import { TTrack } from 'entities/track/common/model/types';
import { TIssue } from 'entities/issue/common/model/types';
import { TYandexIssue } from 'entities/issue/yandex/model/types';
import { msToBusinessDurationData } from 'entities/track/common/lib/ms-to-business-duration-data';
import { DurationFormat } from 'features/date/ui/DurationFormat';
import { Progress, Popover } from 'antd';
import { Text } from 'components';
import { useMessage } from 'entities/locale/lib/hooks';
import styles from './TrackCalendarFoot.module.scss';
import { TrackCalendarFootColSumDay } from './TrackCalendarFootColSumDay';
import { TrackCalendarFootColSum } from './TrackCalendarFootColSum';

export interface ITrackCalendarFootProps {
  range: string[];
  totalIssues: number;
  utcOffsetInMinutes: number | undefined;
  date2Tracks: Record<string, TTrack[]>;
  trackList: TTrack[];
  issues?: (TIssue | TYandexIssue)[];
}

export const TrackCalendarFoot = memo(
  ({ range, totalIssues, utcOffsetInMinutes, date2Tracks, trackList, issues = [] }: ITrackCalendarFootProps) => {
    const message = useMessage();
    // Helper to sum durations for a set of tracks
    const sumTrackMs = (tracks: TTrack[]) =>
      tracks.reduce((sum, t) => {
        // Assume t.duration is ISO string, convert to ms
        // If you have a helper, use it here
        if (t.duration) {
          // Use isoDurationToBusinessMs if available, else fallback
          try {
            const { isoDurationToBusinessMs } = require('entities/track/common/lib/iso-duration-to-business-ms');
            return sum + isoDurationToBusinessMs(t.duration);
          } catch {
            return sum;
          }
        }
        return sum;
      }, 0);

    // Calculate totals for each group
    let productsMs = 0;
    for (const issue of issues) {
      // Find all tracks for this issue
      const tracks = trackList.filter((t) => t.issueKey === issue.id || t.issueKey === issue.key);
      if ('products' in issue && Array.isArray(issue.products) && issue.products.length > 0) {
        productsMs += sumTrackMs(tracks);
      }
    }

    // Calculate total logged ms for all issues
    const totalLoggedMs = sumTrackMs(trackList);

    const percentProducts = totalLoggedMs > 0 ? Math.min(100, Math.round((productsMs / totalLoggedMs) * 100)) : 0;

    return (
      <tfoot className={styles.tfoot}>
        <tr>
          <th colSpan={2} className={styles.totalCol}>
            {!!totalIssues && (
              <span className={styles.total} aria-label="total issues">
                {' '}
                <Message id="issue.total" />
                {': '}
                <span>{totalIssues}</span>
              </span>
            )}
          </th>

          {/* Combined summary cell for domains, product teams, and products */}
          <th />
          <th />
          <td className={styles.total}>
            {/* <div style={{ minWidth: 360 }}> */}
            <Popover content={<Message id="track.products.percent.explanation" />}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                <Text fs={13} fw={800}>
                  <DurationFormat duration={msToBusinessDurationData(productsMs)} />
                </Text>
                <span style={{ color: '#888', fontSize: 10 }}>
                  {totalLoggedMs > 0 ? (
                    <DurationFormat duration={msToBusinessDurationData(totalLoggedMs)} />
                  ) : (
                    message('date.hours.short', { value: 0 })
                  )}
                </span>
                <Progress
                  percent={percentProducts}
                  size="small"
                  showInfo
                  style={{ marginTop: 2 }}
                  strokeColor={percentProducts < 50 ? 'red' : undefined}
                />
              </div>
            </Popover>
            {/* </div> */}
          </td>

          {range.map((date) => (
            <TrackCalendarFootColSumDay
              key={date}
              date={date}
              utcOffsetInMinutes={utcOffsetInMinutes}
              tracks={date2Tracks[date]}
            />
          ))}

          <TrackCalendarFootColSum tracks={trackList} range={range} />
        </tr>
      </tfoot>
    );
  },
);

TrackCalendarFoot.displayName = 'TrackCalendarFoot';
