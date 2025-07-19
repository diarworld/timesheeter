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
import { useEffect, useRef } from 'react';
import Tracker from '@openreplay/tracker';
import trackerAssist from '@openreplay/tracker-assist';

type TProps = {
  language: TCurrentLocale | undefined;
  tracker: TYandexTrackerConfig;
  // we need this prop only to preserve old UX for yandex tracker on index page
  unauthorizedErrorShouldAppearAsOrgChange: boolean;
  isDarkMode: boolean;
  setIsDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
};

export const YandexAuthorizedTimesheet = ({ language, tracker, unauthorizedErrorShouldAppearAsOrgChange, isDarkMode, setIsDarkMode }: TProps) => {
  const { userId, login } = useFilterValues();
  const dispatch = useAppDispatch();

  const { uId, isLoadingSelf, errorSelf, self } = useYandexUser(tracker, userId, login);
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
  useEffect(() => {
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
          team = data.members;
          // console.log('team', team);
          const updateTeam = data.team?.members;
          if (updateTeam) {
            localStorage.setItem('team', JSON.stringify(updateTeam));
            localStorage.setItem('teamId', data.team?.id);
            dispatch(track.actions.setTeam(updateTeam));
          } else {
            // console.log('self', self);
            // console.log('team', team);
            // console.log('team?.some((e) => e?.login === self?.login)', team?.some((e) => e?.login === self?.login));
            if (self && !team?.some((e) => e?.login === self?.login)) {
              const updatedTeam = [...(Array.isArray(team) ? team : []), {uid: self.uid, display: self.display, email: self.email, login: self.login, position: self.position, lastLoginDate: self.lastLoginDate}]
                .slice()
                .sort((a, b) => (a.display || '').localeCompare(b.display || '', undefined, { sensitivity: 'base' }));
              localStorage.setItem('team', JSON.stringify(updatedTeam));
              dispatch(track.actions.setTeam(updatedTeam));
            }
          }
        });
    } else if (team.length > 1 && self) {
      // console.log('syncing team to db');
      // console.log('team', team);
      syncTeamToDb(team, self);
    }
  }, [team, self]);

  // Update team in Redux when self is available and not in team
  // useEffect(() => {
  //   if (self && !team.some((e) => e?.login === self?.login)) {
  //     const updatedTeam = [...team, self]
  //     .slice()
  //     .sort((a, b) => (a.display || '').localeCompare(b.display || '', undefined, { sensitivity: 'base' }));
  //     localStorage.setItem('team', JSON.stringify(updatedTeam));
  //     dispatch(track.actions.setTeam(updatedTeam));
  //   }
  // }, [self, team, dispatch]);
  // OpenReplay Tracker initialization (only once)
  const trackerRef = useRef<Tracker | null>(null);
  useEffect(() => {
    if (!trackerRef.current) {
      const trackerOpenReplay = new Tracker({
        projectKey: "k5BEz4HNHVUqjAXHNC2t",
        ingestPoint: "https://openreplay.apps.data.lmru.tech/ingest",
      });
      trackerOpenReplay.use(trackerAssist());
      trackerOpenReplay.start();
      trackerRef.current = trackerOpenReplay;
    }
  }, []);

  // Set user ID for OpenReplay when self is available
  useEffect(() => {
    if (self && trackerRef.current) {
      trackerRef.current.setUserID(self?.uid?.toString() || '');
    }
  }, [self]);

  const ldapCredentials = localStorage.getItem('ldapCredentials');
  
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
      <YandexTimesheet language={language} tracker={tracker} uId={uId} isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
    </Loading>
  );
};
