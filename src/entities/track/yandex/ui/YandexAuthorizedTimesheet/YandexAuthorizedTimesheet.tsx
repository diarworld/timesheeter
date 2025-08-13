import { useUnauthorizedTracker } from 'entities/auth/ui/UnauthorizedTracker';
import { useFilterValues } from 'features/filters/lib/useFilterValues';
import { YandexTimesheet } from 'entities/track/yandex/ui/YandexTimesheet/YandexTimesheet';
import { Loading } from 'shared/ui/Loading';
import { TCurrentLocale } from 'entities/locale/model/types';
import { TYandexTrackerConfig } from 'entities/tracker/model/types';
import { UserLoadFail } from 'entities/auth/ui/UserLoadFail/UserLoadFail';
import { useYandexUser } from 'entities/user/yandex/hooks/use-yandex-user';
import { useSetTrackerUsername } from 'entities/tracker/lib/useSetTrackerUsername';
import { useLogoutTracker } from 'entities/tracker/lib/useLogoutTracker';

import { TYandexUser } from 'entities/user/yandex/model/types';
import { useAppDispatch } from 'shared/lib/hooks';
import { track } from 'entities/track/common/model/reducers';
import { useEffect, useState } from 'react';
import { TTeam } from 'entities/track/common/ui/TeamFormManage/types';
import { useRouter } from 'next/router';
import { initializeTracker, setUserID } from 'shared/lib/tracker';
import { useRuntimeConfig } from 'shared/lib/useRuntimeConfig';

type TProps = {
  language: TCurrentLocale | undefined;
  tracker: TYandexTrackerConfig;
  // we need this prop only to preserve old UX for yandex tracker on index page
  unauthorizedErrorShouldAppearAsOrgChange: boolean;
  isDarkMode: boolean;
  setIsDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
};

export const YandexAuthorizedTimesheet = ({
  language,
  tracker,
  unauthorizedErrorShouldAppearAsOrgChange,
  isDarkMode,
  setIsDarkMode,
}: TProps) => {
  const { userId, login } = useFilterValues();
  const dispatch = useAppDispatch();

  const { uId, isLoadingSelf, errorSelf, self } = useYandexUser(tracker, userId, login);
  const { envVariables } = useRuntimeConfig();

  // Move hooks to top level
  const router = useRouter();
  const menuFromQuery = typeof router.query.menu === 'string' ? router.query.menu : 'tracks';
  const [currentMenuKey, setCurrentMenuKey] = useState(menuFromQuery);

  useEffect(() => {
    if (menuFromQuery !== currentMenuKey) {
      setCurrentMenuKey(menuFromQuery);
    }
  }, [menuFromQuery, currentMenuKey]);

  // When user switches tab
  const handleMenuChange = (key: string) => {
    if (key !== currentMenuKey) {
      router.push({ pathname: router.pathname, query: { ...router.query, menu: key } }, undefined, { shallow: true });
    }
  };

  useEffect(() => {
    if (self) {
      // Call your backend API to upsert the user
      fetch('/api/upsert-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(self),
      });
    }
  }, [self]);
  useEffect(() => {
    if (!self) return; // Don't proceed if user is not loaded yet

    let team: TYandexUser[] = [];
    let shouldFetchFromDatabase = false;

    try {
      const stored = localStorage.getItem('team');
      if (stored) {
        team = JSON.parse(stored);
        // Validate that the stored team data is valid
        if (Array.isArray(team) && team.length > 0) {
          // Check if current user is in the stored team
          const hasCurrentUser = team.some((member) => member.login === self.login);
          if (!hasCurrentUser) {
            shouldFetchFromDatabase = true;
          }
        } else {
          shouldFetchFromDatabase = true;
        }
      } else {
        shouldFetchFromDatabase = true;
      }
    } catch {
      shouldFetchFromDatabase = true;
    }

    // Try to restore team from stored teams array if team is empty but we have activeTeamId
    if (team.length === 0) {
      const activeTeamId = localStorage.getItem('activeTeamId');
      const storedTeams = localStorage.getItem('teams');

      if (activeTeamId && storedTeams) {
        try {
          const teams = JSON.parse(storedTeams);
          if (Array.isArray(teams)) {
            // First, try to find the active team by ID
            const activeTeam = teams.find((t: TTeam) => t.id === activeTeamId);
            if (activeTeam && activeTeam.members && activeTeam.members.length > 0) {
              // Found the active team, restore its members
              team = activeTeam.members;
              shouldFetchFromDatabase = false;

              // Update localStorage with the restored team
              localStorage.setItem('team', JSON.stringify(team));

              // Also restore the teams array to Redux state
              dispatch(track.actions.setTeams(teams));
              dispatch(track.actions.setSelectedTeamId(activeTeamId));
            } else {
              // Active team not found or has no members, but we still have teams data
              // Don't fetch from database, just restore the teams structure
              dispatch(track.actions.setTeams(teams));
              dispatch(track.actions.setSelectedTeamId(activeTeamId));

              // Set team to empty array for now, let TeamFormManage handle the restoration
              team = [];
              shouldFetchFromDatabase = false;
            }
          }
        } catch (error) {
          console.error('Error parsing stored teams:', error);
        }
      }
    }

    // If we have valid team data, set it immediately
    if (team.length > 0 && !shouldFetchFromDatabase) {
      const sortedTeam = team
        .slice()
        .sort((a, b) => (a.display || '').localeCompare(b.display || '', undefined, { sensitivity: 'base' }));
      dispatch(track.actions.setTeam(sortedTeam));
    }

    // Fetch from database if needed
    if (shouldFetchFromDatabase) {
      fetch('/api/team', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': self?.uid?.toString() || '',
          'x-user-email': self?.email || '',
          'x-user-display': self?.display ? encodeURIComponent(self.display) : '',
        },
      })
        .then((res) => res.json())
        .then((data) => {
          let updateTeam: TYandexUser[] | undefined;
          let updateTeamId: string | undefined;

          if (Array.isArray(data.teams) && self) {
            // First, check if we have an active team ID from localStorage
            const activeTeamId = localStorage.getItem('activeTeamId');
            let activeTeam: TTeam | undefined;

            if (activeTeamId) {
              // Try to find the active team from the database response
              activeTeam = data.teams.find((teamG: TTeam) => teamG.id === activeTeamId);
            }

            if (activeTeam) {
              // Use the active team from database
              updateTeam = activeTeam.members;
              updateTeamId = activeTeam.id;
            } else {
              // Fallback: find team where creatorId matches current user
              const myTeam = data.teams.find((teamG: TTeam) => teamG.creatorId === self.uid.toString());
              if (myTeam) {
                updateTeam = myTeam.members;
                updateTeamId = myTeam.id;
              } else if (data.teams.length > 0) {
                // Last fallback: use members from the first team
                updateTeam = data.teams[0].members;
                updateTeamId = data.teams[0].id;
              }
            }
          } else if (Array.isArray(data.members)) {
            // Legacy/fallback: use members directly
            updateTeam = data.members;
          }

          if (updateTeam && updateTeam.length > 0) {
            localStorage.setItem('team', JSON.stringify(updateTeam));
            if (updateTeamId) {
              localStorage.setItem('teamId', updateTeamId);
              localStorage.setItem('activeTeamId', updateTeamId);
            }
            dispatch(track.actions.setTeam(updateTeam));

            // Also update the teams array in localStorage if we have it
            if (Array.isArray(data.teams)) {
              localStorage.setItem('teams', JSON.stringify(data.teams));
            }
          } else if (self) {
            // If no team found, create a team with just the current user
            const updatedTeam = [
              {
                uid: self.uid,
                display: self.display,
                email: self.email,
                login: self.login,
                position: self.position,
                lastLoginDate: self.lastLoginDate,
              },
            ];
            localStorage.setItem('team', JSON.stringify(updatedTeam));
            dispatch(track.actions.setTeam(updatedTeam));
          }
        })
        .catch((error) => {
          console.error('Error fetching team data:', error);
          // Fallback: create team with just current user if fetch fails
          if (self) {
            const fallbackTeam = [
              {
                uid: self.uid,
                display: self.display,
                email: self.email,
                login: self.login,
                position: self.position,
                lastLoginDate: self.lastLoginDate,
              },
            ];
            localStorage.setItem('team', JSON.stringify(fallbackTeam));
            dispatch(track.actions.setTeam(fallbackTeam));
          }
        });
    }
  }, [self, dispatch]);

  // OpenReplay Tracker initialization (only once)
  useEffect(() => {
    // Initialize tracker with environment variables if available
    if (envVariables) {
      initializeTracker({
        COMPANY_OPENREPLAY_KEY: envVariables.COMPANY_OPENREPLAY_KEY,
        COMPANY_OPENREPLAY_URL: envVariables.COMPANY_OPENREPLAY_URL,
      });
    } else {
      // Fallback: initialize without environment variables (will fetch from API)
      initializeTracker();
    }
  }, [envVariables]);

  // Set user ID for OpenReplay when self is available
  useEffect(() => {
    if (self) {
      setUserID(self?.display || self?.login || '');
    }
  }, [self]);
  const ldapCredentials = typeof window !== 'undefined' ? localStorage.getItem('ldapCredentials') : null;
  if (self && !ldapCredentials) {
    const credentials = {
      username: self.email,
      type: 'ldap',
    };
    localStorage.setItem('ldapCredentials', JSON.stringify(credentials));
    // Note: This only sets username, not token, so hasLdapCredentials should remain false
    // until user enters password in LdapLoginFormManage
  }

  const logout = useLogoutTracker(tracker);

  useSetTrackerUsername(tracker, self?.email);

  const unauthorizedErrorElement = useUnauthorizedTracker(
    errorSelf,
    tracker,
    logout,
    unauthorizedErrorShouldAppearAsOrgChange,
  );

  if (unauthorizedErrorElement) {
    return unauthorizedErrorElement;
  }

  if (errorSelf) {
    return <UserLoadFail />;
  }

  if (!tracker) {
    return null;
  }

  return (
    <Loading isLoading={isLoadingSelf}>
      <YandexTimesheet
        language={language}
        tracker={tracker}
        uId={uId}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        self={self as TYandexUser}
        currentMenuKey={currentMenuKey}
        onMenuChange={handleMenuChange}
      />
    </Loading>
  );
};
