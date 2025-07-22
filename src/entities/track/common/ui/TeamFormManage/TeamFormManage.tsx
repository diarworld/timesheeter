import { Button, InputNumber, Avatar, Flex, Select, Spin } from 'antd';
import { useMessage } from 'entities/locale/lib/hooks';
import { Message } from 'entities/locale/ui/Message';
import { TTeamManageCreate } from 'entities/track/common/model/types';
import React, { FC, useState, useCallback, useRef } from 'react';
import { TTrackerConfig } from 'entities/tracker/model/types';
import { yandexUserApi } from 'entities/user/yandex/model/yandex-api';
import { TYandexUser } from 'entities/user/yandex/model/types';
import { yandexQueueApi } from 'entities/queue/yandex/model/yandex-api';
import { QueueSelect } from 'entities/queue/common/ui/QueueSelect/QueueSelect';
import { validateLDAP } from 'entities/track/common/lib/validate-ldap';
import { syncTeamToDb } from 'entities/track/common/lib/sync-team';
import { UserOutlined } from '@ant-design/icons';
import { useGetUserExtrasQuery } from 'entities/user/common/model/api';

import { useAppDispatch } from 'shared/lib/hooks';
import { track } from 'entities/track/common/model/reducers';

import { useYandexUser } from 'entities/user/yandex/hooks/use-yandex-user';
import { useFilterValues } from 'features/filters/lib/useFilterValues';
import debounce from 'lodash/debounce';
import styles from './TeamFormManage.module.scss';

interface IUserDisplayWithPhotoProps {
  uid: number;
  login: string;
  display: string;
  position?: string;
}

// Component for displaying user with photo
const UserDisplayWithPhoto: React.FC<IUserDisplayWithPhotoProps> = ({ uid, login, display, position }) => {
  const { data: userExtras } = useGetUserExtrasQuery(uid, {
    skip: !uid,
  });

  return (
    <Flex align="center" gap={8}>
      {userExtras?.photo ? (
        <Avatar src={`data:image/jpeg;base64,${userExtras.photo}`} size={24} />
      ) : (
        <Avatar icon={<UserOutlined />} size={24} />
      )}
      <span>
        {login} - {display} - {position}
      </span>
    </Flex>
  );
};

type TProps = {
  tracker: TTrackerConfig;
  _initialValues: TTeamManageCreate;
  isTrackCreateLoading: boolean;
};

export const TeamFormManage: FC<TProps> = ({ _initialValues, tracker, isTrackCreateLoading }) => {
  // Local queue state for team form manage
  const [teamQueue, setTeamQueue] = useState<string[]>([]);
  const [teamQueueYT, setTeamQueueYT] = useState<string[]>([]);

  const { currentData: queueList, isFetching: isFetchingQueueList } = yandexQueueApi.useGetQueuesQuery({ tracker });
  const { userId, login } = useFilterValues();
  const { self } = useYandexUser(tracker, userId, login);

  const message = useMessage();
  const dispatch = useAppDispatch();
  const [team, setTeam] = useState<TYandexUser[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('team') || '[]');
    } catch {
      return [];
    }
  });
  const [ldapValue, setLdapValue] = useState<string>('');
  const [error, setError] = useState('');
  const [userData, setUserData] = useState<TYandexUser>();

  const { data: user, error: queryError } = yandexUserApi.useGetYandexUserByLoginQuery(
    { login: ldapValue ?? '', tracker },
    { skip: !ldapValue || ldapValue.length !== 8 },
  );

  React.useEffect(() => {
    if (queryError && 'status' in queryError && queryError.status === 404) {
      // setUserData(undefined);
      // console.log("User set to undefined");
      setError(
        queryError.data &&
          typeof queryError.data === 'object' &&
          'errorMessages' in queryError.data &&
          Array.isArray((queryError.data as { errorMessages: string[] }).errorMessages)
          ? (queryError.data as { errorMessages: string[] }).errorMessages.join(', ')
          : JSON.stringify(queryError.data),
      );
    } else if (user) {
      // console.log("User set to " + user)
      setUserData(user);
    }
  }, [user, queryError]);

  const { data: teamYT } = yandexQueueApi.useGetQueueByKeysQuery(
    { keys: teamQueueYT, tracker },
    { skip: !teamQueueYT || teamQueueYT.length === 0 },
  );

  const [triggerGetUserById, { isLoading: isLoadingUsersFromTeam }] = yandexUserApi.useLazyGetYandexUserByIdQuery();

  const processTeamData = useCallback(
    (teamYTData: typeof teamYT) => {
      if (teamYTData) {
        const allIds = teamYTData.flatMap((queue) => [
          queue.lead.id,
          ...(queue.teamUsers ?? []).map((teamUser) => teamUser.id),
        ]);
        const uniqueIds = Array.from(new Set(allIds));

        // Fetch all users in parallel
        Promise.all(uniqueIds.map((id) => triggerGetUserById({ userId: id, tracker }).unwrap())).then((users) => {
          const filteredUsers = users
            .filter((teamUser) => !teamUser.dismissed)
            .filter((teamUser) => teamUser.login.startsWith('60'));
          setTeam((prevTeam) => {
            const merged = [...prevTeam, ...filteredUsers];
            const deduped = Array.from(new Map(merged.map((teamUser) => [teamUser.login, teamUser])).values());
            // Sort by display field (case-insensitive)
            const sorted = deduped
              .slice()
              .sort((a, b) => (a.display || '').localeCompare(b.display || '', undefined, { sensitivity: 'base' }));
            const minimalUsers = sorted.map((teamUser) => ({
              uid: teamUser.uid,
              login: teamUser.login,
              email: teamUser.email,
              display: teamUser.display,
              position: teamUser.position,
              lastLoginDate: teamUser.lastLoginDate,
              // created: teamUser.created,
              // lastLogin: teamUser.lastLogin,
              // login_count: teamUser.login_count,
            }));
            localStorage.setItem('team', JSON.stringify(minimalUsers));
            dispatch(track.actions.setTeam(sorted));
            return sorted;
          });
        });
      }
    },
    [tracker, triggerGetUserById, dispatch],
  );

  React.useEffect(() => {
    if (teamYT && teamQueueYT.length > 0) {
      processTeamData(teamYT);
    }
  }, [teamYT, processTeamData, teamQueueYT]);

  const handleAdd = () => {
    if (userData) {
      const newTeam = [...team, userData];
      // Sort by display field (case-insensitive)
      const sorted = newTeam
        .slice()
        .sort((a, b) => (a.display || '').localeCompare(b.display || '', undefined, { sensitivity: 'base' }));
      const minimalUsers = sorted.map((teamUser) => ({
        uid: teamUser.uid,
        login: teamUser.login,
        display: teamUser.display,
        email: teamUser.email,
        position: teamUser.position,
      }));
      localStorage.setItem('team', JSON.stringify(minimalUsers));
      setTeam(sorted);
      dispatch(track.actions.setTeam(sorted));
    }
  };

  const handleRemove = (ldap: string) => {
    setError('');
    const filtered = team.filter((member) => member.login !== ldap);
    // Sort by display field (case-insensitive)
    const sorted = filtered
      .slice()
      .sort((a, b) => (a.display || '').localeCompare(b.display || '', undefined, { sensitivity: 'base' }));
    setTeam(sorted);
    localStorage.setItem('team', JSON.stringify(sorted));
    dispatch(track.actions.setTeam(sorted));
  };

  const validate = (ldap: string, teamData: TYandexUser[]) => {
    if (ldap && !validateLDAP(ldap)) {
      setUserData(undefined);
      return { error: message('manage.team.add.error') };
    }
    if (teamData.some((e) => e.login === ldap)) {
      setUserData(undefined);
      return { error: message('manage.team.add.duplicate') };
    }
    return { error: '' };
  };

  const [ldapNumber, _setLdapNumber] = useState<string | number | null>('');

  const handleLdapNumber = (ldap: string | number | null) => {
    const es = validate(String(ldap), team);
    setError(es.error);
    if (!es.error) {
      // console.log('Ready to search: ', ldap);
      setLdapValue(String(ldap));
    }
  };

  const handleAddFromTeam = () => {
    if (teamQueue.length > 0 && JSON.stringify(teamQueue) !== JSON.stringify(teamQueueYT)) {
      setTeamQueueYT(teamQueue);
    }
  };

  // Handler for team queue changes
  const handleTeamQueueChange = (newQueue: string[]) => {
    setTeamQueue(newQueue);
  };

  const lastSyncedTeam = useRef<string>('');

  React.useEffect(() => {
    const teamString = JSON.stringify(team);
    if (teamString !== lastSyncedTeam.current && self) {
      lastSyncedTeam.current = teamString;
      syncTeamToDb(team, self);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team, self]);

  const [teamSearchOptions, setTeamSearchOptions] = useState<
    { value: string; label: string; members: TYandexUser[] }[]
  >([]);
  const [teamSearchLoading, setTeamSearchLoading] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | undefined>(undefined);

  const fetchTeams = debounce(async (search: string) => {
    setTeamSearchLoading(true);
    try {
      const res = await fetch(`/api/team?creatorId=1&search=${encodeURIComponent(search)}`);
      const data = await res.json();
      setTeamSearchOptions(
        (data.teams || []).map((t: { id: string; name: string; members: TYandexUser[] }) => ({
          value: t.id,
          label: t.name,
          members: t.members,
        })),
      );
    } finally {
      setTeamSearchLoading(false);
    }
  }, 400);

  const handleTeamSelect = (teamId: string) => {
    const selectedTeam = teamSearchOptions.find((t) => t.value === teamId);
    if (selectedTeam) {
      // Merge and dedupe by uid (as string)
      setTeam((prev) => {
        const merged = [...prev, ...selectedTeam.members];
        const deduped = Array.from(new Map(merged.map((u) => [String(u.uid), u])).values());
        localStorage.setItem('team', JSON.stringify(deduped));
        dispatch(track.actions.setTeam(deduped));
        return deduped;
      });
    }
  };

  return (
    <>
      <ul style={{ padding: '0px' }}>
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
            disabled={teamQueue.length === 0}
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
            <Select
              showSearch
              allowClear
              className={styles.input}
              placeholder={message('manage.team.search') || 'Search team by name'}
              filterOption={false}
              onSearch={fetchTeams}
              onSelect={setSelectedTeamId}
              value={selectedTeamId}
              notFoundContent={teamSearchLoading ? <Spin size="small" /> : null}
              style={{ width: '100%' }}
              options={teamSearchOptions}
            />
          </span>
          <Button
            className={styles.input}
            style={{ marginLeft: 8 }}
            disabled={!selectedTeamId}
            type="primary"
            name="addTeam"
            htmlType="button"
            onClick={() => selectedTeamId && handleTeamSelect(selectedTeamId)}
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
              onChange={(value) => {
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
      <ul style={{ padding: '0px' }}>
        {error && (
          <li className={styles.input} style={{ display: 'flex', marginBottom: 5, color: 'red' }}>
            {error}
          </li>
        )}
      </ul>
      <ul style={{ padding: '0px' }}>
        {team.map((teamUser) => (
          <li key={teamUser.login} style={{ display: 'flex', marginBottom: 5 }}>
            <span style={{ flex: 1 }}>
              <UserDisplayWithPhoto
                uid={teamUser.uid}
                login={teamUser.login}
                display={teamUser.display}
                position={teamUser.position}
              />
            </span>
            <Button
              type="primary"
              name="addLdap"
              htmlType="button"
              onClick={() => handleRemove(teamUser.login)}
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
