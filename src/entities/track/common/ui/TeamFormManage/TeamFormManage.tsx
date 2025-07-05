import { AutoCompleteProps, Button } from 'antd';
import { useMessage } from 'entities/locale/lib/hooks';
import { Message } from 'entities/locale/ui/Message';
import { TTeamManageCreate } from 'entities/track/common/model/types';
import React, { FC, ReactNode, useState } from 'react';
import { FieldInputProps, Form } from 'react-final-form';

import { InputField } from 'features/form/ui/InputField';
import { validateLDAP } from 'entities/track/common/lib/validate-ldap';
import { TTrackerConfig } from 'entities/tracker/model/types';
import { TTeamFormManageFields } from 'entities/track/common/ui/TeamFormManage/types';
import { IIssueTracksProps } from 'entities/track/common/ui/IssueTracks/IssueTracks';
import { TYandexUser } from 'entities/user/yandex/model/types';
import { yandexUserApi } from 'entities/user/yandex/model/yandex-api';

import styles from './TeamFormManage.module.scss';

type TProps = {
  tracker: TTrackerConfig;
  initialValues: TTeamManageCreate;
  isTrackCreateLoading: boolean;
};

export const TeamFormManage: FC<TProps> = ({
  initialValues,
  tracker,
  isTrackCreateLoading,
}) => {
  const message = useMessage();
  
  const teamLdap: TYandexUser[] = JSON.parse(localStorage.getItem('team') || '[]');
  
  const validate = (fields: TTeamFormManageFields) => ({
    ldap: validateLDAP(fields.ldap) ? undefined : message('manage.team.add.error'),
  });

  const [team, setTeam] = useState<TYandexUser[]>(teamLdap);
  const [ldapValue, setLdapValue] = useState('');
  const [error, setError] = useState('');
  
  let { data: user, isLoading } = yandexUserApi.useGetYandexUserByLoginQuery(
    { login: ldapValue ?? '', tracker }, 
    { skip: !ldapValue || ldapValue.length != 8 } // Only query when ldap is valid
  );
  const getUser = (ldap: string) => {
    return user;
  };
  
  const handleAdd = (ldap: string) => {    
    setError('');
    if (team.some(e => e.login === ldap)) {
      setError('Юзер уже в списке');
      return;
    }
    getUser(ldap);

    if (!user) {
      setError('Юзер не найден');
      return;
    }
    if (team.some(e => e.login === user!.login)) {
      // setError('Юзер уже в командном списке');
      return;
    }
    setTeam([...team, user]);
    localStorage.setItem('team', JSON.stringify([...team, user]))
    setError('');
    user = undefined
  };

  const handleRemove = (ldap: string) => {
    setError('');
    setTeam(team.filter(member => member.login !== ldap));
    localStorage.setItem('team', JSON.stringify(team.filter(member => member.login !== ldap)));
  };
  return (
    <>
    <Form initialValues={initialValues} onSubmit={() => {}} validate={validate}>
      {({ handleSubmit, invalid, form }) => (
        <>
          <form onSubmit={handleSubmit} className={styles.form}>
            <InputField
              name="ldap"
              autoComplete="off"
              displayError="onlyDirty"
              displayErrorStatus="onlyDirty"
              placeholder={message('manage.team.ldap')}
              onBlur={(e) => setLdapValue(e.target.value)}
            />
            {error && <div style={{ color: 'red' }}>{error}</div>}
            <Button
                // disabled={isTrackCreateLoading || invalid}
                disabled={isTrackCreateLoading || invalid || isLoading || !user}
                type="primary"
                name="addLdap"
                htmlType="button"
                onClick={() => handleAdd(ldapValue)}
                loading={isTrackCreateLoading || isLoading }
              >
                <Message id="manage.team.add" />
              </Button>
            <ul>
              {team.map(user => (
                <li key={user.login} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ flex: 1 }}>{user.login} - {user.display} - {user.position}</span>
                  <Button
                    type="primary"
                    name="addLdap"
                    htmlType="button"
                    onClick={() => handleRemove(user.login)} 
                    style={{ marginLeft: 8 }}
                    loading={isTrackCreateLoading}
                  >
                    <Message id="manage.team.remove" />
                  </Button>
                </li>
              ))}
            </ul>
          </form>
        </>
      )}
    </Form>
    </>
  );
};
