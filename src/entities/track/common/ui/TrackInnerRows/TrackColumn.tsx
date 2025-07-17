import { DateWrapper } from 'features/date/lib/DateWrapper';
import { TTrack, TTrackInputEditForm } from 'entities/track/common/model/types';
import { memo } from 'react';
import { useFilterValues } from 'features/filters/lib/useFilterValues';
import { TrackDurationEdit } from './TrackDurationEdit';
import styles from './TrackColumn.module.scss';
import { Typography } from 'antd';

interface ITrackColumnProps {
  track: TTrack;
  date: string;
  issueId: string;
  isEdit?: boolean;
  updateTrack(input: Partial<TTrackInputEditForm>, issueIdOrKey?: string, trackId?: number | string): void;
  isDarkMode: boolean;
}

export const TrackColumn = memo(({ track, date, issueId, isEdit, updateTrack, isDarkMode }: ITrackColumnProps) => {
  const { utcOffsetInMinutes } = useFilterValues();
  const isSameDay = DateWrapper.getDate({ date: track?.start, utcOffsetInMinutes }).isSame(date, 'day');

  if (!isSameDay) {
    return (
      <td className={styles.cell}>
        <Typography.Text>—</Typography.Text>
      </td>
    );
  }

  return <TrackDurationEdit trackItem={track} issueId={issueId} isEdit={isEdit} updateTrack={updateTrack} isDarkMode={isDarkMode} />;
});

TrackColumn.displayName = 'TrackColumn';
