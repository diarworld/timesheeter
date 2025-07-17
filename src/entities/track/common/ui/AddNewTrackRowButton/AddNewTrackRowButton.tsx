import { Message } from 'entities/locale/ui/Message';
import { useAddNewTrackAction } from 'entities/track/common/lib/hooks/use-add-new-track-action';
import { DateWrapper } from 'features/date/lib/DateWrapper';
import { memo } from 'react';
import { useMessage } from 'entities/locale/lib/hooks';
import { STANDARD_WORK_DAY_START_LOCAL_HOUR } from 'features/date/lib/constants';
import { Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

interface IAddNewTrackRowButtonProps {
  issueKey: string;
  isDarkMode: boolean;
}

export const AddNewTrackRowButton = memo(({ issueKey, isDarkMode }: IAddNewTrackRowButtonProps) => {
  const addNewTrack = useAddNewTrackAction(issueKey);
  const message = useMessage();

  const handleClick = () => {
    const now = DateWrapper.getDate({ utcOffsetInMinutes: undefined });
    const dateWithStartHour = now.startOf('day').set('hour', STANDARD_WORK_DAY_START_LOCAL_HOUR);
    addNewTrack(dateWithStartHour);
  };

  return (
    <Button type="link" onClick={handleClick} style={{ color: isDarkMode ? '#ebedf4' : '#2e2e2e', padding: '0' }} aria-label={message('track.create.add')}>
      <PlusOutlined style={{ fontSize: '16px' }}/>
      <span>
        <Message id="track.create.add" />
      </span>
    </Button>
  );
});
