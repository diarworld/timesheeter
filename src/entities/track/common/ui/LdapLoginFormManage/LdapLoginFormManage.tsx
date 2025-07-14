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
  // console.log(activeAccount);

  const handleLoginRedirect = () => {
      instance.loginRedirect(loginRequest).catch((error) => console.log(error));
  };

  const handleLogoutRedirect = () => {
    instance.logoutRedirect().catch((error) => console.log(error));
  };
  // const [form] = Form.useForm();
  // const [authenticateEws, { isLoading: isAuthenticating }] = useAuthenticateEwsMutation();

  // // Load saved credentials from localStorage
  // const savedCredentials = JSON.parse(localStorage.getItem('ldapCredentials') || '{}');

  const handleCancel = useCallback(() => {
    dispatch(track.actions.setLdapLoginCreate());
  }, [dispatch]);

  // const handleSubmit = useCallback(
  //   async (values: { username: string; token: string; type?: string }) => {
  //     try {
  //       // Save credentials to localStorage
  //       const credentials = {
  //         username: values.username,
  //         token: values.token,
  //         type: values.type || 'ldap',
  //       };

  //       // Test EWS authentication
  //       const result = await authenticateEws(credentials).unwrap();
  //       if (result.success) {
  //         localStorage.setItem('ldapCredentials', JSON.stringify(credentials));
  //         // Set LDAP credentials status in Redux store
  //         dispatch(track.actions.setHasLdapCredentials(true));
  //         // Close the modal after successful authentication
  //         dispatch(track.actions.setLdapLoginCreate());
  //         antMessage.success(message('ldap.auth.success'));
  //       } else {
  //         // Handle authentication error
  //         console.error('EWS authentication failed:', result.message);
  //         antMessage.error(
  //           result.message
  //             ? `${message('ldap.auth.error')}: ${result.message}`
  //             : message('ldap.auth.error')
  //         );
  //       }
  //     } catch (error) {
  //       console.error('EWS authentication error:', error);
  //       antMessage.error(message('ldap.auth.error')
  //       );
  //     }
  //   },
  //   [dispatch, authenticateEws],
  // );

  // // Set initial form values from localStorage
  // useEffect(() => {
  //   if (savedCredentials.username || savedCredentials.token) {
  //     form.setFieldsValue({
  //       username: savedCredentials.username || '',
  //       type: savedCredentials.type || 'ldap',
  //     });
  //   }
  // }, [form, savedCredentials]);
  return (
    <Flex gap="middle" justify="space-evenly" vertical>
      <AuthenticatedTemplate>
        {activeAccount ? (
          // <IdTokenData idTokenClaims={activeAccount.idTokenClaims} />
          <Text fs={16} fw={800} style={{ textTransform: 'capitalize' }}>
            <UserOutlined /> {activeAccount.name}
          </Text>
        ) : null}

         {/* TODO SET ERROR STATE */}
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
    // <Form
    //   form={form}
    //   layout="vertical"
    //   onFinish={handleSubmit}
    //   initialValues={{
    //     username: savedCredentials.username || '',
    //     token: savedCredentials.token || '',
    //     type: 'ldap',
    //   }}
    // >
    //   <Form.Item
    //     name="username"
    //     label={message('ldap.auth.login')}
    //     rules={[{ required: true, type: 'email' }]}
    //     extra={<p>{message('ldap.auth.login.hint')}</p>}
    //   >
    //     <Input placeholder={message('ldap.auth.login.placeholder')} disabled />
    //   </Form.Item>
    //   <Form.Item
    //     name="token"
    //     label={message('ldap.auth.password')}
    //     rules={[{ required: true }]}
    //     extra={
    //       <>
    //         {/* <p>{message('ldap.auth.password.hint')}</p> */}
    //         {/* TODO */}
    //         <a
    //           href="https://intraru.lemanapro.ru/restore"
    //           target="_blank"
    //           rel="noopener noreferrer"
    //           style={{ fontSize: '12px', display: 'inline-block', marginTop: 4 }}
    //         >
    //           {message('ldap.auth.forgotPassword')}
    //         </a>
    //       </>
    //     }
    //   >
    //     <Input type="password" />
    //   </Form.Item>

    //   <Form.Item hidden name="type">
    //     <Input />
    //   </Form.Item>

    //   <Flex gap="middle" justify="space-evenly" vertical>
    //     {/* TODO SET ERROR STATE */}
    //     <Button type="primary" htmlType="submit" loading={isAuthenticating}>
    //       {message('share.save.action')}
    //     </Button>
    //     <Button onClick={handleCancel}>{message('share.cancel.action')}</Button>
    //   </Flex>
    // </Form>
  );
};
