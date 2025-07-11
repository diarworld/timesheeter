import { useAppSelector } from 'shared/lib/hooks';
import { FetchBaseQueryError, FetchBaseQueryMeta } from '@reduxjs/toolkit/query';
import type { QueryReturnValue } from '@reduxjs/toolkit/src/query/baseQueryTypes';
import { api } from './api';

export function getTotalPagesYandex<T>(result: QueryReturnValue<T, FetchBaseQueryError, FetchBaseQueryMeta>): number {
  if (!result?.meta?.response) return 1;
  return parseInt(result.meta.response.headers.get('X-Total-Pages') ?? '1', 10);
}

export function getTotalPagesJira<T extends { total: number; maxResults: number }>(
  result: QueryReturnValue<T, FetchBaseQueryError, FetchBaseQueryMeta>,
): number {
  if (!result?.data) return 1;

  const { total, maxResults } = result.data;

  if (total === undefined || !maxResults === undefined) return 1;

  return Math.ceil(total / maxResults);
}

export function useGlobalLoader() {
  return useAppSelector<{ api: ReturnType<typeof api.reducer> }, boolean>((state) => {
    const apiState = state[api.reducerPath];
    return Object.values(apiState.queries).some((query) => query?.status === 'pending');
  });
}

export type TFetchAllPagesBaseQueryResult<T> = Promise<QueryReturnValue<T, FetchBaseQueryError, FetchBaseQueryMeta>>;

type TListAccessor<TPage, TResult> = (page: TPage) => TResult;

type TPagesCountAccessor<TPage> = (result: QueryReturnValue<TPage, FetchBaseQueryError, FetchBaseQueryMeta>) => number;

export async function fetchAllPages<TPage, TResult>(
  fetcher: (page: number) => TFetchAllPagesBaseQueryResult<TPage>,
  accessor: TListAccessor<TPage, TResult[]>,
  getTotalPagesCount: TPagesCountAccessor<TPage> = getTotalPagesYandex,
  maxItems?: number,
) {
  const reqFetch = async (
    page: number,
    accumulated: TResult[] = [],
  ): Promise<QueryReturnValue<TResult[], FetchBaseQueryError, FetchBaseQueryMeta>> => {
    if (maxItems !== undefined && accumulated.length >= maxItems) {
      return { data: accumulated.slice(0, maxItems) };
    }
    const result = await fetcher(page);
    if (result.error) return { error: result.error };
    const totalPages = getTotalPagesCount(result);
    const currentData = accessor(result.data);
    const newAccumulated = accumulated.concat(currentData);
    if (maxItems !== undefined && newAccumulated.length >= maxItems) {
      return { data: newAccumulated.slice(0, maxItems) };
    }
    if (page >= totalPages) {
      return { data: newAccumulated };
    }
    return reqFetch(page + 1, newAccumulated);
  };
  const res = await reqFetch(1);
  return res;
}
