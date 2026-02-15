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
  maxItems?: number,
  perPage?: number,
) => {
  const [search, setSearch, isDebouncingSearch] = useDebouncedState<string>('');
  const initialIssueKey = useInitialValue(value);

  const { currentData: issueList, isFetching: isFetchingIssues } = yandexIssueApi.useGetYandexIssuesQuery(
    { search, utcOffsetInMinutes: undefined, tracker, maxItems, perPage },
    { skip: !search },
  );
  const { currentData: initialIssue, isFetching: isFetchingIssue } = yandexIssueApi.useGetYandexIssueQuery(
    { issueIdOrKey: initialIssueKey ?? '', tracker },
    { skip: !initialIssueKey },
  );

  const foundIssuesAsOptions = useMemo(() => {
    if (!issueList) return emptyArray;

    const sortedIssues = sortIssuesBySearchPriority(issueList, search);
    return sortedIssues.map((issue) => getOptionFromIssue(issue, search));
  }, [issueList, search]);

  const initialIssueAsOptions = useMemo(
    () => (initialIssue ? [getOptionFromIssue(initialIssue)] : emptyArray),
    [initialIssue],
  );

  return {
    isFetching: isFetchingIssues || isFetchingIssue || isDebouncingSearch,
    options: search ? foundIssuesAsOptions : initialIssueAsOptions,
    onSearch: setSearch,
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

  const { currentData: pageData, isFetching: isFetchingPage } = yandexIssueApi.useGetYandexIssuesPageQuery(
    { search, utcOffsetInMinutes: undefined, tracker, perPage, page },
    { skip: !search },
  );

  useMemo(() => {
    if (pageData?.issues) {
      if (page === 1) {
        setAccumulatedIssues(pageData.issues);
      } else {
        setAccumulatedIssues((prev) => {
          const existingKeys = new Set(prev.map((i) => i.key));
          const newIssues = pageData.issues.filter((i) => !existingKeys.has(i.key));
          return [...prev, ...newIssues];
        });
      }
      setTotalPages(pageData.totalPages);
    }
  }, [pageData, page]);

  useMemo(() => {
    if (search) {
      setPage(1);
      setAccumulatedIssues([]);
    }
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

  const initialIssueAsOptions = useMemo(
    () => (initialIssue ? [getOptionFromIssue(initialIssue)] : emptyArray),
    [initialIssue],
  );

  const hasMore = page < totalPages;

  return {
    isFetching: isFetchingPage || isFetchingIssue || isDebouncingSearch,
    options: search ? foundIssuesAsOptions : initialIssueAsOptions,
    onSearch: setSearch,
    loadMore,
    hasMore,
    isLoadingMore: isFetchingPage,
  };
};
