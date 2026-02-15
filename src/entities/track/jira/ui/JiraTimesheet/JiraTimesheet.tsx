import React, { FC, useCallback, useMemo, useState } from 'react';
import { usePinnedIssues } from 'entities/issue/common/lib/use-pinned-issues';
import { TrackCalendar } from 'entities/track/common/ui/TrackCalendar/TrackCalendar';
import { jiraIssueApi } from 'entities/issue/jira/model/jira-api';
import { TJiraTrackerConfig } from 'entities/tracker/model/types';
import { JiraTrackCalendarRowConnected } from 'entities/track/jira/ui/JiraTrackCalendarRowConnected/JiraTrackCalendarRowConnected';
import { jiraTrackApi } from 'entities/track/jira/model/jira-api';
import { JiraTrackCalendarFootConnected } from 'entities/track/jira/ui/JiraTrackCalendarFootConnected/JiraTrackCalendarFootConnected';
import { TrackCalendarHeader } from 'entities/track/common/ui/TrackCalendarHeader/TrackCalendarHeader';
import { useDeleteJiraTrack } from 'entities/track/jira/lib/hooks/use-delete-jira-track';
import { useUpdateJiraTrack } from 'entities/track/jira/lib/hooks/use-update-jira-track';
import { jiraProjectApi } from 'entities/queue/jira/jira-api';
import { TCurrentLocale } from 'entities/locale/model/types';
import { useFilters } from 'features/filters/lib/useFilters';
import { JiraUserSelectConnected } from 'entities/track/jira/ui/JiraUserSelectConnected/JiraUserSelectConnected';
import { JiraIssueStatusSelectConnected } from 'entities/issue/jira/ui/JiraIssueStatusSelectConnected/JiraIssueStatusSelectConnected';
import { QueueSelect } from 'entities/queue/common/ui/QueueSelect/QueueSelect';
import { IssueSummarySearch } from 'entities/issue/common/ui/IssueSummarySearch/IssueSummarySearch';
import { JIRA_ISSUE_SORTING_KEY } from 'entities/issue/jira/model/constants';
import { sortWithPinedIssues } from 'entities/issue/common/lib/sortWithPinedIssues';

type TProps = {
  language: TCurrentLocale | undefined;
  tracker: TJiraTrackerConfig;
  uId: string | undefined;
};

export const JiraTimesheet: FC<TProps> = ({ tracker, language, uId }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  // due to how issues and worklogs are loaded from jira, we have to include issue keys for all created tracks here in order
  // to always load issue for the track.
  // otherwise in case user creates track for an issue that hasn't been loaded yet, it wouldn't be loaded
  const [createdTrackIssueKeys] = useState<string[]>([]);

  const {
    from,
    to,
    fromTimestamp,
    toTimestamp,
    showWeekends,
    utcOffsetInMinutes,
    queue,
    summary,
    userId: userIdFromFilter,
    issueStatus,
    updateIssueStatus,
    updateSummary,
    updateQueue,
    sorting,
  } = useFilters();

  const { pinnedIssues, pinIssue, unpinIssue } = usePinnedIssues(tracker.url);

  const includeIssues = useMemo(
    () => Array.from(new Set([...pinnedIssues, ...createdTrackIssueKeys])),
    [pinnedIssues, createdTrackIssueKeys],
  );

  const { currentData: issues } = jiraIssueApi.useGetJiraIssuesQuery(
    {
      from,
      to,
      queue,
      utcOffsetInMinutes,
      summary,
      user: uId ?? '',
      statusList: issueStatus,
      includeIssues,
      sortBy: sorting.sortBy ?? JIRA_ISSUE_SORTING_KEY,
      sortOrder: sorting.sortOrder,
      tracker,
    },
    { skip: !uId },
  );

  const sortedIssues = useMemo(() => issues?.toSorted(sortWithPinedIssues(pinnedIssues)) ?? [], [issues, pinnedIssues]);

  const issueKeyList = useMemo(() => sortedIssues?.map((i) => i.key) ?? [], [sortedIssues]);

  const { currentData: tracks } = jiraTrackApi.useGetJiraTracksQuery(
    {
      from,
      to,
      fromTimestamp,
      toTimestamp,
      issueKeyList,
      utcOffsetInMinutes,
      tracker,
      userId: uId ?? '',
    },
    { skip: issueKeyList.length === 0 || !uId },
  );

  const { currentData: queueList, isFetching: isFetchingQueueList } = jiraProjectApi.useGetProjectsQuery({ tracker });

  const { updateTrack } = useUpdateJiraTrack(tracker);
  const { deleteTrack } = useDeleteJiraTrack(tracker);

  const getIssueUrl = useCallback((issueKey: string) => new URL(`/browse/${issueKey}`, tracker.url).href, [tracker]);

  const handleMenuChange = useCallback((_key: string): void => {
    // Menu change functionality not implemented yet
  }, []);

  const viewingAnotherUser = !!userIdFromFilter;
  const isEdit = !viewingAnotherUser;

  return (
    <div>
      <TrackCalendarHeader
        tracker={tracker}
        isEdit={isEdit}
        filters={
          <>
            <JiraUserSelectConnected tracker={tracker} userId={userIdFromFilter} />
            <JiraIssueStatusSelectConnected
              tracker={tracker}
              value={issueStatus}
              language={language}
              onChange={updateIssueStatus}
            />
            <QueueSelect
              value={queue}
              onChange={updateQueue}
              queueList={queueList}
              isFetchingQueueList={isFetchingQueueList}
            />
            <IssueSummarySearch defaultValue={summary} onSearch={updateSummary} />
          </>
        }
        currentMenuKey=""
        onMenuChange={handleMenuChange}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
      />
      <TrackCalendar
        isDarkMode={isDarkMode}
        isEdit={isEdit}
        from={from}
        to={to}
        showWeekends={showWeekends}
        utcOffsetInMinutes={utcOffsetInMinutes}
        issueSortingKey={JIRA_ISSUE_SORTING_KEY}
        issues={sortedIssues}
        pinnedIssues={pinnedIssues}
        pinIssue={pinIssue}
        unpinIssue={unpinIssue}
        deleteTrack={deleteTrack}
        renderTrackCalendarRowConnected={(props) => (
          <JiraTrackCalendarRowConnected
            {...props}
            isEditTrackComment={false}
            tracks={tracks}
            updateTrack={updateTrack}
            getIssueUrl={getIssueUrl}
            isDarkMode={isDarkMode}
          />
        )}
        renderTrackCalendarFootConnected={(props) => (
          <JiraTrackCalendarFootConnected {...props} tracks={tracks} isDarkMode={isDarkMode} />
        )}
      />
    </div>
  );
};
