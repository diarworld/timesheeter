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
import { syncTeamToDb } from 'entities/track/common/lib/sync-team';

import { TYandexUser } from 'entities/user/yandex/model/types';
import { useAppDispatch } from 'shared/lib/hooks';
import { track } from 'entities/track/common/model/reducers';
import { useEffect, useState, useRef } from 'react';
import Tracker from '@openreplay/tracker';
import trackerAssist from '@openreplay/tracker-assist';
import { TTeam } from 'entities/track/common/ui/TeamFormManage/types';
import { useRouter } from 'next/router';

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
    let team: TYandexUser[] = [];
    try {
      const stored = localStorage.getItem('team');
      team = stored ? JSON.parse(stored) : [];
    } catch {
      team = [];
    }
    // Sort by display field (case-insensitive)
    team = team
      .slice()
      .sort((a, b) => (a.display || '').localeCompare(b.display || '', undefined, { sensitivity: 'base' }));
    if (team.length <= 1 && self) {
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
            // Find team where creatorId matches current user
            const myTeam = data.teams.find((teamG: TTeam) => teamG.creatorId === self.uid.toString());
            if (myTeam) {
              updateTeam = myTeam.members;
              updateTeamId = myTeam.id;
            } else if (data.teams.length > 0) {
              // Fallback: use members from the first team
              updateTeam = data.teams[0].members;
              // updateTeamId = data.teams[0].id;
            }
          } else if (Array.isArray(data.members)) {
            // Legacy/fallback: use members directly
            updateTeam = data.members;
          }

          if (updateTeam) {
            localStorage.setItem('team', JSON.stringify(updateTeam));
            if (updateTeamId) {
              localStorage.setItem('teamId', updateTeamId);
            }
            dispatch(track.actions.setTeam(updateTeam));
          } else if (self && !team?.some((e) => e?.login === self?.login)) {
            // Refactored to avoid lonely if
            const updatedTeam = [
              ...(Array.isArray(team) ? team : []),
              {
                uid: self.uid,
                display: self.display,
                email: self.email,
                login: self.login,
                position: self.position,
                lastLoginDate: self.lastLoginDate,
              },
            ]
              .slice()
              .sort((a, b) => (a.display || '').localeCompare(b.display || '', undefined, { sensitivity: 'base' }));
            localStorage.setItem('team', JSON.stringify(updatedTeam));
            dispatch(track.actions.setTeam(updatedTeam));
          }
        });
    } else if (team.length > 1 && self) {
      syncTeamToDb(team, self);
    }
  }, [self, dispatch]);

  // OpenReplay Tracker initialization (only once)
  const trackerRef = useRef<Tracker | null>(null);
  useEffect(() => {
    if (!trackerRef.current) {
      const trackerOpenReplay = new Tracker({
        projectKey: process.env.COMPANY_OPENREPLAY_KEY,
        ingestPoint: process.env.COMPANY_OPENREPLAY_URL,
      });
      trackerOpenReplay.use(trackerAssist());
      trackerOpenReplay.start();
      trackerRef.current = trackerOpenReplay;
    }
  }, []);

  // Set user ID for OpenReplay when self is available
  useEffect(() => {
    if (self && trackerRef.current) {
      trackerRef.current.setUserID(self?.display || self?.login || '');
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
