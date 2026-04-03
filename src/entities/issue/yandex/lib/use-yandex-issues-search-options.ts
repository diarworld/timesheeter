import { useMemo, useState, useCallback } from 'react';

import { yandexIssueApi } from 'entities/issue/yandex/model/yandex-api';
import { useDebouncedState } from 'shared/lib/useDebouncedState';
import { TTrackerConfig } from 'entities/tracker/model/types';
import { TOption } from 'shared/lib/types';
import { getOptionFromIssue } from 'entities/issue/common/lib/get-option-from-issue';
import { TIssue } from 'entities/issue/common/model/types';

const emptyArray: TOption[] = [];

const sortIssuesBySearchPriority = (issues: TIssue[], searchTerm: string): TIssue[] => {
  if (!searchTerm) return issues;

  return [...issues].sort((a, b) => {
    const aKeyExactMatch = a.key.toLowerCase() === searchTerm.toLowerCase();
    const bKeyExactMatch = b.key.toLowerCase() === searchTerm.toLowerCase();

    if (aKeyExactMatch && !bKeyExactMatch) return -1;
    if (!aKeyExactMatch && bKeyExactMatch) return 1;

    return 0;
  });
};

export const useYandexIssuesSearchOptions = (
  tracker: TTrackerConfig,
  value: string | undefined,
  perPage: number = 40,
) => {
  const [search, setSearch, isDebouncingSearch] = useDebouncedState<string>('');
  const initialIssueKey = value;
  const isUserSearch = !search;

  const { currentData: searchPageData, isFetching: isFetchingSearch } = yandexIssueApi.useGetYandexIssuesPageQuery(
    { search, utcOffsetInMinutes: undefined, tracker, perPage, page: 1 },
    { skip: !search, refetchOnMountOrArgChange: true },
  );

  const { currentData: userPageData, isFetching: isFetchingUser } = yandexIssueApi.useGetYandexIssuesPageQuery(
    { search: undefined, myIssues: true, utcOffsetInMinutes: undefined, tracker, perPage, page: 1 },
    { skip: !!search, refetchOnMountOrArgChange: true },
  );

  const { currentData: initialIssue, isFetching: isFetchingIssue } = yandexIssueApi.useGetYandexIssueQuery(
    { issueIdOrKey: initialIssueKey ?? '', tracker },
    { skip: !initialIssueKey },
  );

  const searchIssuesAsOptions = useMemo(() => {
    if (!search || !searchPageData?.issues) return emptyArray;
    const sortedIssues = sortIssuesBySearchPriority(searchPageData.issues, search);
    return sortedIssues.map((issue) => getOptionFromIssue(issue, search));
  }, [searchPageData, search]);

  const userIssuesAsOptions = useMemo(() => {
    if (search) return emptyArray;
    if (userPageData?.issues) {
      return userPageData.issues.map((issue) => getOptionFromIssue(issue, ''));
    }
    return emptyArray;
  }, [search, userPageData]);

  const initialIssueAsOptions = useMemo(
    () => (initialIssue ? [getOptionFromIssue(initialIssue)] : emptyArray),
    [initialIssue],
  );

  const hasMore = false;

  const isLoadingUserIssues = isUserSearch && isFetchingUser;
  const isLoadingSearch = !!search && isFetchingSearch;

  return {
    isFetching: isFetchingSearch || isFetchingIssue || isDebouncingSearch || isLoadingUserIssues || isLoadingSearch,
    options: search ? searchIssuesAsOptions : isUserSearch ? userIssuesAsOptions : initialIssueAsOptions,
    onSearch: setSearch,
    loadMore: undefined,
    hasMore,
    isLoadingMore: false,
  };
};

export const useYandexIssuesSearchOptionsPaginated = (
  tracker: TTrackerConfig,
  value: string | undefined,
  perPage: number = 50,
) => {
  const [search, setSearch, isDebouncingSearch] = useDebouncedState<string>('');
  const [page, setPage] = useState(1);
  const initialIssueKey = value;
  const isUserSearch = !search;

  const { currentData: searchPageData, isFetching: isFetchingSearch } = yandexIssueApi.useGetYandexIssuesPageQuery(
    { search, utcOffsetInMinutes: undefined, tracker, perPage, page },
    { skip: !search, refetchOnMountOrArgChange: true },
  );

  const { currentData: userPageData, isFetching: isFetchingUser } = yandexIssueApi.useGetYandexIssuesPageQuery(
    { search: undefined, myIssues: true, utcOffsetInMinutes: undefined, tracker, perPage, page },
    { skip: !!search, refetchOnMountOrArgChange: true },
  );

  const { currentData: initialIssue, isFetching: isFetchingIssue } = yandexIssueApi.useGetYandexIssueQuery(
    { issueIdOrKey: initialIssueKey ?? '', tracker },
    { skip: !initialIssueKey },
  );

  const allIssues = useMemo(() => {
    if (!searchPageData?.issues) return [];
    return sortIssuesBySearchPriority(searchPageData.issues, search);
  }, [searchPageData, search]);

  const foundIssuesAsOptions = useMemo(() => {
    return allIssues.map((issue) => getOptionFromIssue(issue, search));
  }, [allIssues, search]);

  const userIssuesAsOptions = useMemo(() => {
    if (search) return emptyArray;
    if (userPageData?.issues) {
      return userPageData.issues.map((issue) => getOptionFromIssue(issue, ''));
    }
    return emptyArray;
  }, [search, userPageData]);

  const initialIssueAsOptions = useMemo(
    () => (initialIssue ? [getOptionFromIssue(initialIssue)] : emptyArray),
    [initialIssue],
  );

  const hasMore = searchPageData
    ? page < searchPageData.totalPages
    : userPageData
      ? page < userPageData.totalPages
      : false;

  const isLoadingUserIssues = isUserSearch && isFetchingUser;
  const isLoadingSearch = !!search && isFetchingSearch;

  const loadMore = useCallback(() => {
    if (searchPageData && page < searchPageData.totalPages) {
      setPage((p) => p + 1);
    }
  }, [page, searchPageData]);

  return {
    isFetching: isFetchingSearch || isFetchingIssue || isDebouncingSearch || isLoadingUserIssues || isLoadingSearch,
    options: search ? foundIssuesAsOptions : isUserSearch ? userIssuesAsOptions : initialIssueAsOptions,
    onSearch: setSearch,
    loadMore,
    hasMore,
    isLoadingMore: isFetchingSearch || isFetchingUser,
  };
};
