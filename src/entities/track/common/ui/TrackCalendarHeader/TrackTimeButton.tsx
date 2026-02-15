import { Button } from 'antd';
import { PlusCircleFilled } from '@ant-design/icons';
import { clsx } from 'clsx';
import dayjs from 'dayjs';
import { useAddNewTrackAction } from 'entities/track/common/lib/hooks/use-add-new-track-action';
import { DateWrapper, TDate } from 'features/date/lib/DateWrapper';
import { Message } from 'entities/locale/ui/Message';
import { STANDARD_WORK_DAY_START_LOCAL_HOUR } from 'features/date/lib/constants';
import styles from './TrackTimeButton.module.scss';

interface ITrackTimeButtonProps {
  className?: string;
  isEdit?: boolean;
  date?: TDate;
}

export const TrackTimeButton = ({ className, isEdit, date }: ITrackTimeButtonProps) => {
  const createTrackAction = useAddNewTrackAction();

  const handleClick = () => {
    const dateObj = date ? dayjs(date) : DateWrapper.getDate({ utcOffsetInMinutes: undefined });
    const dateWithStartHour = dateObj.startOf('day').set('hour', STANDARD_WORK_DAY_START_LOCAL_HOUR);
    createTrackAction(dateWithStartHour);
  };

  return (
    <Button
      className={clsx(className, styles.btn)}
      type="link"
      icon={isEdit && <PlusCircleFilled />}
      onClick={handleClick}
      disabled={!isEdit}
    >
      <span>
        {isEdit && <Message id="track.create.add" />}
        {!isEdit && <Message id="track.create.readOnly" />}
      </span>
    </Button>
  );
};
