import { fetchAllPages, TFetchAllPagesBaseQueryResult } from 'shared/api';
import { api } from 'shared/api/api';
import { identity } from 'shared/lib/utils';
import { getTrackerHeaders } from 'entities/tracker/lib/getTrackerHeaders';
import { yandexUserEndpoints } from 'entities/user/yandex/model/endpoints';
import { YA_ROBOTS_IDS } from 'entities/user/yandex/model/constants';
import { TYandexUser } from 'entities/user/yandex/model/types';
import {
  TGetMyselfParams,
  TGetUserParams,
  TGetUserByLoginParams,
  TGetUsersParams,
} from 'entities/user/common/model/types';

export const yandexUserApi = api.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getYandexUserById: builder.query<TYandexUser, TGetUserParams>({
      query: ({ userId, tracker }) => ({
        url: yandexUserEndpoints.user(userId),
        headers: getTrackerHeaders(tracker),
        credentials: 'omit',
      }),
    }),
    getYandexUserByLogin: builder.query<TYandexUser, TGetUserByLoginParams>({
      query: ({ login, tracker }) => ({
        url: yandexUserEndpoints.login(login),
        headers: getTrackerHeaders(tracker),
        credentials: 'omit',
      }),
    }),
    getMyselfYandex: builder.query<TYandexUser, TGetMyselfParams>({
      query: ({ tracker }) => ({
        url: yandexUserEndpoints.myself,
        headers: getTrackerHeaders(tracker),
        credentials: 'omit',
      }),
    }),
    getYandexUsersList: builder.query<TYandexUser[], TGetUsersParams>({
      async queryFn({ tracker }, __, ___, fetchWithBQ) {
        const res = await fetchAllPages(
          (page) =>
            fetchWithBQ({
              url: yandexUserEndpoints.users,
              params: { page, perPage: 50 },
              headers: getTrackerHeaders(tracker),
              credentials: 'omit',
            }) as TFetchAllPagesBaseQueryResult<TYandexUser[]>,
          identity,
          undefined,
          50,
        );
        if (res.data) {
          res.data = res.data.filter((user: TYandexUser) => !user.dismissed && !YA_ROBOTS_IDS.has(user.uid));
        }

        return res;
      },
    }),
  }),
});
