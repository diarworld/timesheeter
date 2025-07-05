import { yandexUserApi } from 'entities/user/yandex/model/yandex-api';
import { TTrackerConfig } from 'entities/tracker/model/types';

export function useYandexUser(tracker: TTrackerConfig, id?: string, login?: string) {
  const { data: self, isLoading: isLoadingSelf, error: errorSelf } = yandexUserApi.useGetMyselfYandexQuery({ tracker });

  const { data: otherUserById } = yandexUserApi.useGetYandexUserByIdQuery({ userId: id ?? '', tracker }, { skip: !id });

  const { data: otherUserByLogin } = yandexUserApi.useGetYandexUserByLoginQuery({ login: login ?? '', tracker }, { skip: !login });

  const otherUser = id ? otherUserById : otherUserByLogin;

  const user = id ? otherUser : self;

  return { user, uId: user?.uid, isLoadingSelf, errorSelf, self };
}
