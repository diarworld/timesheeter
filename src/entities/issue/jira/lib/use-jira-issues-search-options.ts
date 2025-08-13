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

  const { currentData: issueList, isFetching: isFetchingIssues } = jiraIssueApi.useGetJiraIssuesQuery(
    { search, utcOffsetInMinutes: undefined, tracker },
    { skip: !search },
  );
  const { currentData: initialIssue, isFetching: isFetchingIssue } = jiraIssueApi.useGetJiraIssueQuery(
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
