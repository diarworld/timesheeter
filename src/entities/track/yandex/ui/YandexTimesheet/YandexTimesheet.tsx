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
import { Message } from 'entities/locale/ui/Message';
import { Button, Spin } from 'antd';
import { YANDEX_ISSUE_SORTING_KEY } from 'entities/issue/yandex/model/constants';
import { useLogoutTracker } from 'entities/tracker/lib/useLogoutTracker';
import { useDispatch } from 'react-redux';
import { TTransformedTracksByUser, TTrack, TISODuration } from 'entities/track/common/model/types';
import { TeamModalCreate } from 'entities/track/common/ui/TeamModalCreate';
import { LdapLoginModalCreate } from 'entities/track/common/ui/LdapLoginModalCreate';

import { useAppSelector } from 'shared/lib/hooks';
import { selectTeam } from 'entities/track/common/model/selectors';
import { track } from 'entities/track/common/model/reducers';
import { ReportsTable } from './ReportsTable';
import dayjs, { Dayjs } from 'dayjs';
import { useISOToHumanReadableDuration } from 'entities/track/common/lib/hooks/use-iso-to-human-readable-duration';

import { MonthCalendar } from 'entities/track/common/ui/MonthCalendar/MonthCalendar';
import { TrackModalCreate } from 'entities/track/common/ui/TrackModalCreate/TrackModalCreate';

type TProps = {
  language: TCurrentLocale | undefined;
  uId: number | undefined;
  tracker: TYandexTrackerConfig;
  isDarkMode: boolean;
  setIsDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
};

export const YandexTimesheet: FC<TProps> = ({ language, tracker, uId, isDarkMode, setIsDarkMode }) => {
  const [currentMenuKey, setCurrentMenuKey] = useState('tracks');
  const logout = useLogoutTracker(tracker);
  const teamInitializedRef = useRef(false);

  // Add calendarModal state
  const [calendarModal, setCalendarModal] = useState<{visible: boolean, date: Dayjs | null}>({visible: false, date: null});

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
  } = useFilters();

  const { pinnedIssues, pinIssue, unpinIssue } = usePinnedIssues(tracker.orgId);

  const { isLoading: isLoadingTracks, currentData: tracksData } = yandexTrackApi.useGetYandexTracksQuery(
    { from, to, createdBy: uId, utcOffsetInMinutes, tracker },
    { skip: !uId },
  );

  // For calendar period sync
  const { updateRangeFilter } = useFilters();
  const calendarInitializedRef = useRef(false);

  useEffect(() => {
    if (currentMenuKey === 'calendar' && !calendarInitializedRef.current) {
      const startOfMonth = dayjs().startOf('month').format('YYYY-MM-DD');
      const endOfMonth = dayjs().endOf('month').format('YYYY-MM-DD');
      updateRangeFilter({ from: startOfMonth, to: endOfMonth });
      calendarInitializedRef.current = true;
    }
    if (currentMenuKey !== 'calendar') {
      calendarInitializedRef.current = false;
    }
  }, [currentMenuKey, updateRangeFilter]);

  const team = useAppSelector(selectTeam) || [];

  const dispatch = useDispatch();

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
  }, []); // Remove dispatch dependency as it's stable from useDispatch

  const [userTracks, setUserTracks] = useState<TTransformedTracksByUser[]>([]);
  const [loadingUserTracks, setLoadingUserTracks] = useState(false);

  const [triggerGetYandexTracks] = yandexTrackApi.useLazyGetYandexTracksQuery();

  useEffect(() => {
    if (currentMenuKey === 'reports' && team.length > 0) {
      setLoadingUserTracks(true);
      Promise.all(
        team.map((user) =>
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
          setUserTracks(
            results.flatMap((r, i) =>
              (r?.list ?? []).map((trackItem: TTrack) => ({
                ...trackItem,
                display: team[i].display,
                uid: team[i].uid,
              })),
            ),
          );
        })
        .finally(() => setLoadingUserTracks(false));
    } else if (currentMenuKey === 'reports') {
      setUserTracks([]);
    }
  }, [currentMenuKey, team, from, to, utcOffsetInMinutes, tracker, triggerGetYandexTracks]);

  const { isLoadingIssues, issues } = useIssuesList({
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
    return Object.fromEntries(
      issues.map(issue => [issue.key, issue.summary])
    );
  }, [issues]);

  const { currentData: queueList, isFetching: isFetchingQueueList } = yandexQueueApi.useGetQueuesQuery({ tracker });

  const { isTrackCreateLoading, createTrack } = useCreateYandexTrack(tracker);
  const { updateTrack, isTrackUpdateLoading } = useUpdateYandexTrack(tracker);
  const { isTrackDeleteLoading, deleteTrack } = useDeleteYandexTrack(tracker);

  const getIssueUrl = useCallback((issueKey: string) => new URL(issueKey, tracker.url).href, [tracker]);

  const viewingAnotherUser = !!userIdFromFilter;
  const isEdit = !viewingAnotherUser && utcOffsetInMinutes === undefined; // TODO Offset critically affect us, need to refactor and check
  const isLoading = isLoadingIssues || isLoadingTracks;

  // Set period to current month when switching to calendar
  useEffect(() => {
    if (currentMenuKey === 'calendar') {
      const startOfMonth = dayjs().startOf('month').format('YYYY-MM-DD');
      const endOfMonth = dayjs().endOf('month').format('YYYY-MM-DD');
      if (from !== startOfMonth || to !== endOfMonth) {
        // update filters to current month
        // If you have a filter update function, call it here
        // updatePeriod(startOfMonth, endOfMonth);
      }
    }
  }, [currentMenuKey]);

  return (
    <div>
      <TrackCalendarHeader
        isEdit={isEdit}
        tracker={tracker}
        _upperRowControls={
          <Button onClick={logout} type="link">
            <Message id="home.logout" />
          </Button>
        }
        isDarkMode={isDarkMode}
        setIsDarkMode={setIsDarkMode}
        filters={
          currentMenuKey === 'tracks' ? (
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
          ) : currentMenuKey === 'calendar' ? (
            <><YandexUserSelectConnected tracker={tracker} userId={userIdFromFilter} login={loginFromFilter} /></>
          ) : null
        }
        currentMenuKey={currentMenuKey}
        onMenuChange={setCurrentMenuKey}
      />
      {currentMenuKey === 'tracks' ? (
        <TrackCalendar
          tracker={tracker}
          isEdit={isEdit}
          from={from}
          to={to}
          showWeekends={showWeekends}
          utcOffsetInMinutes={utcOffsetInMinutes}
          issueSortingKey={YANDEX_ISSUE_SORTING_KEY}
          _isLoading={isLoading}
          issues={issues}
          pinnedIssues={pinnedIssues}
          pinIssue={pinIssue}
          unpinIssue={unpinIssue}
          isTrackCreateLoading={isTrackCreateLoading}
          createTrack={createTrack}
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
          renderTrackCalendarFootConnected={(props) => (
            <YandexTrackCalendarFootConnected {...props} tracker={tracker} />
          )}
          renderIssueTracksConnected={(props) => (
            <YandexIssueTracksConnected
              {...props}
              isEditTrackComment
              tracker={tracker}
              updateTrack={updateTrack}
              isTrackUpdateLoading={isTrackUpdateLoading}
              uId={uId}
              deleteTrack={deleteTrack}
              isDarkMode={isDarkMode}
            />
          )}
          renderIssuesSearchConnected={(props) => <YandexIssuesSearchConnected {...props} tracker={tracker} />}
        />
      ) : currentMenuKey === 'calendar' ? (
        <div style={{ padding: 24, background: isDarkMode ? '#111' : '#fff' }}>
          <MonthCalendar
            tracksData={tracksData}
            isDarkMode={isDarkMode}
            from={from}
            to={to}
            getIssueUrl={getIssueUrl}
            issueMap={issueMap}
            isEdit={isEdit}
            onPeriodChange={(from, to) => updateRangeFilter({ from, to })}
          />
        </div>
      ) : (
        <div style={{ padding: '0 32px', textAlign: 'center' }}>
          <Spin spinning={loadingUserTracks}>
            <ReportsTable
              team={team}
              tracks={userTracks}
              from={from}
              to={to}
              utcOffsetInMinutes={utcOffsetInMinutes}
              showWeekends={showWeekends}
              isDarkMode={isDarkMode}
            />
          </Spin>
        </div>
      )}
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

const ISODurationText: React.FC<{ duration: TISODuration }> = ({ duration }) => {
  const human = useISOToHumanReadableDuration(duration);
  return <>{human}</>;
};
