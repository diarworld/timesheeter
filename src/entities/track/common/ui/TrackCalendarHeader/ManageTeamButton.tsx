import { Button } from 'antd';
import { UsergroupAddOutlined } from '@ant-design/icons';
import { clsx } from 'clsx';
import { useManageTeamAction } from 'entities/track/common/lib/hooks/use-manage-team-action';
import { DateWrapper } from 'features/date/lib/DateWrapper';
import { Message } from 'entities/locale/ui/Message';
import { STANDARD_WORK_DAY_START_LOCAL_HOUR } from 'features/date/lib/constants';
import styles from './ManageTeamButton.module.scss';

interface IManageTeamButtonProps {
  className?: string;
  isEdit?: boolean;
}

export const ManageTeamButton = ({ className, isEdit }: IManageTeamButtonProps) => {
  const createTeamAction = useManageTeamAction();


  const handleManageTeam = () => {
    const now = DateWrapper.getDate({ utcOffsetInMinutes: undefined });
    const dateWithStartHour = now.startOf('day').set('hour', STANDARD_WORK_DAY_START_LOCAL_HOUR);
    createTeamAction();
  };

  return (
    <Button
      className={clsx(className, styles.btn)}
      type="link"
      disabled={!isEdit}
      icon={<UsergroupAddOutlined />}
      onClick={handleManageTeam}
    >
      <span>
        <Message id="manage.team" />
      </span>
    </Button>
  );
};
