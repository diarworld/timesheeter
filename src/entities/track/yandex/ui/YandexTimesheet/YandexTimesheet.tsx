import React, { FC, useCallback, useState, useEffect, useLayoutEffect, useRef, useMemo } from 'react';
import { useIssuesList } from 'entities/issue/yandex/lib/use-issues-list';
import { usePinnedIssues } from 'entities/issue/common/lib/use-pinned-issues';

import { yandexTrackApi } from 'entities/track/yandex/model/yandex-api';
import { TCurrentLocale } from 'entities/locale/model/types';
import { TrackCalendar } from 'entities/track/common/ui/TrackCalendar/TrackCalendar';
import { YandexTrackCalendarRowConnected } from 'entities/track/yandex/ui/YandexTrackCalendarRowConnected';
import { YandexTrackCalendarFootConnected } from 'entities/track/yandex/ui/YandexTrackCalendarFootConnected/YandexTrackCalendarFootConnected';
import { TrackCalendarHeader } from 'entities/track/common/ui/TrackCalendarHeader/TrackCalendarHeader';
import { TYandexTrackerConfig } from 'entities/tracker/model/types';
import { useUpdateYandexTrack } from 'entities/track/yandex/lib/hooks/use-update-yandex-track';
import { useCreateYandexTrack } from 'entities/track/yandex/lib/hooks/use-create-yandex-track';
import { useDeleteYandexTrack } from 'entities/track/yandex/lib/hooks/use-delete-yandex-track';
import { YandexIssueTracksConnected } from 'entities/track/yandex/ui/YandexIssueTracksConnected/YandexIssueTracksConnected';
import { YandexIssuesSearchConnected } from 'entities/track/yandex/ui/YandexIssuesSearchConnected/YandexIssuesSearchConnected';
import { yandexQueueApi } from 'entities/queue/yandex/model/yandex-api';
import { useFilters } from 'features/filters/lib/useFilters';
import { YandexUserSelectConnected } from 'entities/track/yandex/ui/YandexUserSelectConnected/YandexUserSelectConnected';
import { YandexIssueStatusSelectConnected } from 'entities/issue/yandex/ui/YandexIssueStatusSelectConnected/YandexIssueStatusSelectConnected';
import { QueueSelect } from 'entities/queue/common/ui/QueueSelect/QueueSelect';
import { IssueSummarySearch } from 'entities/issue/common/ui/IssueSummarySearch/IssueSummarySearch';
import { Spin } from 'antd';
import { YANDEX_ISSUE_SORTING_KEY } from 'entities/issue/yandex/model/constants';
import { useDispatch } from 'react-redux';
import { TTransformedTracksByUser, TTrack } from 'entities/track/common/model/types';
import { TeamModalCreate } from 'entities/track/common/ui/TeamModalCreate';
import { LdapLoginModalCreate } from 'entities/track/common/ui/LdapLoginModalCreate';
import { DateWrapper } from 'features/date/lib/DateWrapper';

import { useAppSelector } from 'shared/lib/hooks';
import { track } from 'entities/track/common/model/reducers';
import dayjs from 'dayjs';

import { MonthCalendar } from 'entities/track/common/ui/MonthCalendar/MonthCalendar';
import { TrackModalCreate } from 'entities/track/common/ui/TrackModalCreate/TrackModalCreate';
import { TYandexUser } from 'entities/user/yandex/model/types';
import { ReportsTable } from './ReportsTable';
import { Select, Space } from 'antd';
import { Typography } from 'antd';

interface ITeamForReports {
  id: string;
  name: string;
  creatorId: string;
  members: TYandexUser[];
}

interface IDatabaseTeam {
  id: string;
  name: string;
  creatorId: string;
  members: TYandexUser[];
}

type TProps = {
  language: TCurrentLocale | undefined;
  uId: number | undefined;
  tracker: TYandexTrackerConfig;
  isDarkMode: boolean;
  setIsDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
  self: TYandexUser;
  currentMenuKey: string;
  onMenuChange: (key: string) => void;
};

export const YandexTimesheet: FC<TProps> = ({
  language,
  tracker,
  uId,
  isDarkMode,
  setIsDarkMode,
  self,
  currentMenuKey,
  onMenuChange,
}) => {
  const teamInitializedRef = useRef(false);

  const {
    from,
    to,
    showWeekends,
    issueStatus,
    sorting,
    summary,
    queue,
    utcOffsetInMinutes,
    userId: userIdFromFilter,
    login: loginFromFilter,
    updateIssueStatus,
    updateSummary,
    updateQueue,
    updateRangeFilter,
    updateWeekendVisibility,
  } = useFilters();

  const { pinnedIssues, pinIssue, unpinIssue } = usePinnedIssues(tracker.orgId);

  const { currentData: tracksData } = yandexTrackApi.useGetYandexTracksQuery(
    { from, to, createdBy: uId, utcOffsetInMinutes, tracker },
    { skip: !uId },
  );

  // const currentUser = team.find((user) => user.uid === uId);

  // Get teams data for reports
  const teams = useAppSelector((state: { track: { teams: ITeamForReports[] } }) => state.track.teams || []);
  const [reportTeamId, setReportTeamId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const initializationRef = useRef(false);

  // Initialize reportTeamId with activeTeamId from localStorage on component mount
  useEffect(() => {
    if (initializationRef.current) return; // Prevent multiple initializations

    const savedActiveTeamId = localStorage.getItem('activeTeamId');

    if (savedActiveTeamId) {
      // If we have a saved activeTeamId, use it
      setReportTeamId(savedActiveTeamId);
      setIsInitialized(true);
      initializationRef.current = true;
    }
  }, []);

  // Set first team as default when teams are loaded and no activeTeamId exists
  useEffect(() => {
    if (!initializationRef.current && teams.length > 0) {
      const savedActiveTeamId = localStorage.getItem('activeTeamId');
      if (!savedActiveTeamId) {
        // Find first own team, otherwise use first team
        const ownTeam = teams.find((t: ITeamForReports) => t.creatorId === self?.uid.toString());
        const defaultTeamId = ownTeam ? ownTeam.id : teams[0].id;
        setReportTeamId(defaultTeamId);
      }
      setIsInitialized(true);
      initializationRef.current = true;
    }
  }, [teams, self?.uid]);

  // Save reportTeamId to localStorage when it changes (but not on initial load)
  useEffect(() => {
    if (isInitialized && reportTeamId) {
      // Only save to localStorage after initialization and when we have a valid selection
      localStorage.setItem('activeTeamId', reportTeamId);
      const foundTeam = teams.find((t: ITeamForReports) => t.id === reportTeamId);
      if (foundTeam && Array.isArray(foundTeam.members) && foundTeam.members.length > 0) {
        localStorage.setItem('team', JSON.stringify(foundTeam.members));
      }
    }
  }, [reportTeamId, isInitialized]);

  const dispatch = useDispatch();

  // Load teams from backend if teams array is empty
  useEffect(() => {
    if (teams.length === 0 && self) {
      const loadTeamsFromBackend = async () => {
        try {
          const res = await fetch('/api/team', {
            headers: {
              'x-user-id': self.uid.toString(),
              'x-user-email': self.email,
              'x-user-display': self.display ? encodeURIComponent(self.display) : '',
            },
          });

          if (res.ok) {
            const data = await res.json();
            if (data.teams && Array.isArray(data.teams)) {
              // Transform database teams to our format and dispatch to Redux
              const transformedTeams = data.teams.map((dbTeam: IDatabaseTeam) => ({
                id: dbTeam.id,
                name: dbTeam.name,
                creatorId: dbTeam.creatorId,
                members: dbTeam.members || [],
                isActive: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }));

              dispatch(track.actions.setTeams(transformedTeams));
              // Removed the setReportTeamId call that was overriding saved activeTeamId
            }
          }
        } catch (error) {
          console.error('Error loading teams from backend:', error);
        }
      };

      loadTeamsFromBackend();
    }
  }, [teams.length, self, dispatch]);

  // Initialize team from localStorage on mount
  useLayoutEffect(() => {
    if (!teamInitializedRef.current) {
      try {
        const savedTeam = JSON.parse(localStorage.getItem('team') || '[]');
        if (savedTeam.length > 0) {
          dispatch(track.actions.setTeam(savedTeam));
        }
      } catch {
        // Handle parse error silently
      }
      teamInitializedRef.current = true;
    }
  }, [dispatch]);

  const [userTracks, setUserTracks] = useState<TTransformedTracksByUser[]>([]);
  const [loadingUserTracks, setLoadingUserTracks] = useState(false);

  const [triggerGetYandexTracks] = yandexTrackApi.useLazyGetYandexTracksQuery();

  // Effect for reports tab only
  useEffect(() => {
    let cancelled = false;

    if (currentMenuKey === 'reports' && reportTeamId && teams.length > 0) {
      setLoadingUserTracks(true);

      // Find the selected team
      const selectedTeam = teams.find((t: ITeamForReports) => t.id === reportTeamId);
      if (!selectedTeam) {
        setLoadingUserTracks(false);
        return;
      }

      Promise.all(
        selectedTeam.members.map((user: { uid: number; display: string }) =>
          triggerGetYandexTracks({
            from,
            to,
            createdBy: user.uid,
            utcOffsetInMinutes,
            tracker,
          }).unwrap(),
        ),
      )
        .then((results) => {
          if (!cancelled) {
            setUserTracks(
              results.flatMap((r, i) =>
                (r?.list ?? []).map((trackItem: TTrack) => ({
                  ...trackItem,
                  display: selectedTeam.members[i].display,
                  uid: selectedTeam.members[i].uid,
                })),
              ),
            );
          }
        })
        .finally(() => {
          if (!cancelled) setLoadingUserTracks(false);
        });
    } else if (currentMenuKey !== 'reports') {
      setUserTracks([]);
    }

    return () => {
      cancelled = true;
    };
    // Only depend on these:
  }, [currentMenuKey, reportTeamId, teams, from, to, utcOffsetInMinutes, tracker, triggerGetYandexTracks]);

  // Effect for calendar tab only
  useEffect(() => {
    if (currentMenuKey === 'calendar') {
      const startOfMonth = DateWrapper.getDateFormat(dayjs(from).startOf('month'));
      const endOfMonth = DateWrapper.getDateFormat(dayjs(from).endOf('month'));
      // Only update if not already set
      const needsPeriodUpdate = from !== startOfMonth || to !== endOfMonth;
      const needsWeekendUpdate = showWeekends !== true; // or !== '1' depending on your logic
      if (needsPeriodUpdate) {
        updateRangeFilter({ from: startOfMonth, to: endOfMonth });
      }
      if (needsWeekendUpdate) {
        updateWeekendVisibility('1');
      }
    }
    // Only depend on these:
  }, [currentMenuKey, from, to, showWeekends, updateRangeFilter, updateWeekendVisibility]);

  const { issues } = useIssuesList({
    from,
    to,
    user: uId,
    statusList: issueStatus,
    summary,
    language,
    queue,
    issuesFromTracks: tracksData?.issueKeyList,
    pinnedIssues,
    sortBy: sorting.sortBy ?? YANDEX_ISSUE_SORTING_KEY,
    sortOrder: sorting.sortOrder,
    utcOffsetInMinutes,
    tracker,
  });

  // Build issueMap for MonthCalendar
  const issueMap = useMemo(() => {
    if (!issues) return {};
    return Object.fromEntries(issues.map((issue) => [issue.key, issue.summary]));
  }, [issues]);

  const { currentData: queueList, isFetching: isFetchingQueueList } = yandexQueueApi.useGetQueuesQuery({ tracker });

  const { isTrackCreateLoading, createTrack } = useCreateYandexTrack(tracker);
  const { updateTrack } = useUpdateYandexTrack(tracker);
  const { deleteTrack } = useDeleteYandexTrack(tracker);

  const getIssueUrl = useCallback((issueKey: string) => new URL(issueKey, tracker.url).href, [tracker]);
  const viewingAnotherUser =
    userIdFromFilter !== undefined && self.uid !== undefined && Number(userIdFromFilter) !== Number(self.uid);
  const isEdit = !viewingAnotherUser && utcOffsetInMinutes === undefined; // TODO Offset critically affect us, need to refactor and check
  // Removed: const isLoading = isLoadingIssues || isLoadingTracks;

  // Refactor nested ternary for main content rendering
  let content;
  if (currentMenuKey === 'tracks') {
    content = (
      <TrackCalendar
        isEdit={isEdit}
        from={from}
        to={to}
        showWeekends={showWeekends}
        utcOffsetInMinutes={utcOffsetInMinutes}
        issueSortingKey={YANDEX_ISSUE_SORTING_KEY}
        issues={issues}
        pinnedIssues={pinnedIssues}
        pinIssue={pinIssue}
        unpinIssue={unpinIssue}
        deleteTrack={deleteTrack}
        isDarkMode={isDarkMode}
        renderTrackCalendarRowConnected={(props) => (
          <YandexTrackCalendarRowConnected
            {...props}
            tracker={tracker}
            updateTrack={updateTrack}
            getIssueUrl={getIssueUrl}
            deleteTrack={deleteTrack}
          />
        )}
        renderTrackCalendarFootConnected={(props) => <YandexTrackCalendarFootConnected {...props} tracker={tracker} />}
      />
    );
  } else if (currentMenuKey === 'calendar') {
    content = (
      <div style={{ padding: 24, background: isDarkMode ? '#111' : '#fff' }}>
        <MonthCalendar
          tracksData={tracksData ?? { date2Tracks: {} }}
          isDarkMode={isDarkMode}
          from={from}
          to={to}
          getIssueUrl={getIssueUrl}
          issueMap={issueMap}
          isEdit={isEdit}
        />
      </div>
    );
  } else {
    content = (
      <div style={{ padding: '0 32px', textAlign: 'center' }}>
        <Spin spinning={loadingUserTracks}>
          <ReportsTable
            team={reportTeamId ? teams.find((t: ITeamForReports) => t.id === reportTeamId)?.members || [] : []}
            tracks={userTracks}
            from={from}
            to={to}
            utcOffsetInMinutes={utcOffsetInMinutes}
            showWeekends={showWeekends}
            isDarkMode={isDarkMode}
          />
        </Spin>
      </div>
    );
  }

  return (
    <div>
      <TrackCalendarHeader
        isEdit={isEdit}
        tracker={tracker}
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        filters={(() => {
          switch (currentMenuKey) {
            case 'tracks':
              return (
                <>
                  <YandexUserSelectConnected tracker={tracker} userId={userIdFromFilter} login={loginFromFilter} />
                  <YandexIssueStatusSelectConnected
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
              );
            case 'calendar':
              return <YandexUserSelectConnected tracker={tracker} userId={userIdFromFilter} login={loginFromFilter} />;
            case 'reports':
              return (
                <Space>
                  <Select
                    placeholder="Select team for reports"
                    style={{ minWidth: 300 }}
                    allowClear
                    showSearch
                    filterOption={(input, option) =>
                      (option?.searchText as string)?.toLowerCase().includes(input.toLowerCase())
                    }
                    options={
                      teams?.map((team: ITeamForReports) => ({
                        value: team.id,
                        label: (
                          <Space>
                            <span>{team.name}</span>
                            {team.creatorId === self?.uid.toString() && (
                              <Typography.Text type="success" style={{ fontSize: '12px' }}>
                                (Own)
                              </Typography.Text>
                            )}
                            <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                              {team.members.length} members
                            </Typography.Text>
                          </Space>
                        ),
                        searchText: team.name,
                      })) || []
                    }
                    value={reportTeamId}
                    onChange={setReportTeamId}
                  />
                </Space>
              );
            default:
              return null;
          }
        })()}
        currentMenuKey={currentMenuKey}
        onMenuChange={onMenuChange}
      />
      {content}
      {/* Always render modals here, outside the tab conditional */}
      <TeamModalCreate tracker={tracker} isTrackCreateLoading={isTrackCreateLoading} />
      <LdapLoginModalCreate tracker={tracker} isTrackCreateLoading={isTrackCreateLoading} />
      <TrackModalCreate
        tracker={tracker}
        isTrackCreateLoading={isTrackCreateLoading}
        createTrack={createTrack}
        renderIssueTracksConnected={YandexIssueTracksConnected}
        renderIssuesSearchConnected={YandexIssuesSearchConnected}
      />
    </div>
  );
};
