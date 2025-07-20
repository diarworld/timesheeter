import React, { useState, useMemo, useCallback } from 'react';
import { Calendar, Modal, Typography, Progress, Flex, Button } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);
import { TTrack, TISODuration } from 'entities/track/common/model/types';
import { DurationFormat } from 'features/date/ui/DurationFormat/DurationFormat';
import { sumIsoDurations } from 'shared/lib/sum-iso-durations-to-business';
import { useISOToHumanReadableDuration } from 'entities/track/common/lib/hooks/use-iso-to-human-readable-duration';
import { getExpectedHoursForDay } from 'entities/track/common/lib/hooks/use-expected-hours-for-day';
import styles from './MonthCalendar.module.scss';
import clsx from 'clsx';
import { YandexTracker } from 'components/Icons/YandexTracker';
import { TrackCalendarColIssueSumDay } from '../TrackCalendarColIssueSumDay/TrackCalendarColIssueSumDay';
import { TrackTimeButton } from '../TrackCalendarHeader/TrackTimeButton';

interface Props {
  tracksData: any;
  isDarkMode: boolean;
  from: string;
  to: string;
  getIssueUrl: (issueKey: string) => string;
  issueMap: Record<string, string>;
  isEdit: boolean;
  /**
   * Called when the user changes the month in the calendar. Receives new from and to (YYYY-MM-DD).
   */
  onPeriodChange?: (from: string, to: string) => void;
}

const ISODurationText: React.FC<{ duration: TISODuration }> = ({ duration }) => {
  const human = useISOToHumanReadableDuration(duration);
  return <>{human}</>;
};

function expectedPercent(tracks: TTrack[], expected: number): number {
  const trackedMs = tracks.reduce((sum, t) => {
    if ((t as TTrack).duration) {
      try {
        const { isoDurationToBusinessMs } = require('entities/track/common/lib/iso-duration-to-business-ms');
        return sum + isoDurationToBusinessMs((t as TTrack).duration);
      } catch {
        return sum;
      }
    }
    return sum;
  }, 0);
  const trackedHours = trackedMs / (60 * 60 * 1000);
  return expected > 0 ? Math.min(100, Math.round((trackedHours / expected) * 100)) : 0;
}

export const MonthCalendar: React.FC<Props> = ({ tracksData, isDarkMode, from, to, getIssueUrl, issueMap, isEdit, onPeriodChange }) => {
  const [calendarModal, setCalendarModal] = useState<{ visible: boolean; date: Dayjs | null }>({ visible: false, date: null });

  const tracksByDate = useMemo(() => {
    const map: Record<string, TTrack[]> = {};
    if (tracksData?.date2Tracks) {
      Object.entries(tracksData.date2Tracks).forEach(([isoDate, tracks]) => {
        const date = dayjs(isoDate).format('YYYY-MM-DD');
        map[date] = tracks as TTrack[];
      });
    }
    return map;
  }, [tracksData]);

  const cellRender = useCallback((value: Dayjs) => {
    const dateStr = value.format('YYYY-MM-DD');
    const tracks = tracksByDate[dateStr] || [];
    const hasTracks = tracks.length > 0;
    const isWeekend = value.day() === 0 || value.day() === 6;
    const isInPeriod = dayjs(dateStr).isSameOrAfter(dayjs(from)) && dayjs(dateStr).isSameOrBefore(dayjs(to));

    return (
      <div
        className={clsx(styles.wrapper, { [styles.wrapper_has_tracks]: hasTracks }, { [styles.col_weekend_light]: value.day() === 0 || value.day() === 6 }, { [styles.col_weekend_dark]: value.day() === 0 || value.day() === 6 && isDarkMode })}
        style={{
          background: hasTracks ? (isDarkMode ? '#222' : '#e6f7ff') : undefined,
          borderRadius: hasTracks ? 6 : undefined,
          padding: hasTracks ? '2px 6px' : undefined,
          minHeight: 36,
          cursor: hasTracks ? 'pointer' : 'default',
        }}
        onClick={e => {
          if (hasTracks) {
            e.stopPropagation();
            setCalendarModal({ visible: true, date: value });
          }
        }}
      >
        {hasTracks && (
          <>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, fontSize: 11 }}>
              {tracks.slice(0, 2).map((track, idx) => (
                <li key={(track as TTrack).id || idx} style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <YandexTracker style={{ 
                    fill: isDarkMode ? '#fff' : '#000',
                    fontSize: '12px'
                  }} 
                  /> &nbsp;
                  <span style={{ fontWeight: 700 }}>{(track as TTrack).issueKey}</span>
                  {issueMap[(track as TTrack).issueKey] ? `: ${issueMap[(track as TTrack).issueKey]}` : ''}
                </li>
              ))}
              {tracks.length > 2 && <li>+{tracks.length - 2} more</li>}
            </ul>
            <Flex justify="space-between" align="center">
              <div style={{ fontSize: 10, color: isDarkMode ? '#aaa' : '#888', marginTop: 2 }}>
                <DurationFormat
                  duration={sumIsoDurations(
                    tracks.map(t => (t as TTrack).duration)
                  )}
                />
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
        )}
        {!hasTracks && !isWeekend && isInPeriod && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <TrackCalendarColIssueSumDay
            isEdit={isEdit}
            date={dateStr}
            issueKey={''}
            isDarkMode={isDarkMode}
            tracks={undefined}
          />
          </div>
        )}
      </div>
    );
  }, [tracksByDate, isDarkMode, getIssueUrl, from, to, issueMap]);

  const renderCalendarModal = () => {
    if (!calendarModal.visible || !calendarModal.date) return null;
    const dateStr = calendarModal.date.format('YYYY-MM-DD');
    const tracks = tracksByDate[dateStr] || [];

    // Calculate total ms for all tracks
    const totalLoggedMs = tracks.reduce((sum, t) => {
      if ((t as TTrack).duration) {
        try {
          const { isoDurationToBusinessMs } = require('entities/track/common/lib/iso-duration-to-business-ms');
          return sum + isoDurationToBusinessMs((t as TTrack).duration);
        } catch {
          return sum;
        }
      }
      return sum;
    }, 0);
    const trackedHours = totalLoggedMs / (60 * 60 * 1000);
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
            <li key={(track as TTrack).id || idx} style={{ marginBottom: 8 }}>
              {(track as TTrack).issueKey ? (
                <Button type="link" icon={<YandexTracker style={{ 
                    fill: isDarkMode ? '#15417e' : '#69b1ff',
                    fontSize: '16px'
                  }} 
                />} target="_blank" href={getIssueUrl((track as TTrack).issueKey)} style={{ padding: 0 }}>
                    {(track as TTrack).issueKey}
                </Button>
              ) : null}
              {issueMap[(track as TTrack).issueKey] ? `: ${issueMap[(track as TTrack).issueKey]}` : ''}
              <span style={{ color: '#888', marginLeft: 4, fontSize: 12 }}>
                &nbsp;{(track as TTrack).comment}
              </span>
              <span style={{ color: '#888', marginLeft: 4, fontSize: 12 }}>
                &nbsp;(<ISODurationText duration={(track as TTrack).duration} />)
              </span>
              
            </li>
          ))}
        </ul>
        <div style={{ display: 'flex' }}>
          <TrackTimeButton isEdit={isEdit} />
        </div>
        <Typography.Text strong>
          Total: <DurationFormat
            duration={sumIsoDurations(
              tracks.map(t => (t as TTrack).duration)
            )}
          />
        </Typography.Text>
        
        <div style={{ marginTop: 8 }}>
          <Progress
            percent={percent}
            size="small"
            showInfo={true}
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
        value={dayjs(from)}
        headerRender={() => null}
        onPanelChange={(date, mode) => {
          if (mode === 'month' && onPeriodChange) {
            onPeriodChange(
              date.startOf('month').format('YYYY-MM-DD'),
              date.endOf('month').format('YYYY-MM-DD')
            );
          }
        }}
      />
      {renderCalendarModal()}
    </>
  );
};
