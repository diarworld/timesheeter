import React, { useState, useMemo, useCallback } from 'react';
import { Calendar, Modal, Typography, Progress, Flex, Button } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import { TTrack, TISODuration } from 'entities/track/common/model/types';
import { DurationFormat } from 'features/date/ui/DurationFormat/DurationFormat';
import { sumIsoDurations } from 'shared/lib/sum-iso-durations-to-business';
import { useISOToHumanReadableDuration } from 'entities/track/common/lib/hooks/use-iso-to-human-readable-duration';
import { getExpectedHoursForDay } from 'entities/track/common/lib/hooks/use-expected-hours-for-day';
import clsx from 'clsx';
import { YandexTracker } from 'components/Icons/YandexTracker';
import { DateWrapper } from 'features/date/lib/DateWrapper';
import { useMessage } from 'entities/locale/lib/hooks';
import { isoDurationToBusinessMs } from 'entities/track/common/lib/iso-duration-to-business-ms';
import { TrackCalendarColIssueSumDay } from 'entities/track/common/ui/TrackCalendarColIssueSumDay/TrackCalendarColIssueSumDay';
import { TrackTimeButton } from 'entities/track/common/ui/TrackCalendarHeader/TrackTimeButton';
import { msToBusinessDurationData } from 'entities/track/common/lib/ms-to-business-duration-data';
import { useFilters } from 'features/filters/lib/useFilters';
import styles from './MonthCalendar.module.scss';

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

interface IMonthCalendarProps {
  tracksData: {
    date2Tracks: Record<string, TTrack[]>;
  };
  isDarkMode: boolean;
  from: string;
  to: string;
  getIssueUrl: (issueKey: string) => string;
  issueMap: Record<string, string>;
  isEdit: boolean;
  /**
   * Called when the user changes the month in the calendar. Receives new from and to (YYYY-MM-DD).
   */
}

const ISODurationText: React.FC<{ duration: TISODuration }> = ({ duration }) => {
  const human = useISOToHumanReadableDuration(duration);
  return human;
};

function expectedPercent(tracks: TTrack[], expected: number): number {
  const trackedMs = tracks.reduce((sum, t) => {
    if (t.duration) {
      try {
        return sum + (isoDurationToBusinessMs(t.duration) ?? 0);
      } catch {
        return sum;
      }
    }
    return sum;
  }, 0);
  const trackedHours = trackedMs / (60 * 60 * 1000);
  return expected > 0 ? Math.min(100, Math.round((trackedHours / expected) * 100)) : 0;
}

export const MonthCalendar: React.FC<IMonthCalendarProps> = ({
  tracksData,
  isDarkMode,
  from: fromProp,
  to: toProp,
  getIssueUrl,
  issueMap,
  isEdit,
}) => {
  const [calendarModal, setCalendarModal] = useState<{ visible: boolean; date: Dayjs | null }>({
    visible: false,
    date: null,
  });
  const { updateRangeFilter } = useFilters();
  const message = useMessage();
  const tracksByDate = useMemo(() => {
    const map: Record<string, TTrack[]> = {};
    if (tracksData?.date2Tracks) {
      Object.entries(tracksData.date2Tracks).forEach(([isoDate, tracks]) => {
        const date = dayjs(isoDate).format('YYYY-MM-DD');
        map[date] = tracks;
      });
    }
    return map;
  }, [tracksData]);

  const allDatesInPeriod = useMemo(() => {
    const dates: string[] = [];
    let current = dayjs(fromProp);
    const end = dayjs(toProp);
    while (current.isSameOrBefore(end)) {
      dates.push(current.format('YYYY-MM-DD'));
      current = current.add(1, 'day');
    }
    return dates;
  }, [fromProp, toProp]);

  // Only include days <= today
  const allDatesUpToToday = useMemo(
    () => allDatesInPeriod.filter((date) => dayjs(date).isSameOrBefore(dayjs(), 'day')),
    [allDatesInPeriod],
  );

  const totalLoggedMs = useMemo(
    () =>
      allDatesUpToToday.reduce((sum, date) => {
        const tracks = tracksByDate[date] || [];
        return (
          sum +
          tracks.reduce((trackSum, t) => {
            if (t.duration) {
              try {
                return trackSum + (isoDurationToBusinessMs(t.duration) ?? 0);
              } catch {
                return trackSum;
              }
            }
            return trackSum;
          }, 0)
        );
      }, 0),
    [allDatesUpToToday, tracksByDate],
  );

  const totalExpectedHours = useMemo(
    () => allDatesUpToToday.reduce((sum, date) => sum + getExpectedHoursForDay(date), 0),
    [allDatesUpToToday],
  );

  const headerRender = useCallback(
    (headerFrom: string, headerTo: string, headerTotalExpectedHours: number, headerTotalLoggedMs: number) => (
      <div style={{ display: 'flex', padding: '0 16px', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography.Text style={{ fontSize: 14, color: '#888', fontWeight: 800 }}>
          {`${dayjs(headerFrom).format('DD MMMM YYYY')} - ${dayjs(headerTo).format('DD MMMM YYYY')}`}
        </Typography.Text>
        <Typography.Text style={{ fontSize: 14, fontWeight: 800 }}>
          <span>{message('track.total.daily')}: </span>&nbsp;
          <Progress
            percent={
              headerTotalExpectedHours > 0
                ? Math.min(100, Math.round((headerTotalLoggedMs / (headerTotalExpectedHours * 60 * 60 * 1000)) * 100))
                : 0
            }
            type="circle"
            size={30}
            showInfo
          />
          &nbsp;
          <DurationFormat duration={msToBusinessDurationData(headerTotalLoggedMs)} /> /{' '}
          <DurationFormat duration={msToBusinessDurationData(headerTotalExpectedHours * 60 * 60 * 1000)} />
        </Typography.Text>
      </div>
    ),
    [message],
  );

  const cellRender = useCallback(
    (value: Dayjs) => {
      const dateStr = value.format('YYYY-MM-DD');
      const tracks = tracksByDate[dateStr] || [];
      const hasTracks = tracks.length > 0;
      const isWeekend = DateWrapper.isWeekend(value);
      const isHoliday = DateWrapper.isHoliday(value);
      const isInPeriod = dayjs(dateStr).isSameOrAfter(dayjs(fromProp)) && dayjs(dateStr).isSameOrBefore(dayjs(toProp));

      let cellContent = null;
      if (hasTracks) {
        cellContent = (
          <>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: 11 }}>
              {tracks.slice(0, 2).map((track, idx) => (
                <li
                  key={track.id || idx}
                  style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
                >
                  <YandexTracker
                    style={{
                      fill: isDarkMode ? '#fff' : '#000',
                      fontSize: '12px',
                    }}
                  />{' '}
                  &nbsp;
                  <span style={{ fontWeight: 700 }}>{track.issueKey}</span>
                  {issueMap[track.issueKey] ? `: ${issueMap[track.issueKey]}` : ''}
                </li>
              ))}
              {tracks.length > 2 && <li>+{tracks.length - 2} more</li>}
            </ul>
            <Flex justify="space-between" align="center">
              <div style={{ fontSize: 10, color: isDarkMode ? '#aaa' : '#888', marginTop: 2 }}>
                <DurationFormat duration={sumIsoDurations(tracks.map((t) => t.duration))} />
              </div>
              {getExpectedHoursForDay(dateStr) > 0 && (
                <Progress
                  percent={expectedPercent(tracks, getExpectedHoursForDay(dateStr))}
                  style={{ width: '80%' }}
                  size="small"
                  showInfo
                  strokeColor={expectedPercent(tracks, getExpectedHoursForDay(dateStr)) < 50 ? 'red' : undefined}
                />
              )}
            </Flex>
          </>
        );
      } else if (!isWeekend && !isHoliday && isInPeriod) {
        cellContent = (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <TrackCalendarColIssueSumDay
              as="div"
              isEdit={isEdit}
              date={dateStr}
              issueKey=""
              isDarkMode={isDarkMode}
              tracks={undefined}
            />
          </div>
        );
      }

      if (hasTracks) {
        return (
          <div
            className={clsx(
              styles.wrapper,
              { [styles.wrapper_has_tracks]: hasTracks },
              { [styles.col_weekend_light]: isWeekend || isHoliday },
              { [styles.col_weekend_dark]: (isWeekend || isHoliday) && isDarkMode },
            )}
            style={{
              background: isDarkMode ? '#222' : '#e6f7ff',
              borderRadius: 6,
              padding: '2px 6px',
              minHeight: 36,
              cursor: 'pointer',
            }}
            onClick={(e) => {
              e.stopPropagation();
              setCalendarModal({ visible: true, date: value });
            }}
            tabIndex={0}
            role="button"
            onKeyDown={(e: React.KeyboardEvent<HTMLDivElement>) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setCalendarModal({ visible: true, date: value });
              }
            }}
            aria-label={message('track.details.open')}
            aria-pressed={false}
          >
            {cellContent}
          </div>
        );
      }
      if (!isWeekend && !isHoliday && isInPeriod) {
        return (
          <div
            className={clsx(
              styles.wrapper,
              { [styles.col_weekend_light]: isWeekend || isHoliday },
              { [styles.col_weekend_dark]: (isWeekend || isHoliday) && isDarkMode },
            )}
            style={{
              minHeight: 36,
            }}
          >
            {cellContent}
          </div>
        );
      }
      return (
        <div
          className={clsx(
            styles.wrapper,
            { [styles.col_weekend_light]: isWeekend || isHoliday },
            { [styles.col_weekend_dark]: (isWeekend || isHoliday) && isDarkMode },
          )}
          style={{
            minHeight: 36,
          }}
        />
      );
    },
    [tracksByDate, isDarkMode, issueMap, isEdit, message, fromProp, toProp],
  );

  const renderCalendarModal = () => {
    if (!calendarModal.visible || !calendarModal.date) return null;
    const dateStr = calendarModal.date.format('YYYY-MM-DD');
    const tracks = tracksByDate[dateStr] || [];

    const totalLoggedMsModal = tracks.reduce((sum, t) => {
      if (t.duration) {
        try {
          return sum + (isoDurationToBusinessMs(t.duration) ?? 0);
        } catch {
          return sum;
        }
      }
      return sum;
    }, 0);
    const trackedHours = totalLoggedMsModal / (60 * 60 * 1000);
    const expected = getExpectedHoursForDay(dateStr);
    const percent = expected > 0 ? Math.min(100, Math.round((trackedHours / expected) * 100)) : 0;

    return (
      <Modal
        open={calendarModal.visible}
        onCancel={() => setCalendarModal({ visible: false, date: null })}
        footer={null}
        title={calendarModal.date.format('DD MMMM YYYY')}
      >
        <ul style={{ padding: 0, listStyle: 'none' }}>
          {tracks.map((track, idx) => (
            <li key={track.id || idx} style={{ marginBottom: 8 }}>
              {track.issueKey ? (
                <Button
                  type="link"
                  icon={
                    <YandexTracker
                      style={{
                        fill: isDarkMode ? '#15417e' : '#69b1ff',
                        fontSize: '16px',
                      }}
                    />
                  }
                  target="_blank"
                  href={getIssueUrl(track.issueKey)}
                  style={{ padding: 0 }}
                >
                  {track.issueKey}
                </Button>
              ) : null}
              {issueMap[track.issueKey] ? `: ${issueMap[track.issueKey]}` : ''}
              <span style={{ color: '#888', marginLeft: 4, fontSize: 12 }}>&nbsp;{track.comment}</span>
              <span style={{ color: '#888', marginLeft: 4, fontSize: 12 }}>
                &nbsp;(
                <ISODurationText duration={track.duration} />)
              </span>
            </li>
          ))}
        </ul>
        <div style={{ display: 'flex' }}>
          <TrackTimeButton isEdit={isEdit} />
        </div>
        <Typography.Text strong>
          {message('track.total.logged')}: <DurationFormat duration={sumIsoDurations(tracks.map((t) => t.duration))} />{' '}
          / {message('date.hours.short', { value: getExpectedHoursForDay(dateStr) })}
        </Typography.Text>

        <div style={{ marginTop: 8 }}>
          <Progress
            percent={percent}
            size="small"
            showInfo
            style={{ marginTop: 2, width: '100%' }}
            strokeColor={percent < 50 ? 'red' : undefined}
          />
        </div>
      </Modal>
    );
  };

  return (
    <>
      <Calendar
        className={clsx(styles.wrapper)}
        cellRender={cellRender}
        value={dayjs(fromProp)}
        headerRender={() => headerRender(fromProp, toProp, totalExpectedHours, totalLoggedMs)}
        // headerRender={() => null}
        onPanelChange={(date, mode) => {
          updateRangeFilter({
            from: DateWrapper.getDateFormat(date.startOf(mode)),
            to: DateWrapper.getDateFormat(date.endOf(mode)),
          });
        }}
      />
      {renderCalendarModal()}
    </>
  );
};
