import { Button, InputNumber } from 'antd';
import { useMessage } from 'entities/locale/lib/hooks';
import { Message } from 'entities/locale/ui/Message';
import { TTeamManageCreate } from 'entities/track/common/model/types';
import React, { FC, useState } from 'react';
import { Form } from 'react-final-form';

import { InputField } from 'features/form/ui/InputField';
import { validateLDAP } from 'entities/track/common/lib/validate-ldap';
import { TTrackerConfig } from 'entities/tracker/model/types';
import { TTeamFormManageFields } from 'entities/track/common/ui/TeamFormManage/types';
import { TYandexUser } from 'entities/user/yandex/model/types';
import { yandexUserApi } from 'entities/user/yandex/model/yandex-api';

import styles from './TeamFormManage.module.scss';
import { constants } from 'buffer';

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
  
  const [team, setTeam] = useState<TYandexUser[]>(teamLdap);
  const [ldapValue, setLdapValue] = useState<string>('');
  const [error, setError] = useState('');
  const [userData, setUserData] = useState<TYandexUser | undefined>(undefined);

  const { data: user, isLoading, error: queryError } = yandexUserApi.useGetYandexUserByLoginQuery(
    { login: ldapValue ?? '', tracker }, 
    { skip: !ldapValue || ldapValue.length != 8 }
  );

  React.useEffect(() => {
    if (queryError && 'status' in queryError && queryError.status === 404) {
      setUserData(undefined);
      // console.log("User set to undefined");
      setError(
        queryError.data &&
        typeof queryError.data === 'object' &&
        'errorMessages' in queryError.data &&
        Array.isArray((queryError.data as any).errorMessages)
          ? (queryError.data as any).errorMessages.join(', ')
          : JSON.stringify(queryError.data)
      );
    } else if (user) {
      // console.log("User set to " + user)
      setUserData(user);
    }
  }, [user, queryError]);
  
  
  const handleAdd = () => {
    if (userData) {
    setTeam([...team, userData]);
    localStorage.setItem('team', JSON.stringify([...team, userData]))
    setError('');
    setUserData(undefined);
    // form.change('ldap', '');
    setLdapValue('');
    setLdapNumber(null);
    // console.log(userData)
    }
  };

  const handleRemove = (ldap: string) => {
    setError('');
    setTeam(team.filter(member => member.login !== ldap));
    localStorage.setItem('team', JSON.stringify(team.filter(member => member.login !== ldap)));
  };

  const validate = (ldap: string, team: TYandexUser[]) => {
    if (ldap && !validateLDAP(ldap)) {
      setUserData(undefined)
      return { error: message('manage.team.add.error') };      
    }
    if (team.some(e => e.login === ldap)) {
      setUserData(undefined)
      return { error: message('manage.team.add.duplicate') };
    }    
    return { error: ''};
  };


  const [ldapNumber, setLdapNumber] = useState<string | number | null>('');
  
  const handleLdapNumber = (ldap: string | number | null) => {
    const es = validate(String(ldap), team)
    setError(es.error);
    if (!es.error) {
      // console.log('Ready to search: ', ldap);
      setLdapValue(String(ldap))
    }    
  };

  return (
    <>
    <InputNumber 
      name="ldap" 
      className={styles.input}
      placeholder={message('manage.team.ldap')}
      onChange={value => {
        handleLdapNumber(value);
      }}
      value={ldapNumber}
      status={error ? 'error' : undefined}
    />
    {error && <div className={styles.input} style={{ color: 'red' }}>{error}</div>}
    <Button
      className={styles.input}
      disabled={isTrackCreateLoading || !!error || isLoading || !userData}
      type="primary"
      name="addLdap"
      htmlType="button"
      onClick={handleAdd}
      loading={isTrackCreateLoading || isLoading }
      >
      <Message id="manage.team.add" />
      </Button>
    <ul>
      {team.map(user => (
        <li key={user.login} style={{ display: 'flex', alignItems: 'center', marginBottom: 5 }}>
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
    </>
  );
};
