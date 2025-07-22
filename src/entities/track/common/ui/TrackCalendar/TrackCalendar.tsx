import { TrackCalendarHead } from 'entities/track/common/ui/TrackCalendarHead';
import React, { FC } from 'react';
import { ITrackCalendarFootProps } from 'entities/track/common/ui/TrackCalendarFoot/TrackCalendarFoot';
import { TIssue } from 'entities/issue/common/model/types';
import { TTrackCalendarRowProps } from 'entities/track/common/ui/TrackCalendarRow/TrackCalendarRow';
import { TTrackInputDelete } from 'entities/track/common/model/types';
import clsx from 'clsx';
import { useScrollToCurrent } from './use-scroll-to-current';
import { useRange } from './use-range';

import styles from './TrackCalendar.module.scss';

type TProps = {
  from: string;
  to: string;
  showWeekends: boolean;
  utcOffsetInMinutes: number | undefined;
  issues: TIssue[];
  pinnedIssues: string[];
  issueSortingKey: string;
  renderTrackCalendarRowConnected(
    props: Omit<TTrackCalendarRowProps, 'tracks' | 'date2IssueTracks' | 'updateTrack' | 'getIssueUrl'>,
  ): React.ReactNode;
  renderTrackCalendarFootConnected(props: Omit<ITrackCalendarFootProps, 'trackList' | 'date2Tracks'>): React.ReactNode;
  pinIssue?(issueKey: string): void;
  unpinIssue?(issueKey: string): void;
  deleteTrack(form: TTrackInputDelete): void;
  isEdit?: boolean;
  isDarkMode: boolean;
};

export const TrackCalendar: FC<TProps> = ({
  from,
  to,
  showWeekends,
  utcOffsetInMinutes,
  issues,
  isEdit = false,
  pinnedIssues,
  pinIssue,
  unpinIssue,
  renderTrackCalendarRowConnected,
  renderTrackCalendarFootConnected,
  deleteTrack,
  issueSortingKey,
  isDarkMode,
}) => {
  const range = useRange({ from, to, showWeekends, utcOffsetInMinutes });

  const tableRef = useScrollToCurrent();

  return (
    <div className={styles.wrapper}>
      <table className={clsx(styles.table, { [styles.table_dark]: isDarkMode })} ref={tableRef}>
        <TrackCalendarHead range={range} sortingKey={issueSortingKey} isDarkMode={isDarkMode} />
        <tbody>
          {issues.map((issue) => (
            <React.Fragment key={issue.id}>
              {renderTrackCalendarRowConnected({
                range,
                issue,
                isEdit,
                pinnedIssues,
                pinIssue,
                unpinIssue,
                deleteTrack,
                isDarkMode,
              })}
            </React.Fragment>
          ))}
        </tbody>
        {renderTrackCalendarFootConnected({
          range,
          totalIssues: issues.length,
          utcOffsetInMinutes,
          issues,
          isDarkMode,
        })}
      </table>
    </div>
  );
};
