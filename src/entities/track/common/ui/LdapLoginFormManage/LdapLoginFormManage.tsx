import { Button, Flex } from 'antd';
import { useMessage } from 'entities/locale/lib/hooks';
import React, { FC, useCallback } from 'react';
import { useAppDispatch } from 'shared/lib/hooks';
import { track } from 'entities/track/common/model/reducers';
import { AuthenticatedTemplate, useMsal, UnauthenticatedTemplate } from '@azure/msal-react';
import { loginRequest } from './authConfig';
import { Text } from 'components';
import { UserOutlined } from '@ant-design/icons';

export const LdapLoginFormManage: FC = () => {
  const message = useMessage();
  const dispatch = useAppDispatch();
  const { instance } = useMsal();
  const activeAccount = instance.getActiveAccount();

  const handleLoginRedirect = () => {
      instance.loginRedirect(loginRequest).catch((error) => console.log(error));
  };

  const handleLogoutRedirect = () => {
    instance.logoutRedirect().catch((error) => console.log(error));
  };

  const handleCancel = useCallback(() => {
    dispatch(track.actions.setLdapLoginCreate());
  }, [dispatch]);

  return (
    <Flex gap="middle" justify="space-evenly" vertical>
      <AuthenticatedTemplate>
        {activeAccount ? (
          <Text fs={16} fw={800} style={{ textTransform: 'capitalize' }}>
            <UserOutlined /> {activeAccount.name}
          </Text>
        ) : null}
         <Button type="primary" htmlType="submit" onClick={handleLogoutRedirect}>
           {message('home.logout')}
         </Button>
      </AuthenticatedTemplate>
      <UnauthenticatedTemplate>
        <Button type="primary" htmlType="submit" onClick={handleLoginRedirect}>
          {message('home.login')}
        </Button>
        </UnauthenticatedTemplate>
      <Button onClick={handleCancel}>{message('share.cancel.action')}</Button>
    </Flex>
  );
};
