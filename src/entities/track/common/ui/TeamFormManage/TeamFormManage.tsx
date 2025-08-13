import {
  Button,
  InputNumber,
  Avatar,
  Flex,
  Select,
  Spin,
  Space,
  Divider,
  Typography,
  Modal,
  Input,
  message as antdMessage,
} from 'antd';
import { useMessage } from 'entities/locale/lib/hooks';
import { Message } from 'entities/locale/ui/Message';
import { TTeamFormManageCreate, TTeam } from 'entities/track/common/ui/TeamFormManage/types';
import React, { FC, useState, useCallback, useEffect, useRef } from 'react';
import { TTrackerConfig } from 'entities/tracker/model/types';
import { yandexUserApi } from 'entities/user/yandex/model/yandex-api';
import { TYandexUser } from 'entities/user/yandex/model/types';
import { yandexQueueApi } from 'entities/queue/yandex/model/yandex-api';
import { QueueSelect } from 'entities/queue/common/ui/QueueSelect/QueueSelect';
import { validateLDAP } from 'entities/track/common/lib/validate-ldap';
import { syncTeamToDb } from 'entities/track/common/lib/sync-team';
import { UserOutlined } from '@ant-design/icons';
import { useGetUserExtrasQuery } from 'entities/user/common/model/api';

import { useAppDispatch, useAppSelector } from 'shared/lib/hooks';
import { track } from 'entities/track/common/model/reducers';
import { TRootState } from 'app/store';

import { useYandexUser } from 'entities/user/yandex/hooks/use-yandex-user';
import { useFilterValues } from 'features/filters/lib/useFilterValues';
import debounce from 'lodash/debounce';
import styles from './TeamFormManage.module.scss';
import { TeamSelector } from './TeamSelector';
import { TeamCreateModal } from './TeamCreateModal';

const { Text, Title } = Typography;

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
  _initialValues: TTeamFormManageCreate;
  isTrackCreateLoading: boolean;
};

export const TeamFormManage: FC<TProps> = ({ _initialValues, tracker, isTrackCreateLoading }) => {
  // Redux state
  const dispatch = useAppDispatch();
  const trackState = useAppSelector((state: TRootState) => state.track);
  const teams = trackState.teams || [];
  const selectedTeamId = trackState.selectedTeamId || null;
  const currentTeam = trackState.team;

  // Local state
  const [teamQueue, setTeamQueue] = useState<string[]>([]);
  const [teamQueueYT, setTeamQueueYT] = useState<string[]>([]);
  const [ldapValue, setLdapValue] = useState<string>('');
  const [error, setError] = useState('');
  const [userData, setUserData] = useState<TYandexUser>();
  const [ldapNumber, _setLdapNumber] = useState<string | number | null>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [teamSearchOptions, setTeamSearchOptions] = useState<
    Array<{
      value: string;
      label: string;
      members: TYandexUser[];
    }>
  >([]);
  const [teamSearchLoading, setTeamSearchLoading] = useState(false);
  const [selectedTeamIdToAdd, setSelectedTeamIdToAdd] = useState<string | null>(null);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [teamToRename, setTeamToRename] = useState<TTeam | null>(null);
  const [newTeamName, setNewTeamName] = useState('');
  const [isModifyingTeam, setIsModifyingTeam] = useState(false);
  const currentTeamRef = useRef<TYandexUser[]>([]);
  const teamsRef = useRef<TTeam[]>([]);
  const processedQueueRef = useRef<{ [teamId: string]: string }>({});
  const lastSyncedTeamRef = useRef<string>('');

  // API hooks
  const { currentData: queueList, isFetching: isFetchingQueueList } = yandexQueueApi.useGetQueuesQuery({ tracker });
  const { userId, login } = useFilterValues();
  const { self } = useYandexUser(tracker, userId, login);
  const { data: user, error: queryError } = yandexUserApi.useGetYandexUserByLoginQuery(
    { login: ldapValue ?? '', tracker },
    { skip: !ldapValue || ldapValue.length !== 8 },
  );
  const { data: teamYT } = yandexQueueApi.useGetQueueByKeysQuery(
    { keys: teamQueueYT, tracker },
    { skip: !teamQueueYT || teamQueueYT.length === 0 },
  );
  const [triggerGetUserById, { isLoading: isLoadingUsersFromTeam }] = yandexUserApi.useLazyGetYandexUserByIdQuery();

  const message = useMessage();
  const [messageApi, contextHolder] = antdMessage.useMessage();

  // Function to reset all selected states after adding members
  const resetSelectedStates = useCallback(() => {
    setTeamQueue([]);
    setTeamQueueYT([]);
    setSelectedTeamIdToAdd(null);
    setTeamSearchOptions([]);
    setLdapValue('');
    _setLdapNumber('');
    setUserData(undefined);
    setError('');

    // Clear the processed queue for the current team to allow re-processing
    if (selectedTeamId) {
      delete processedQueueRef.current[selectedTeamId];
    }
  }, [selectedTeamId]);

  // Load teams from database
  const loadTeamsFromDatabase = async () => {
    if (!self) return;

    // Don't load from database if we already have teams
    if (teams && teams.length > 0) {
      return;
    }

    try {
      const res = await fetch('/api/team', {
        headers: {
          'x-user-id': self.uid.toString(),
          'x-user-email': self.email,
          'x-user-display': self.display ? encodeURIComponent(self.display) : '',
        },
      });

      if (res.ok) {
        const data = await res.json();
        if (data.teams && Array.isArray(data.teams)) {
          // Transform database teams to our format, ensuring all members have valid emails
          const transformedTeams = data.teams.map(
            (dbTeam: { id: string; name: string; creatorId: string; members: TYandexUser[] }) => ({
              id: dbTeam.id,
              name: dbTeam.name,
              creatorId: dbTeam.creatorId,
              members: (dbTeam.members || []).map((member: TYandexUser) => ({
                ...member,
                email: member.email || `${member.login}@${process.env.COMPANY_DOMAIN || 'company.com'}`,
              })),
              isActive: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }),
          );

          dispatch(track.actions.setTeams(transformedTeams));

          // If there's only one team, make it active
          if (transformedTeams.length === 1) {
            const firstTeam = transformedTeams[0];
            dispatch(track.actions.setSelectedTeamId(firstTeam.id));
            dispatch(track.actions.setTeam(firstTeam.members));

            // Save to localStorage
            localStorage.setItem('activeTeamId', firstTeam.id);
            if (firstTeam.members && firstTeam.members.length > 0) {
              localStorage.setItem('team', JSON.stringify(firstTeam.members));
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading teams from database:', error);
    }
  };

  // Initialize teams from localStorage on component mount
  useEffect(() => {
    const savedTeams = localStorage.getItem('teams');

    if (savedTeams) {
      try {
        const parsedTeams = JSON.parse(savedTeams);
        if (parsedTeams && Array.isArray(parsedTeams) && parsedTeams.length > 0) {
          // Ensure all team members have valid emails when loading from localStorage
          const teamsWithValidEmails = parsedTeams.map((team) => ({
            ...team,
            members: (team.members || []).map((member: TYandexUser) => ({
              ...member,
              email: member.email || `${member.login}@${process.env.COMPANY_DOMAIN || 'company.com'}`,
            })),
          }));
          dispatch(track.actions.setTeams(teamsWithValidEmails));
        }
      } catch (error) {
        console.error('Error parsing saved teams:', error);
      }
    }

    const savedActiveTeamId = localStorage.getItem('activeTeamId');
    if (savedActiveTeamId) {
      dispatch(track.actions.setSelectedTeamId(savedActiveTeamId));

      // Also restore the current team members if we have teams loaded
      const savedTeams = localStorage.getItem('teams');
      if (savedTeams) {
        try {
          const parsedTeams = JSON.parse(savedTeams);
          const activeTeam = parsedTeams.find((t: TTeam) => t.id === savedActiveTeamId);
          if (activeTeam) {
            dispatch(track.actions.setTeam(activeTeam.members));
            // Ensure localStorage is updated with valid team data
            if (activeTeam.members && activeTeam.members.length > 0) {
              localStorage.setItem('team', JSON.stringify(activeTeam.members));
            }
          }
        } catch (error) {
          console.error('Error parsing saved teams for active team:', error);
        }
      }
    }

    // Only load from database if we have no teams at all (not even in localStorage)
    if (!savedTeams && self) {
      loadTeamsFromDatabase();
    }

    // Cleanup function to reset flags when component unmounts
    return () => {
      setIsModifyingTeam(false);
      currentTeamRef.current = [];
      teamsRef.current = [];
      processedQueueRef.current = {};
      lastSyncedTeamRef.current = '';
    };
  }, [dispatch, self]);

  // Save teams to localStorage when they change
  useEffect(() => {
    if (teams) {
      localStorage.setItem('teams', JSON.stringify(teams));
      teamsRef.current = teams;
    }
  }, [teams]);

  // Save active team ID to localStorage when it changes
  useEffect(() => {
    if (selectedTeamId) {
      localStorage.setItem('activeTeamId', selectedTeamId);
      const selectedTeam = teams.find((t: TTeam) => t.id === selectedTeamId);
      if (selectedTeam && selectedTeam.members && selectedTeam.members.length > 0) {
        localStorage.setItem('team', JSON.stringify(selectedTeam.members));
      }
    }
  }, [selectedTeamId, teams]);

  // Update refs when currentTeam changes
  useEffect(() => {
    if (currentTeam) {
      currentTeamRef.current = currentTeam;
    }
  }, [currentTeam]);

  // Reset selected states when selected team changes (but not when initializing)
  useEffect(() => {
    // Only reset if we're not in the initial loading state
    if (teams && teams.length > 0) {
      // Don't reset queue states when switching teams to allow queue processing to complete
      // Only reset other form states
      setSelectedTeamIdToAdd(null);
      setTeamSearchOptions([]);
      setLdapValue('');
      _setLdapNumber('');
      setUserData(undefined);
      setError('');

      // Clear the processed queue for the current team to allow re-processing
      if (selectedTeamId) {
        delete processedQueueRef.current[selectedTeamId];
      }

      // Clear the last synced team ref to allow future syncs
      lastSyncedTeamRef.current = '';
    }
  }, [selectedTeamId, teams]);

  // Sync current team to database when it changes (but not when just selecting a team)
  useEffect(() => {
    if (currentTeam && self && selectedTeamId && currentTeam.length > 0 && isModifyingTeam) {
      // Create a hash of the current team to prevent duplicate syncs
      const teamHash = JSON.stringify({
        teamId: selectedTeamId,
        members: currentTeam.map((u) => u.uid).sort(),
      });

      // Only sync if this is different from the last synced team data
      if (teamHash !== lastSyncedTeamRef.current) {
        lastSyncedTeamRef.current = teamHash;

        // Sync immediately to ensure it happens
        syncTeamToDb(currentTeam, self, selectedTeamId)
          .then(() => {
            // Sync completed successfully
          })
          .catch((error) => {
            console.error('❌ Sync failed:', error);
          })
          .finally(() => {
            setIsModifyingTeam(false); // Reset the flag after syncing completes
          });
      } else {
        // If no sync needed, still reset the modifying flag
        setIsModifyingTeam(false);
      }
    }
  }, [currentTeam, self, selectedTeamId, isModifyingTeam]);

  // Also sync when teams are loaded from database to ensure consistency
  useEffect(() => {
    if (teams && teams.length > 0 && self && !selectedTeamId) {
      // If we have teams but no active team, try to restore the last active team
      const lastActiveTeamId = localStorage.getItem('activeTeamId');
      if (lastActiveTeamId && teams.find((t: TTeam) => t.id === lastActiveTeamId)) {
        dispatch(track.actions.setSelectedTeamId(lastActiveTeamId));
        const lastActiveTeam = teams.find((t: TTeam) => t.id === lastActiveTeamId);
        if (lastActiveTeam) {
          // Ensure all team members have valid emails
          const membersWithValidEmails = lastActiveTeam.members.map((member: TYandexUser) => ({
            ...member,
            email: member.email || `${member.login}@${process.env.COMPANY_DOMAIN || 'company.com'}`,
          }));
          dispatch(track.actions.setTeam(membersWithValidEmails));
        }
      } else if (teams.length === 1) {
        // If only one team exists, make it active
        const singleTeam = teams[0];
        dispatch(track.actions.setSelectedTeamId(singleTeam.id));
        // Ensure all team members have valid emails
        const membersWithValidEmails = singleTeam.members.map((member: TYandexUser) => ({
          ...member,
          email: member.email || `${member.login}@${process.env.COMPANY_DOMAIN || 'company.com'}`,
        }));
        dispatch(track.actions.setTeam(membersWithValidEmails));

        // Save to localStorage
        localStorage.setItem('activeTeamId', singleTeam.id);
        if (membersWithValidEmails.length > 0) {
          localStorage.setItem('team', JSON.stringify(membersWithValidEmails));
        }
      }
    }
  }, [teams, self, selectedTeamId, dispatch]);

  React.useEffect(() => {
    if (queryError && 'status' in queryError && queryError.status === 404) {
      setError(
        queryError.data &&
          typeof queryError.data === 'object' &&
          'errorMessages' in queryError.data &&
          Array.isArray((queryError.data as { errorMessages: string[] }).errorMessages)
          ? (queryError.data as { errorMessages: string[] }).errorMessages.join(', ')
          : JSON.stringify(queryError.data),
      );
    } else if (user) {
      setUserData(user);
    }
  }, [user, queryError]);

  const processTeamData = useCallback(
    (teamYTData: typeof teamYT) => {
      // Only process if we haven't processed this queue for the current team yet
      const queueHash = JSON.stringify(teamQueueYT);
      const currentTeamId = selectedTeamId;

      if (teamYTData && currentTeamId && queueHash !== processedQueueRef.current[currentTeamId]) {
        // Track that this queue has been processed for this specific team
        processedQueueRef.current[currentTeamId] = queueHash;

        const allIds = teamYTData.flatMap((queue) => [
          queue.lead.id,
          ...(queue.teamUsers ?? []).map((teamUser) => teamUser.id),
        ]);
        const uniqueIds = Array.from(new Set(allIds));

        // Fetch all users in parallel
        Promise.all(uniqueIds.map((id) => triggerGetUserById({ userId: id, tracker }).unwrap()))
          .then((users) => {
            const filteredUsers = users
              .filter((teamUser) => !teamUser.dismissed)
              .filter((teamUser) => teamUser.login.startsWith('60'));

            const minimalUsers = filteredUsers.map((teamUser) => ({
              uid: teamUser.uid,
              login: teamUser.login,
              email: teamUser.email || `${teamUser.login}@${process.env.COMPANY_DOMAIN || 'company.com'}`,
              display: teamUser.display,
              position: teamUser.position,
              lastLoginDate: teamUser.lastLoginDate,
            }));

            // Update current team if active
            if (selectedTeamId && currentTeamRef.current) {
              const updatedTeam = [...currentTeamRef.current, ...minimalUsers];
              const deduped = Array.from(
                new Map(updatedTeam.map((teamUser: TYandexUser) => [teamUser.login, teamUser])).values(),
              );
              const sorted = deduped
                .slice()
                .sort((a: TYandexUser, b: TYandexUser) =>
                  (a.display || '').localeCompare(b.display || '', undefined, { sensitivity: 'base' }),
                );
              // Mark that we're modifying team data
              setIsModifyingTeam(true);

              dispatch(track.actions.setTeam(sorted));

              // Update team in teams array
              if (teamsRef.current) {
                const teamIndex = teamsRef.current.findIndex((t: TTeam) => t.id === selectedTeamId);
                if (teamIndex !== -1) {
                  dispatch(
                    track.actions.updateTeam({
                      teamId: selectedTeamId,
                      updates: { members: sorted },
                    }),
                  );
                }
              }

              // Reset all selected states after successfully adding members
              resetSelectedStates();
            }
          })
          .catch((error) => {
            console.error('Error processing team data:', error);
          });
      }
    },
    [tracker, triggerGetUserById, dispatch, selectedTeamId, resetSelectedStates],
  );

  React.useEffect(() => {
    if (teamYT && teamQueueYT.length > 0) {
      const currentQueueKeys = teamQueueYT.sort();
      const dataQueueKeys = teamYT?.map((q) => q.key).sort() || [];
      const queueKeysMatch = JSON.stringify(currentQueueKeys) === JSON.stringify(dataQueueKeys);
      if (queueKeysMatch) {
        processTeamData(teamYT);
      }
    }

    // Reset the hash when team queue changes to allow processing new data
    return () => {
      processedQueueRef.current = {};
    };
  }, [teamYT, processTeamData, teamQueueYT]);

  const handleAdd = () => {
    if (userData && selectedTeamId) {
      setIsModifyingTeam(true); // Mark that we're modifying team data
      // Ensure userData has a valid email
      const userWithValidEmail = {
        ...userData,
        email: userData.email || `${userData.login}@${process.env.COMPANY_DOMAIN || 'company.com'}`,
      };
      const newTeam = [...(currentTeam || []), userWithValidEmail];
      const sorted = newTeam
        .slice()
        .sort((a: TYandexUser, b: TYandexUser) =>
          (a.display || '').localeCompare(b.display || '', undefined, { sensitivity: 'base' }),
        );
      dispatch(track.actions.setTeam(sorted));

      // Update team in teams array
      if (teams) {
        const teamIndex = teams.findIndex((t: TTeam) => t.id === selectedTeamId);
        if (teamIndex !== -1) {
          dispatch(
            track.actions.updateTeam({
              teamId: selectedTeamId,
              updates: { members: sorted },
            }),
          );
        }
      }

      // Reset all selected states after successfully adding member
      resetSelectedStates();
    }
  };

  const handleRemove = (ldap: string) => {
    if (selectedTeamId && currentTeam) {
      setIsModifyingTeam(true); // Mark that we're modifying team data
      setError('');
      const filtered = currentTeam.filter((member: TYandexUser) => member.login !== ldap);
      const sorted = filtered
        .slice()
        .sort((a: TYandexUser, b: TYandexUser) =>
          (a.display || '').localeCompare(b.display || '', undefined, { sensitivity: 'base' }),
        );

      dispatch(track.actions.setTeam(sorted));

      // Update team in teams array
      if (teams) {
        const teamIndex = teams.findIndex((t: TTeam) => t.id === selectedTeamId);
        if (teamIndex !== -1) {
          dispatch(
            track.actions.updateTeam({
              teamId: selectedTeamId,
              updates: { members: sorted },
            }),
          );
        }
      }
    }
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

  const handleLdapNumber = (ldap: string | number | null) => {
    const es = validate(String(ldap), currentTeam || []);
    setError(es.error);
    if (!es.error) {
      setLdapValue(String(ldap));
    }
  };

  const handleAddFromTeam = () => {
    if (teamQueue.length > 0 && JSON.stringify(teamQueue) !== JSON.stringify(teamQueueYT)) {
      setTeamQueueYT(teamQueue);

      // Clear the processed queue for the current team when setting new queue
      if (selectedTeamId) {
        delete processedQueueRef.current[selectedTeamId];
      }
    }
  };

  const handleTeamQueueChange = (newQueue: string[]) => {
    setTeamQueue(newQueue);

    // Clear the processed queue for the current team when queue changes
    if (selectedTeamId) {
      delete processedQueueRef.current[selectedTeamId];
    }
  };

  const handleTeamSelect = (teamId: string) => {
    dispatch(track.actions.setSelectedTeamId(teamId));

    // Also set the current team members when selecting a team
    const selectedTeam = teams.find((t: TTeam) => t.id === teamId);
    if (selectedTeam) {
      dispatch(track.actions.setTeam(selectedTeam.members));
    }

    // Clear the processed queue for the new team to allow processing
    delete processedQueueRef.current[teamId];

    // Clear the last synced team ref when switching teams
    lastSyncedTeamRef.current = '';

    // Clear queue data when switching teams to prevent cross-contamination
    setTeamQueueYT([]);
    setTeamQueue([]);
  };

  const handleTeamCreate = () => {
    setShowCreateModal(true);
  };

  const handleTeamDelete = async (teamId: string) => {
    if (teams && self) {
      try {
        const res = await fetch('/api/team', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': self.uid.toString(),
            'x-user-email': self.email,
            'x-user-display': self.display ? encodeURIComponent(self.display) : '',
          },
          body: JSON.stringify({ teamId }),
        });

        if (res.ok) {
          const teamToDelete = teams.find((t: TTeam) => t.id === teamId);
          if (teamToDelete) {
            dispatch(track.actions.removeTeam(teamId));

            // If this was the selected team, clear the current team
            if (teamId === selectedTeamId) {
              dispatch(track.actions.setTeam([]));
            }
          }
        } else {
          const errorData = await res.json();
          console.error('Error deleting team:', errorData);
        }
      } catch (error) {
        console.error('Error deleting team:', error);
      }
    }
  };

  const handleTeamRename = (team: TTeam) => {
    setTeamToRename(team);
    setNewTeamName(team.name);
    setShowRenameModal(true);
  };

  const handleRenameSubmit = async () => {
    if (!teamToRename || !newTeamName.trim() || !self) return;

    try {
      const res = await fetch('/api/team', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': self.uid.toString(),
          'x-user-email': self.email,
          'x-user-display': self.display ? encodeURIComponent(self.display) : '',
        },
        body: JSON.stringify({
          teamId: teamToRename.id,
          name: newTeamName.trim(),
        }),
      });

      if (res.ok) {
        // Update team in Redux state
        dispatch(
          track.actions.updateTeam({
            teamId: teamToRename.id,
            updates: { name: newTeamName.trim() },
          }),
        );

        messageApi.success(message('manage.team.rename.success'));
        setShowRenameModal(false);
        setTeamToRename(null);
        setNewTeamName('');
      } else {
        const errorData = await res.json();
        console.error('Error renaming team:', errorData);
        messageApi.error(message('manage.team.rename.error'));
      }
    } catch (error) {
      console.error('Error renaming team:', error);
      messageApi.error(message('manage.team.rename.error'));
    }
  };

  const handleCreateTeam = async (teamData: TTeamFormManageCreate) => {
    if (self) {
      try {
        // Always create empty teams - the creator will be added as the only member
        const members = [self];

        const res = await fetch('/api/team', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': self.uid.toString(),
            'x-user-email': self.email,
            'x-user-display': self.display ? encodeURIComponent(self.display) : '',
          },
          body: JSON.stringify({ ...teamData, members }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.teamId) {
            const newTeam: TTeam = {
              id: data.teamId,
              name: teamData.name,
              creatorId: self.uid.toString(),
              members: members,
              isActive: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };

            dispatch(track.actions.addTeam(newTeam));
            dispatch(track.actions.setSelectedTeamId(newTeam.id));
            dispatch(track.actions.setTeam(newTeam.members));
            setShowCreateModal(false);

            // Show success message
            messageApi.success(message('manage.team.create.success', { name: teamData.name }));
          }
        } else {
          const errorData = await res.json();
          console.error('Error creating team:', errorData);

          // Show error message to user
          messageApi.error(message('manage.team.create.error'));
        }
      } catch (error) {
        console.error('Error creating team:', error);
        messageApi.error(message('manage.team.create.error'));
      }
    }
  };

  const fetchTeams = debounce(async (search: string) => {
    setTeamSearchLoading(true);
    try {
      // Only search for teams where current user is the creator (can manage)
      const res = await fetch(`/api/team?creatorId=1&search=${encodeURIComponent(search)}`);
      const data = await res.json();
      setTeamSearchOptions(
        (data.teams || [])
          .filter((t: { id: string; name: string; members: TYandexUser[] }) => t.members && t.members.length > 0)
          .map((t: { id: string; name: string; members: TYandexUser[] }) => ({
            value: t.id,
            label: t.name,
            members: t.members,
          })),
      );
    } finally {
      setTeamSearchLoading(false);
    }
  }, 400);

  const handleTeamSearchSelect = async (teamId: string) => {
    const selectedTeam = teamSearchOptions.find((t) => t.value === teamId);
    if (selectedTeam && selectedTeamId && self) {
      setIsModifyingTeam(true); // Mark that we're modifying team data
      // Merge and dedupe by uid (as string), ensuring all users have valid emails
      const membersWithValidEmails = selectedTeam.members.map((user: TYandexUser) => ({
        ...user,
        email: user.email || `${user.login}@${process.env.COMPANY_DOMAIN || 'company.com'}`,
      }));
      const merged = [...(currentTeam || []), ...membersWithValidEmails];
      const deduped = Array.from(new Map(merged.map((u) => [String(u.uid), u])).values());

      dispatch(track.actions.setTeam(deduped));

      // Update team in teams array
      if (teams) {
        const teamIndex = teams.findIndex((t: TTeam) => t.id === selectedTeamId);
        if (teamIndex !== -1) {
          dispatch(
            track.actions.updateTeam({
              teamId: selectedTeamId,
              updates: { members: deduped },
            }),
          );
        }
      }

      // Reset all selected states after successfully adding members
      resetSelectedStates();
    }
  };

  if (!teams || teams.length === 0) {
    return (
      <div>
        <Title level={5}>{message('manage.team.title') || 'Team Management'}</Title>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Text type="secondary">
            {message('manage.team.no.teams.message') || 'No teams available. Create your first team to get started.'}
          </Text>
          <Button type="primary" onClick={handleTeamCreate} style={{ marginTop: 16 }}>
            <Message id="manage.team.create" />
          </Button>
        </Space>
      </div>
    );
  }

  return (
    <>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Text type="secondary" style={{ whiteSpace: 'pre-line' }}>
          {message('manage.team.view.manage.message') ||
            'You can view all teams you are a member of, but only manage teams you created.'}
        </Text>

        <TeamSelector
          teams={teams}
          selectedTeamId={selectedTeamId}
          currentUserId={self?.uid.toString() || ''}
          onTeamSelect={handleTeamSelect}
          onTeamCreate={handleTeamCreate}
          onTeamDelete={handleTeamDelete}
          onTeamRename={handleTeamRename}
        />

        {selectedTeamId && (
          <>
            {/* Only show member management controls for teams where user is creator */}
            {teams.find((t: TTeam) => t.id === selectedTeamId)?.creatorId === self?.uid.toString() ? (
              <>
                <Divider />
                <Title level={5}>{message('manage.team.add.members') || 'Add Team Members'}</Title>
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
                        onSelect={(value) => {
                          // Store selected team ID for button state
                          setSelectedTeamIdToAdd(value);
                        }}
                        notFoundContent={teamSearchLoading ? <Spin size="small" /> : null}
                        style={{ width: '100%' }}
                        options={teamSearchOptions}
                      />
                    </span>
                    <Button
                      className={styles.input}
                      style={{ marginLeft: 8 }}
                      disabled={!selectedTeamIdToAdd} // Disable button after successful selection
                      type="primary"
                      name="addTeam"
                      htmlType="button"
                      onClick={async () => {
                        // Only add users when button is clicked
                        if (selectedTeamIdToAdd) {
                          await handleTeamSearchSelect(selectedTeamIdToAdd);
                          // Disable button after successful execution
                          setSelectedTeamIdToAdd(null);
                        }
                      }}
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
                  {error && (
                    <li className={styles.input} style={{ display: 'flex', marginBottom: 5, color: 'red' }}>
                      {error}
                    </li>
                  )}
                </ul>
                <Divider style={{ marginTop: 0 }} />
                <Title level={5}>
                  {message('manage.team.active.team') || 'Team'}:{' '}
                  {teams.find((t: TTeam) => t.id === selectedTeamId)?.name}
                </Title>

                {/* Always show team members, but only show management controls for creator teams */}
                <ul style={{ padding: '0px' }}>
                  {teams
                    .find((t: TTeam) => t.id === selectedTeamId)
                    ?.members.map((teamUser: TYandexUser) => (
                      <li key={teamUser.uid} style={{ display: 'flex', marginBottom: 5 }}>
                        <span style={{ flex: 1 }}>
                          <UserDisplayWithPhoto
                            uid={teamUser.uid}
                            login={teamUser.login}
                            display={teamUser.display}
                            position={teamUser.position}
                          />
                        </span>
                        {/* Only show remove button for teams where user is creator */}
                        {teams.find((t: TTeam) => t.id === selectedTeamId)?.creatorId === self?.uid.toString() && (
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
                        )}
                      </li>
                    ))}
                </ul>
              </>
            ) : (
              <>
                <Divider />
                <Title level={5}>
                  {message('manage.team.active.team') || 'Team'}:{' '}
                  {teams.find((t: TTeam) => t.id === selectedTeamId)?.name}
                </Title>

                {/* Show team members for viewing (non-creator teams) */}
                <ul style={{ padding: '0px' }}>
                  {teams
                    .find((t: TTeam) => t.id === selectedTeamId)
                    ?.members.map((teamUser: TYandexUser) => (
                      <li key={teamUser.uid} style={{ display: 'flex', marginBottom: 5 }}>
                        <span style={{ flex: 1 }}>
                          <UserDisplayWithPhoto
                            uid={teamUser.uid}
                            login={teamUser.login}
                            display={teamUser.display}
                            position={teamUser.position}
                          />
                        </span>
                      </li>
                    ))}
                </ul>

                <Text type="secondary" style={{ whiteSpace: 'pre-line' }}>
                  {message('manage.team.view.only.message') ||
                    'You can view team members but cannot modify them. Only the team creator can manage members.'}
                </Text>
              </>
            )}
          </>
        )}
      </Space>

      <TeamCreateModal
        visible={showCreateModal}
        onCancel={() => setShowCreateModal(false)}
        onSubmit={handleCreateTeam}
        loading={false}
        initialMembers={[]}
      />

      {/* Team Rename Modal */}
      <Modal
        title={message('manage.team.rename.title') || 'Rename Team'}
        open={showRenameModal}
        onCancel={() => {
          setShowRenameModal(false);
          setTeamToRename(null);
          setNewTeamName('');
        }}
        onOk={handleRenameSubmit}
        okText={message('manage.team.rename.submit') || 'Rename'}
        cancelText={message('manage.team.rename.cancel') || 'Cancel'}
        okButtonProps={{ disabled: !newTeamName.trim() || newTeamName.trim() === teamToRename?.name }}
      >
        <div style={{ marginBottom: 16 }}>
          <Text type="secondary">{message('manage.team.rename.description') || 'Enter a new name for your team:'}</Text>
        </div>
        <Input
          placeholder={message('manage.team.rename.placeholder') || 'Enter team name'}
          value={newTeamName}
          onChange={(e) => setNewTeamName(e.target.value)}
          onPressEnter={handleRenameSubmit}
        />
      </Modal>
      {contextHolder}
    </>
  );
};
