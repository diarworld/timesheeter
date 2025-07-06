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

type TProps = {
  language: TCurrentLocale | undefined;
  tracker: TYandexTrackerConfig;
  // we need this prop only to preserve old UX for yandex tracker on index page
  unauthorizedErrorShouldAppearAsOrgChange: boolean;
};

export const YandexAuthorizedTimesheet = ({ language, tracker, unauthorizedErrorShouldAppearAsOrgChange }: TProps) => {
  const { userId, login } = useFilterValues();

  const { uId, isLoadingSelf, errorSelf, self } = useYandexUser(tracker, userId, login);
  
  const team: TYandexUser[] = JSON.parse(localStorage.getItem('team') || '[]');
  const ldapCredentials = localStorage.getItem('ldapCredentials');

  if (self && !team.some(e => e?.login === self?.login)) {
    localStorage.setItem('team', JSON.stringify([...team, self]))
  }

  if (self && !ldapCredentials) {
    const credentials = {
      username: self.email,
      type: 'ldap'
    };
    localStorage.setItem('ldapCredentials', JSON.stringify(credentials));
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
