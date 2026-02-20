import { useMemo } from 'react';
import { useDebouncedState } from 'shared/lib/useDebouncedState';
import { useInitialValue } from 'shared/lib/useInitialValue';
import { TTrackerConfig } from 'entities/tracker/model/types';
import { TOption } from 'shared/lib/types';
import { getOptionFromIssue } from 'entities/issue/common/lib/get-option-from-issue';
import { jiraIssueApi } from 'entities/issue/jira/model/jira-api';
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

export const useJiraIssuesSearchOptions = (tracker: TTrackerConfig, value: string | undefined) => {
  const [search, setSearch, isDebouncingSearch] = useDebouncedState('');
  const initialIssueKey = useInitialValue(value);
  const isUserSearch = !search;

  const { currentData: searchIssues, isFetching: isFetchingSearch } = jiraIssueApi.useGetJiraIssuesQuery(
    { search, utcOffsetInMinutes: undefined, tracker },
    { skip: !search },
  );

  const { currentData: userIssues, isFetching: isFetchingUser } = jiraIssueApi.useGetJiraIssuesQuery(
    { search: undefined, myIssues: true, utcOffsetInMinutes: undefined, tracker },
    { skip: !!search },
  );

  const { currentData: initialIssue, isFetching: isFetchingIssue } = jiraIssueApi.useGetJiraIssueQuery(
    { issueIdOrKey: initialIssueKey ?? '', tracker },
    { skip: !initialIssueKey },
  );

  const searchIssuesAsOptions = useMemo(() => {
    if (!searchIssues) return emptyArray;

    const sortedIssues = sortIssuesBySearchPriority(searchIssues, search);
    return sortedIssues.map((issue) => getOptionFromIssue(issue, search));
  }, [searchIssues, search]);

  const userIssuesAsOptions = useMemo(() => {
    if (!userIssues) return emptyArray;
    console.warn('[useJiraIssuesSearchOptions] Loaded user issues', { count: userIssues.length });
    return userIssues.map((issue) => getOptionFromIssue(issue, ''));
  }, [userIssues]);

  const initialIssueAsOptions = useMemo(
    () => (initialIssue ? [getOptionFromIssue(initialIssue)] : emptyArray),
    [initialIssue],
  );

  const isLoadingUserIssues = isUserSearch && isFetchingUser;
  const isLoadingSearch = !!search && isFetchingSearch;

  console.warn('[useJiraIssuesSearchOptions]', {
    search,
    isUserSearch,
    isLoadingUserIssues,
    isLoadingSearch,
    userIssuesCount: userIssues?.length ?? 0,
  });

  return {
    isFetching: isFetchingIssue || isDebouncingSearch || isLoadingUserIssues || isLoadingSearch,
    options: search ? searchIssuesAsOptions : isUserSearch ? userIssuesAsOptions : initialIssueAsOptions,
    onSearch: setSearch,
  };
};
