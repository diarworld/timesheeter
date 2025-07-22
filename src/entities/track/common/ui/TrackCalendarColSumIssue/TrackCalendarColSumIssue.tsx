import { dashIsEmpty } from 'entities/track/common/lib/helpers';
import { TrackCalendarSum } from 'entities/track/common/ui/TrackCalendarSum';
import { memo } from 'react';
import { TTrack } from 'entities/track/common/model/types';
import clsx from 'clsx';
import styles from './TrackCalendarColSumIssue.module.scss';

interface ITrackCalendarColSumIssueProps {
  tracks: TTrack[] | undefined;
  isDarkMode: boolean;
}

export const TrackCalendarColSumIssue = memo(({ tracks = [], isDarkMode }: ITrackCalendarColSumIssueProps) => (
  <th className={clsx(styles.col, { [styles.col_dark]: isDarkMode }, { [styles.col_light]: !isDarkMode })}>
    <div>{dashIsEmpty(tracks, <TrackCalendarSum tracksOrTrack={tracks} />)}</div>
  </th>
));

TrackCalendarColSumIssue.displayName = 'TrackCalendarColSumIssue';
