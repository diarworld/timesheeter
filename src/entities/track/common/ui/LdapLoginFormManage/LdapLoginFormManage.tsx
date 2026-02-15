import { Button, Form, Input, Flex, App } from 'antd';
import Cookies from 'js-cookie';

import { useMessage } from 'entities/locale/lib/hooks';
import React, { FC, useCallback, useEffect } from 'react';
import { useAppDispatch } from 'shared/lib/hooks';
import { track } from 'entities/track/common/model/reducers';
import { useAuthenticateEwsMutation } from 'entities/track/common/model/ews-api';
import { useRuntimeConfig } from 'shared/lib/useRuntimeConfig';
import { encrypt } from 'shared/lib/encrypt';
import { useEnvVariables } from 'shared/lib/useEnvVariables';
import { TTrackerConfig } from 'entities/tracker/model/types';
import { useYandexUser } from 'entities/user/yandex/hooks/use-yandex-user';
import { useFilters } from 'features/filters/lib/useFilters';

const LDAP_COOKIE_NAME = 'ldap_credentials';

interface ILdapLoginFormManageProps {
  tracker: TTrackerConfig;
}

export const LdapLoginFormManage: FC<ILdapLoginFormManageProps> = ({ tracker }) => {
  const message = useMessage();
  const { message: antMessage } = App.useApp();
  const dispatch = useAppDispatch();
  const [form] = Form.useForm();
  const [authenticateEws, { isLoading: isAuthenticating }] = useAuthenticateEwsMutation();
  const { restorePasswordUrl } = useRuntimeConfig();
  const { envVariables, loading: envLoading } = useEnvVariables();
  const { userId, login } = useFilters();
  const { self } = useYandexUser(tracker, userId, login);

  const savedCredentials = React.useMemo(() => {
    const cookieData = Cookies.get(LDAP_COOKIE_NAME);
    if (cookieData) {
      try {
        return JSON.parse(cookieData);
      } catch {
        return {};
      }
    }
    return {};
  }, []);

  const handleCancel = useCallback(() => {
    dispatch(track.actions.setLdapLoginCreate());
  }, [dispatch]);

  const handleSubmit = useCallback(
    async (values: { username: string; token: string; type?: string }) => {
      try {
        if (envLoading) {
          antMessage.error('Still loading. Please wait.');
          return;
        }
        if (!envVariables?.ENCRYPTION_KEY) {
          antMessage.error(message('ldap.auth.nokey'));
          return;
        }
        const encryptedToken = await encrypt(values.token, envVariables.ENCRYPTION_KEY);
        const credentials = {
          username: values.username,
          token: encryptedToken,
          type: values.type || 'ldap',
        };

        const result = await authenticateEws(credentials).unwrap();
        if (result.success) {
          Cookies.set(LDAP_COOKIE_NAME, JSON.stringify(credentials), { expires: 30, path: '/' });
          dispatch(track.actions.setHasLdapCredentials(true));
          dispatch(track.actions.setLdapLoginCreate());
          antMessage.success(message('ldap.auth.success'));
        } else {
          // Handle authentication error
          console.error('EWS authentication failed:', result.message);
          antMessage.error(
            result.message ? `${message('ldap.auth.error')}: ${result.message}` : message('ldap.auth.error'),
          );
        }
      } catch (error) {
        console.error('EWS authentication error:', error);
        antMessage.error(message('ldap.auth.error'));
      }
    },
    [dispatch, authenticateEws, message, envVariables, envLoading],
  );

  const userEmail = self?.email || '';

  useEffect(() => {
    const initialUsername = savedCredentials.username || userEmail;
    if (initialUsername) {
      form.setFieldsValue({
        username: initialUsername,
        type: savedCredentials.type || 'ldap',
      });
    }
  }, [form, savedCredentials, userEmail]);

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{
        username: savedCredentials.username || userEmail,
        token: savedCredentials.token || '',
        type: 'ldap',
      }}
    >
      <Form.Item
        name="username"
        label={message('ldap.auth.login')}
        rules={[{ required: true, type: 'email' }]}
        extra={<p>{message('ldap.auth.login.hint')}</p>}
      >
        <Input placeholder={message('ldap.auth.login.placeholder')} disabled />
      </Form.Item>
      <Form.Item
        name="token"
        label={message('ldap.auth.password')}
        rules={[{ required: true }]}
        extra={
          <>
            {/* <p>{message('ldap.auth.password.hint')}</p> */}
            <a
              href={restorePasswordUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '12px', display: 'inline-block', marginTop: 4 }}
            >
              {message('ldap.auth.forgotPassword')}
            </a>
          </>
        }
      >
        <Input type="password" />
      </Form.Item>

      <Form.Item hidden name="type">
        <Input />
      </Form.Item>

      <Flex gap="middle" justify="space-evenly" vertical>
        {/* TODO SET ERROR STATE */}
        <Button
          type="primary"
          htmlType="submit"
          loading={isAuthenticating || envLoading}
          disabled={!envVariables?.ENCRYPTION_KEY}
        >
          {message('share.save.action')}
        </Button>
        <Button onClick={handleCancel}>{message('share.cancel.action')}</Button>
      </Flex>
    </Form>
  );
};
