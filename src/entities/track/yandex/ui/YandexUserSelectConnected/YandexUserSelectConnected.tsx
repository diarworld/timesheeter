import { TYandexTrackerConfig } from 'entities/tracker/model/types';
import { UserSelect } from 'entities/track/common/ui/TrackCalendarHeader/UserSelect';
import { TYandexUser } from 'entities/user/yandex/model/types';
import { useYandexUser } from 'entities/user/yandex/hooks/use-yandex-user';
import type { DefaultOptionType } from 'rc-select/lib/Select';
import { useMemo, useState } from 'react';

type TProps = {
  tracker: TYandexTrackerConfig;
  userId: string | undefined;
  login: string | undefined;
};

export const YandexUserSelectConnected = ({ tracker, userId, login }: TProps) => {
  const [isUsersLoad, setIsUsersLoad] = useState(false);

  // const { isLoading, data: users } = yandexUserApi.useGetYandexUsersListQuery({ tracker }, { skip: !isUsersLoad });
  let users: TYandexUser[] = JSON.parse(localStorage.getItem('team') || '[]');
  // Sort by display field (case-insensitive)
  users = users
    .slice()
    .sort((a, b) => (a.display || '').localeCompare(b.display || '', undefined, { sensitivity: 'base' }));

  const { user } = useYandexUser(tracker, userId, login);

  const userOptions: DefaultOptionType[] = useMemo(() => {
    if (users?.length) {
      return users.map((u: TYandexUser) => ({ value: String(u.uid), label: u.display }));
    }
    return [{ value: String(user?.uid), label: user?.display }];
  }, [user, users]);

  return (
    <UserSelect
      allowClear={!!userId}
      userOptions={userOptions}
      isLoading={isUsersLoad}
      setShouldLoad={setIsUsersLoad}
      value={user?.display}
    />
  );
};
