import { YANDEX_TRACKER_API_ROOT } from 'shared/api/constants';

export const yandexUserEndpoints = {
  user: (userId: string) => `${YANDEX_TRACKER_API_ROOT}/users/${userId}`,
  login: (login: string) => `${YANDEX_TRACKER_API_ROOT}/users/login:${login}`,
  users: `${YANDEX_TRACKER_API_ROOT}/users`,
  myself: `${YANDEX_TRACKER_API_ROOT}/myself`,
};
