import { useMemo } from 'react';

import { yandexIssueApi } from 'entities/issue/yandex/model/yandex-api';
import { useDebouncedState } from 'shared/lib/useDebouncedState';
import { TTrackerConfig } from 'entities/tracker/model/types';
import { TOption } from 'shared/lib/types';
import { getOptionFromIssue } from 'entities/issue/common/lib/get-option-from-issue';
import { TIssue } from 'entities/issue/common/model/types';

const emptyArray: TOption[] = [];

// Sort issues to prioritize exact key matches
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
    { skip: !search },
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
  }, [search, searchPageData]);

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

  const isLoadingUserIssues = isUserSearch && isFetchingUser;
  const isLoadingSearch = !!search && isFetchingSearch;

  return {
    isFetching: isFetchingSearch || isFetchingIssue || isDebouncingSearch || isLoadingUserIssues || isLoadingSearch,
    options: search ? searchIssuesAsOptions : isUserSearch ? userIssuesAsOptions : initialIssueAsOptions,
    onSearch: setSearch,
    loadMore: undefined,
    hasMore: false,
    isLoadingMore: isFetchingSearch || isFetchingUser,
  };
};

export const useYandexIssuesSearchOptionsPaginated = (
  tracker: TTrackerConfig,
  value: string | undefined,
  perPage: number = 50,
) => {
  const [search, setSearch, isDebouncingSearch] = useDebouncedState<string>('');
  const initialIssueKey = value;
  const isUserSearch = !search;

  const { currentData: searchPageData, isFetching: isFetchingSearch } = yandexIssueApi.useGetYandexIssuesPageQuery(
    { search, utcOffsetInMinutes: undefined, tracker, perPage, page: 1 },
    { skip: !search },
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
  }, [search, searchPageData]);

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

  const isLoadingUserIssues = isUserSearch && isFetchingUser;
  const isLoadingSearch = !!search && isFetchingSearch;

  return {
    isFetching: isFetchingSearch || isFetchingIssue || isDebouncingSearch || isLoadingUserIssues || isLoadingSearch,
    options: search ? searchIssuesAsOptions : isUserSearch ? userIssuesAsOptions : initialIssueAsOptions,
    onSearch: setSearch,
    loadMore: undefined,
    hasMore: false,
    isLoadingMore: isFetchingSearch || isFetchingUser,
  };
};
