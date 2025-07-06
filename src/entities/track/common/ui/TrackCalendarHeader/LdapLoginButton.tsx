import { Button } from 'antd';
import { LoginOutlined } from '@ant-design/icons';
import { clsx } from 'clsx';
import { useLdapLoginAction } from 'entities/track/common/lib/hooks/use-ldap-login-action';
import { Message } from 'entities/locale/ui/Message';
import styles from './ManageTeamButton.module.scss';

interface ILdapLoginButtonProps {
  className?: string;
  isEdit?: boolean;
}

export const LdapLoginButton = ({ className, isEdit }: ILdapLoginButtonProps) => {
  const createTeamAction = useLdapLoginAction();


  const handleLdapLogin = () => {
    createTeamAction();
  };

  return (
    <Button
      className={clsx(className, styles.btn)}
      type="link"
      disabled={!isEdit}
      icon={<LoginOutlined />}
      onClick={handleLdapLogin}
    >
      <span>
        <Message id="ldap.auth" />
      </span>
    </Button>
  );
};
