import { TrackCalendarHead } from 'entities/track/common/ui/TrackCalendarHead';
import React, { FC, ReactNode } from 'react';
import { ITrackCalendarFootProps } from 'entities/track/common/ui/TrackCalendarFoot/TrackCalendarFoot';
import { TrackModalCreate } from 'entities/track/common/ui/TrackModalCreate';
// import { TeamModalCreate } from 'entities/track/common/ui/TeamModalCreate';
// import { LdapLoginModalCreate } from 'entities/track/common/ui/LdapLoginModalCreate';
import { TIssue } from 'entities/issue/common/model/types';
import { TTrackCalendarRowProps } from 'entities/track/common/ui/TrackCalendarRow/TrackCalendarRow';
import { TTrackerConfig } from 'entities/tracker/model/types';
import { TTrackFormCreateFields } from 'entities/track/common/ui/TrackFormCreate/types';
import { TTrackInputDelete } from 'entities/track/common/model/types';
import { IIssueTracksProps } from 'entities/track/common/ui/IssueTracks/IssueTracks';
import { AutoCompleteProps } from 'antd';
import { FieldInputProps } from 'react-final-form';
import { useScrollToCurrent } from './use-scroll-to-current';
import { useRange } from './use-range';

import styles from './TrackCalendar.module.scss';

type TProps = {
  tracker: TTrackerConfig;
  from: string;
  to: string;
  showWeekends: boolean;
  utcOffsetInMinutes: number | undefined;
  issues: TIssue[];
  pinnedIssues: string[];
  issueSortingKey: string;
  _isLoading: boolean;
  isTrackCreateLoading: boolean;
  _isTrackDeleteLoading: boolean;
  renderTrackCalendarRowConnected(
    props: Omit<TTrackCalendarRowProps, 'tracks' | 'date2IssueTracks' | 'updateTrack' | 'getIssueUrl'>,
  ): React.ReactNode;
  renderTrackCalendarFootConnected(props: Omit<ITrackCalendarFootProps, 'trackList' | 'date2Tracks'>): React.ReactNode;
  renderIssueTracksConnected(props: Pick<IIssueTracksProps, 'issueKey' | 'date' | 'className'>): ReactNode;
  renderIssuesSearchConnected(props: AutoCompleteProps<string> & FieldInputProps<string>): ReactNode;
  pinIssue?(issueKey: string): void;
  unpinIssue?(issueKey: string): void;
  createTrack(form: TTrackFormCreateFields): void;
  deleteTrack(form: TTrackInputDelete): void;
  isEdit?: boolean;
};

export const TrackCalendar: FC<TProps> = ({
  from,
  to,
  showWeekends,
  utcOffsetInMinutes,
  _isLoading,
  issues,
  isEdit = false,
  pinnedIssues,
  pinIssue,
  unpinIssue,
  renderTrackCalendarRowConnected,
  renderTrackCalendarFootConnected,
  renderIssuesSearchConnected,
  tracker,
  isTrackCreateLoading,
  createTrack,
  deleteTrack,
  renderIssueTracksConnected,
  issueSortingKey,
}) => {
  const range = useRange({ from, to, showWeekends, utcOffsetInMinutes });

  const tableRef = useScrollToCurrent();

  return (
    <>
      {/* <Loading isLoading={isLoading}> */}
      <div className={styles.wrapper}>
        <table className={styles.table} ref={tableRef}>
          <TrackCalendarHead range={range} sortingKey={issueSortingKey} />
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
                })}
              </React.Fragment>
            ))}
          </tbody>
          {renderTrackCalendarFootConnected({ range, totalIssues: issues.length, utcOffsetInMinutes })}
        </table>
        {isEdit && (
          <TrackModalCreate
            tracker={tracker}
            isTrackCreateLoading={isTrackCreateLoading}
            createTrack={createTrack}
            renderIssueTracksConnected={renderIssueTracksConnected}
            renderIssuesSearchConnected={renderIssuesSearchConnected}
          />
        )}
      </div>
      {/* </Loading> */}
      {/* <TeamModalCreate tracker={tracker} isTrackCreateLoading={isTrackCreateLoading} />
      <LdapLoginModalCreate tracker={tracker} isTrackCreateLoading={isTrackCreateLoading} /> */}
    </>
  );
};
