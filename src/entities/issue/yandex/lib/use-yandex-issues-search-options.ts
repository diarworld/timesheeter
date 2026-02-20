import { useMemo, useState, useCallback } from 'react';

import { yandexIssueApi } from 'entities/issue/yandex/model/yandex-api';
import { useDebouncedState } from 'shared/lib/useDebouncedState';
import { useInitialValue } from 'shared/lib/useInitialValue';
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
  const [page, setPage] = useState(1);
  const [accumulatedIssues, setAccumulatedIssues] = useState<TIssue[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const initialIssueKey = useInitialValue(value);
  const isUserSearch = !search;

  const { currentData: searchPageData, isFetching: isFetchingSearch } = yandexIssueApi.useGetYandexIssuesPageQuery(
    { search, utcOffsetInMinutes: undefined, tracker, perPage, page },
    { skip: !search },
  );

  const { currentData: userPageData, isFetching: isFetchingUser } = yandexIssueApi.useGetYandexIssuesPageQuery(
    { search: undefined, myIssues: true, utcOffsetInMinutes: undefined, tracker, perPage, page },
    { skip: !!search },
  );

  useMemo(() => {
    if (search) {
      if (searchPageData?.issues) {
        if (page === 1) {
          setAccumulatedIssues(searchPageData.issues);
        } else {
          setAccumulatedIssues((prev) => {
            const existingKeys = new Set(prev.map((i) => i.key));
            const newIssues = searchPageData.issues.filter((i) => !existingKeys.has(i.key));
            return [...prev, ...newIssues];
          });
        }
        setTotalPages(searchPageData.totalPages);
      }
    } else if (userPageData?.issues) {
      if (page === 1) {
        setAccumulatedIssues(userPageData.issues);
      } else {
        setAccumulatedIssues((prev) => {
          const existingKeys = new Set(prev.map((i) => i.key));
          const newIssues = userPageData.issues.filter((i) => !existingKeys.has(i.key));
          return [...prev, ...newIssues];
        });
      }
      setTotalPages(userPageData.totalPages);
    }
  }, [search, page, searchPageData, userPageData]);

  useMemo(() => {
    setPage(1);
    setAccumulatedIssues([]);
  }, [search]);

  const { currentData: initialIssue, isFetching: isFetchingIssue } = yandexIssueApi.useGetYandexIssueQuery(
    { issueIdOrKey: initialIssueKey ?? '', tracker },
    { skip: !initialIssueKey },
  );

  const loadMore = useCallback(() => {
    if (page < totalPages) {
      setPage((p) => p + 1);
    }
  }, [page, totalPages]);

  const searchIssuesAsOptions = useMemo(() => {
    const issues = search ? accumulatedIssues : [];
    if (!issues.length) return emptyArray;
    const sortedIssues = sortIssuesBySearchPriority(issues, search);
    return sortedIssues.map((issue) => getOptionFromIssue(issue, search));
  }, [accumulatedIssues, search]);

  const userIssuesAsOptions = useMemo(() => {
    if (!accumulatedIssues.length || search) return emptyArray;
    console.warn('[useYandexIssuesSearchOptions] Loaded user issues', { count: accumulatedIssues.length });
    return accumulatedIssues.map((issue) => getOptionFromIssue(issue, ''));
  }, [accumulatedIssues, search]);

  const initialIssueAsOptions = useMemo(
    () => (initialIssue ? [getOptionFromIssue(initialIssue)] : emptyArray),
    [initialIssue],
  );

  const hasMore = page < totalPages;

  const isLoadingUserIssues = isUserSearch && isFetchingUser;
  const isLoadingSearch = !!search && isFetchingSearch;

  console.warn('[useYandexIssuesSearchOptions]', {
    search,
    isUserSearch,
    isLoadingUserIssues,
    isLoadingSearch,
    accumulatedIssuesCount: accumulatedIssues.length,
  });

  return {
    isFetching: isFetchingSearch || isFetchingIssue || isDebouncingSearch || isLoadingUserIssues || isLoadingSearch,
    options: search ? searchIssuesAsOptions : isUserSearch ? userIssuesAsOptions : initialIssueAsOptions,
    onSearch: setSearch,
    loadMore,
    hasMore,
    isLoadingMore: isFetchingSearch || isFetchingUser,
  };
};

export const useYandexIssuesSearchOptionsPaginated = (
  tracker: TTrackerConfig,
  value: string | undefined,
  perPage: number = 50,
) => {
  const [search, setSearch, isDebouncingSearch] = useDebouncedState<string>('');
  const [page, setPage] = useState(1);
  const [accumulatedIssues, setAccumulatedIssues] = useState<TIssue[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const initialIssueKey = useInitialValue(value);
  const isUserSearch = !search;

  const { currentData: searchPageData, isFetching: isFetchingSearch } = yandexIssueApi.useGetYandexIssuesPageQuery(
    { search, utcOffsetInMinutes: undefined, tracker, perPage, page },
    { skip: !search },
  );

  const { currentData: userPageData, isFetching: isFetchingUser } = yandexIssueApi.useGetYandexIssuesPageQuery(
    { search: undefined, myIssues: true, utcOffsetInMinutes: undefined, tracker, perPage, page },
    { skip: !!search },
  );

  useMemo(() => {
    if (search) {
      if (searchPageData?.issues) {
        if (page === 1) {
          setAccumulatedIssues(searchPageData.issues);
        } else {
          setAccumulatedIssues((prev) => {
            const existingKeys = new Set(prev.map((i) => i.key));
            const newIssues = searchPageData.issues.filter((i) => !existingKeys.has(i.key));
            return [...prev, ...newIssues];
          });
        }
        setTotalPages(searchPageData.totalPages);
      }
    } else if (userPageData?.issues) {
      if (page === 1) {
        setAccumulatedIssues(userPageData.issues);
      } else {
        setAccumulatedIssues((prev) => {
          const existingKeys = new Set(prev.map((i) => i.key));
          const newIssues = userPageData.issues.filter((i) => !existingKeys.has(i.key));
          return [...prev, ...newIssues];
        });
      }
      setTotalPages(userPageData.totalPages);
    }
  }, [search, page, searchPageData, userPageData]);

  useMemo(() => {
    setPage(1);
    setAccumulatedIssues([]);
  }, [search]);

  const { currentData: initialIssue, isFetching: isFetchingIssue } = yandexIssueApi.useGetYandexIssueQuery(
    { issueIdOrKey: initialIssueKey ?? '', tracker },
    { skip: !initialIssueKey },
  );

  const loadMore = useCallback(() => {
    if (page < totalPages) {
      setPage((p) => p + 1);
    }
  }, [page, totalPages]);

  const allIssues = useMemo(() => {
    if (!accumulatedIssues.length) return [];
    return sortIssuesBySearchPriority(accumulatedIssues, search);
  }, [accumulatedIssues, search]);

  const foundIssuesAsOptions = useMemo(() => {
    return allIssues.map((issue) => getOptionFromIssue(issue, search));
  }, [allIssues, search]);

  const userIssuesAsOptions = useMemo(() => {
    if (!accumulatedIssues.length) return emptyArray;
    console.warn('[useYandexIssuesSearchOptionsPaginated] Loaded user issues', { count: accumulatedIssues.length });
    return accumulatedIssues.map((issue) => getOptionFromIssue(issue, ''));
  }, [accumulatedIssues]);

  const initialIssueAsOptions = useMemo(
    () => (initialIssue ? [getOptionFromIssue(initialIssue)] : emptyArray),
    [initialIssue],
  );

  const hasMore = page < totalPages;

  const isLoadingUserIssues = isUserSearch && isFetchingUser;
  const isLoadingSearch = !!search && isFetchingSearch;

  console.warn('[useYandexIssuesSearchOptionsPaginated]', {
    search,
    isUserSearch,
    isLoadingUserIssues,
    isLoadingSearch,
  });

  return {
    isFetching: isFetchingSearch || isFetchingIssue || isDebouncingSearch || isLoadingUserIssues || isLoadingSearch,
    options: search ? foundIssuesAsOptions : isUserSearch ? userIssuesAsOptions : initialIssueAsOptions,
    onSearch: setSearch,
    loadMore,
    hasMore,
    isLoadingMore: isFetchingSearch || isFetchingUser,
  };
};
