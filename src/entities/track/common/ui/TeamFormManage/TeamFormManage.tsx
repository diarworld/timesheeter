import { Button, Flex, InputNumber, Row, Divider, Col } from 'antd';
import { useMessage } from 'entities/locale/lib/hooks';
import { Message } from 'entities/locale/ui/Message';
import { TTeamManageCreate } from 'entities/track/common/model/types';
import React, { FC, useState } from 'react';

import { validateLDAP } from 'entities/track/common/lib/validate-ldap';
import { TTrackerConfig } from 'entities/tracker/model/types';
import { TYandexUser } from 'entities/user/yandex/model/types';
import { yandexUserApi } from 'entities/user/yandex/model/yandex-api';
import { yandexQueueApi } from 'entities/queue/yandex/model/yandex-api';

import { QueueSelect } from 'entities/queue/common/ui/QueueSelect/QueueSelect';

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

  // Local queue state for team form manage
  const [teamQueue, setTeamQueue] = useState<string[]>([]);
  const [teamQueueYT, setTeamQueueYT] = useState<string[]>([]);
  
  const { currentData: queueList, isFetching: isFetchingQueueList } = yandexQueueApi.useGetQueuesQuery({ tracker });

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
  
  const { data: teamYT, isLoading: isLoadingTeams, error: queryErrorTeams } = yandexQueueApi.useGetQueueByKeysQuery(
    { keys: teamQueueYT, tracker }, 
    { skip: !teamQueueYT || teamQueueYT.length == 0 }
  );

  const [triggerGetUserById, { isLoading: isLoadingUsersFromTeam }] = yandexUserApi.useLazyGetYandexUserByIdQuery();

  React.useEffect(() => {
    if (teamYT) {
      const allIds = teamYT.flatMap(queue => [
        queue.lead.id,
        ...(queue.teamUsers ?? []).map(user => user.id)
      ]);
      const uniqueIds = Array.from(new Set(allIds));

      // Fetch all users in parallel
      Promise.all(uniqueIds.map(id =>
        triggerGetUserById({ userId: id, tracker }).unwrap()
      )).then(users => {
        const filteredUsers = users.filter(user => !user.dismissed).filter(user => user.login.startsWith('60'));
        const merged = [...team, ...filteredUsers];
        const deduped = Array.from(
          new Map(merged.map(user => [user.login, user])).values()
        );
        const minimalUsers = deduped.map(user => ({
          uid: user.uid,
          login: user.login,
          display: user.display,
          email: user.email,
          position: user.position,
        }));
        localStorage.setItem('team', JSON.stringify(minimalUsers));
        setTeam(deduped);
      });
    }
  }, [teamYT]);
  
  
  const handleAdd = () => {
    if (userData) {
    const newTeam = [...team, userData];
    const minimalUsers = newTeam.map(user => ({
      uid: user.uid,
      login: user.login,
      display: user.display,
      email: user.email,
      position: user.position,
    }));
    localStorage.setItem('team', JSON.stringify(minimalUsers));
    setTeam(newTeam)
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

  const handleAddFromTeam = () => {
    if (teamQueue.length > 0) {
      setTeamQueueYT(teamQueue)
    }
  };

  // Handler for team queue changes
  const handleTeamQueueChange = (newQueue: string[]) => {
    setTeamQueue(newQueue);
  };

  return (
    <>
    <ul style={{padding: "0px"}}>
    <li style={{ display: 'flex', marginBottom: 5 }}>
    <span style={{ flex: 1 }}>
    <QueueSelect
      className={styles.select}
      value={teamQueue}
      onChange={handleTeamQueueChange}
      queueList={queueList}
      placeholder={message('manage.team.queue.placeholder')}
      isFetchingQueueList={isFetchingQueueList}
    />
    </span>
    <Button
      className={styles.input}
      style={{ marginLeft: 8 }}
      disabled={teamQueue.length == 0}
      type="primary"
      name="addLdap"
      htmlType="button"
      onClick={handleAddFromTeam}
      loading={isLoadingUsersFromTeam}
      >
      <Message id="manage.team.add" />
    </Button>
    </li>
    <li style={{ display: 'flex', marginBottom: 5 }}>
    <span style={{ flex: 1 }}>
    <InputNumber 
      name="ldap"
      className={styles.input}
      style={{ width: '100%' }}
      placeholder={message('manage.team.ldap')}
      onChange={value => {
        handleLdapNumber(value);
      }}
      value={ldapNumber}
      status={error ? 'error' : undefined}
    />
    </span>
    <Button
      className={styles.input}
      style={{ marginLeft: 8 }}
      disabled={!!error || !userData}
      type="primary"
      name="addLdap"
      htmlType="button"
      onClick={handleAdd}
      // loading={isTrackCreateLoading || isLoading }
      >
      <Message id="manage.team.add" />
    </Button>
    </li>
    </ul>
    <ul style={{padding: "0px"}}>
    {error && <li className={styles.input} style={{ display: 'flex', marginBottom: 5, color: 'red' }}>{error}</li>}
    </ul>
    <ul style={{padding: "0px"}}>
      {team.map(user => (
        <li key={user.login} style={{ display: 'flex', marginBottom: 5 }}>
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
