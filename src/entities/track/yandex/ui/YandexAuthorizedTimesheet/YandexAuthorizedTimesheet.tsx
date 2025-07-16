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
import { useEffect } from 'react';

type TProps = {
  language: TCurrentLocale | undefined;
  tracker: TYandexTrackerConfig;
  // we need this prop only to preserve old UX for yandex tracker on index page
  unauthorizedErrorShouldAppearAsOrgChange: boolean;
};

export const YandexAuthorizedTimesheet = ({ language, tracker, unauthorizedErrorShouldAppearAsOrgChange }: TProps) => {
  const { userId, login } = useFilterValues();
  const dispatch = useAppDispatch();

  const { uId, isLoadingSelf, errorSelf, self } = useYandexUser(tracker, userId, login);
  useEffect(() => {
    if (self) {
      // Call your backend API to upsert the user
      fetch('/api/upsert-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: self.uid.toString(),
          email: self.email,
          display: self.display,
          position: self.position,
        }),
      });
    }
  }, [self]);
  let team: TYandexUser[] = JSON.parse(localStorage.getItem('team') || '[]');
  // Sort by display field (case-insensitive)
  team = team
    .slice()
    .sort((a, b) => (a.display || '').localeCompare(b.display || '', undefined, { sensitivity: 'base' }));
  const ldapCredentials = localStorage.getItem('ldapCredentials');

  // Update team in Redux when self is available and not in team
  useEffect(() => {
    if (self && !team.some((e) => e?.login === self?.login)) {
      const updatedTeam = [...team, self]
        .slice()
        .sort((a, b) => (a.display || '').localeCompare(b.display || '', undefined, { sensitivity: 'base' }));
      localStorage.setItem('team', JSON.stringify(updatedTeam));
      dispatch(track.actions.setTeam(updatedTeam));
    }
  }, [self, team, dispatch]);

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
      <YandexTimesheet language={language} tracker={tracker} uId={uId} />
    </Loading>
  );
};
