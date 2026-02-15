import { api, fetchAllPages, TFetchAllPagesBaseQueryResult } from 'shared/api';
import { createYandexIssueRequest } from 'entities/issue/yandex/model/createYandexIssueRequest';
import { TYandexIssue } from 'entities/issue/yandex/model/types';
import { identity } from 'shared/lib/utils';
import { getTrackerHeaders } from 'entities/tracker/lib/getTrackerHeaders';
import { yandexIssueEndpoints } from 'entities/issue/yandex/model/endpoints';
import {
  TGetIssueParams,
  TGetIssuesParams,
  TGetIssuesStatusesQuery,
  TIssueStatusDescription,
} from 'entities/issue/common/model/types';

export const yandexIssueApi = api.injectEndpoints({
  overrideExisting: true,
  endpoints: (build) => ({
    getYandexIssue: build.query<TYandexIssue, TGetIssueParams>({
      query: ({ issueIdOrKey, tracker }) => ({
        url: yandexIssueEndpoints.issue(issueIdOrKey),
        headers: getTrackerHeaders(tracker),
        credentials: 'omit',
      }),
    }),
    getYandexIssues: build.query<TYandexIssue[], TGetIssuesParams>({
      async queryFn(arg, _, __, fetchWithBQ) {
        return fetchAllPages(
          (page) =>
            fetchWithBQ({
              url: yandexIssueEndpoints.issues,
              method: 'POST',
              body: createYandexIssueRequest(arg),
              params: { page, perPage: arg.perPage ?? 50 },
              headers: getTrackerHeaders(arg.tracker, {
                // if we don't send this header, Yandex Tracker will always respond with russian status names
                'Accept-language': arg.language ?? undefined,
              }),
              credentials: 'omit',
            }) as TFetchAllPagesBaseQueryResult<TYandexIssue[]>,
          identity,
          undefined,
          arg.maxItems ?? 300, // Use arg.maxItems if provided, else default to 300
        );
      },
    }),
    getYandexIssuesPage: build.query<
      { issues: TYandexIssue[]; totalPages: number },
      TGetIssuesParams & { page: number }
    >({
      async queryFn(arg, _, __, fetchWithBQ) {
        const result = await fetchWithBQ({
          url: yandexIssueEndpoints.issues,
          method: 'POST',
          body: createYandexIssueRequest(arg),
          params: { page: arg.page, perPage: arg.perPage ?? 50 },
          headers: getTrackerHeaders(arg.tracker, {
            'Accept-language': arg.language ?? undefined,
          }),
          credentials: 'omit',
        });

        if (result.error) return { error: result.error };

        const totalPages = parseInt(result.meta?.response?.headers.get('X-Total-Pages') ?? '1', 10);
        return { data: { issues: (result.data as TYandexIssue[]) ?? [], totalPages } };
      },
    }),
    getYandexStatuses: build.query<TIssueStatusDescription[], TGetIssuesStatusesQuery>({
      async queryFn(arg, _, __, fetchWithBQ) {
        return fetchAllPages(
          (page) =>
            fetchWithBQ({
              url: yandexIssueEndpoints.statuses,
              params: { page, perPage: 100 },
              headers: getTrackerHeaders(arg.tracker, {
                // if we don't send this header, Yandex Tracker will always respond with russian status names
                'Accept-language': arg.language ?? undefined,
              }),
              credentials: 'omit',
            }) as TFetchAllPagesBaseQueryResult<TIssueStatusDescription[]>,
          identity,
          undefined,
          300,
        );
      },
    }),
  }),
});
