import { Button } from 'antd';
import { UsergroupAddOutlined } from '@ant-design/icons';
import { clsx } from 'clsx';
import { useManageTeamAction } from 'entities/track/common/lib/hooks/use-manage-team-action';
import { Message } from 'entities/locale/ui/Message';
import styles from './ManageTeamButton.module.scss';

interface IManageTeamButtonProps {
  className?: string;
  isEdit?: boolean;
}

export const ManageTeamButton = ({ className, isEdit }: IManageTeamButtonProps) => {
  const createTeamAction = useManageTeamAction();

  const handleManageTeam = () => {
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
