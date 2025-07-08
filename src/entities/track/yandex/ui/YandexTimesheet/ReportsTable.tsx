import React, { useMemo } from 'react';
import { Table, Progress, Badge } from 'antd';
import { DateWrapper } from 'features/date/lib/DateWrapper';
import { TYandexUser } from 'entities/user/yandex/model/types';
import { TTransformedTracksByUser } from 'entities/track/common/model/types';
import { TBusinessDurationData } from 'entities/track/common/model/types';
import styles from './ReportsTable.module.scss';
import { isoDurationToBusinessMs } from 'entities/track/common/lib/iso-duration-to-business-ms';
import { TISODuration } from 'entities/track/common/model/types';
import { DurationFormat } from 'features/date/ui/DurationFormat';
import { msToBusinessDurationData } from 'entities/track/common/lib/ms-to-business-duration-data';
import { businessDurationDataToIso } from 'entities/track/common/lib/business-duration-data-to-iso'
import { Text } from 'components';
import { isRuLocale } from 'entities/locale/lib/helpers';
import { useCurrentLocale } from 'entities/locale/lib/hooks';
import { DATE_FORMAT_MONTH } from 'features/date/lib/constants';
import clsx from 'clsx';
import { useMessage } from 'entities/locale/lib/hooks';


function getDaysArray(from: string, to: string, utcOffsetInMinutes: number | undefined, showWeekends: boolean = false) {
  const start = DateWrapper.getDate({ date: from, utcOffsetInMinutes });
  const end = DateWrapper.getDate({ date: to, utcOffsetInMinutes });
  const days: string[] = [];
  let current = start.clone();
  while (current.isBefore(end, 'day') || current.isSame(end, 'day')) {
    const dayOfWeek = current.day();
    if (showWeekends || (dayOfWeek !== 0 && dayOfWeek !== 6)) {
      days.push(current.format('YYYY-MM-DD'));
    }
    current = current.add(1, 'day');
  }
  return days;
}

type ReportsTableProps = {
  team: Array<Pick<TYandexUser, 'uid' | 'login' | 'display'>>;
  tracks: TTransformedTracksByUser[];
  from: string;
  to: string;
  utcOffsetInMinutes: number | undefined;
  showWeekends: boolean;
};

function sumDurations(tracks: TTransformedTracksByUser[]): TBusinessDurationData {
  const ms = tracks.reduce((acc, t) => acc + (isoDurationToBusinessMs(t.duration) ?? 0), 0);
  return msToBusinessDurationData(ms);
}

export function ReportsTable({ team, tracks, from, to, utcOffsetInMinutes, showWeekends }: ReportsTableProps) {

//   const days = useRange({ from, to, showWeekends, utcOffsetInMinutes });
//   console.log('days:', days);
  const message = useMessage();
  const days = getDaysArray(from, to, utcOffsetInMinutes, showWeekends);
  const today = DateWrapper.getDate({ utcOffsetInMinutes }).format('YYYY-MM-DD');
  const currentLocale = useCurrentLocale();
  
  const daysUpToToday = days.filter(day => day <= today);

  const dayHeaders = days.map(day => {
    const dateObj = DateWrapper.getDate({ date: day, utcOffsetInMinutes });
    const dateFormat = DateWrapper.getDateFormat(dateObj, DATE_FORMAT_MONTH);
    const dayFormat = DateWrapper.getDateFormat(dateObj, isRuLocale(currentLocale) ? 'dd' : 'ddd');
    const isWeekend = DateWrapper.isWeekend(dateObj);
    return {
      key: day,
      dataIndex: day, // <-- add this
      isWeekend: isWeekend,
      title: (
        <div>
          <Text fs={13} fw={700} style={{ textTransform: 'capitalize' }}>
            {dayFormat}
          </Text>
          <Text fs={13}> {dateFormat}</Text>
        </div>
      ),
    };
  });

  const columns = [
    {
      title: message('user.item.title'),
      dataIndex: 'display',
      key: 'display',
      fixed: 'left' as const,
      onHeaderCell: () => ({ style: { minWidth: 200 } }),
    },
    ...dayHeaders.map(({ key, title, dataIndex, isWeekend }) => ({
      title,
      dataIndex, // use dataIndex here
      key,
      className: clsx(styles.col, { [styles.col_weekend]: isWeekend }),
      render: (iso: TBusinessDurationData) => {
        const ms = isoDurationToBusinessMs(businessDurationDataToIso(iso));
        const loggedHours = ms ? Math.floor(ms / (1000 * 60 * 60)) : 0;
        const isFullDay = loggedHours >= 8;
        // const isNoLogs = ms === 0;
        
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {isFullDay && <Badge status="success" />}
            {/* {isNoLogs && <Badge status="error" />} */}
            <DurationFormat duration={iso} />
          </div>
        );
      },
    })),
    {
      title: message('track.total.logged'),
      dataIndex: 'total',
      key: 'total',
      fixed: 'right' as const,
      onHeaderCell: () => ({ style: { minWidth: 200 } }),
      render: (duration: TBusinessDurationData, row: any) => {
        const iso = businessDurationDataToIso(duration);
        const ms = isoDurationToBusinessMs(iso);
        const loggedMinutes = ms ? Math.floor(ms / (1000 * 60)) : 0;
        const expectedMinutes = days.length * 8 * 60;
        const percent = expectedMinutes > 0 ? Math.min(100, Math.round((loggedMinutes / expectedMinutes) * 100)) : 0;
        return (
            // <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <DurationFormat duration={duration} />
                <Progress percent={percent} 
                    size="small"
                    showInfo={true}
                    style={{ width: 100 }} />
            </div>
        );
      },
    },
  ];

  const dataSource = team.map((user) => {
    
    const userTracks = tracks.filter((t) => t.uid === user.uid);
    const dayDurations: Record<string, TBusinessDurationData> = {};
    for (const day of days) {
      const tracksForDay = userTracks.filter((t) => DateWrapper.getDate({ date: t.start, utcOffsetInMinutes }).format('YYYY-MM-DD') === day);
      dayDurations[day] = sumDurations(tracksForDay);
    }
    const total = sumDurations(userTracks);
    // console.log(total)
    return {
      key: user.uid,
      display: user.display,
      ...dayDurations,
      total,
    };
  });

  // Calculate totals for each day and grand total
  const totalByDay: Record<string, TBusinessDurationData> = {};
  let allTracks: TTransformedTracksByUser[] = [];
  for (const day of days) {
    const tracksForDay = tracks.filter((t) => DateWrapper.getDate({ date: t.start, utcOffsetInMinutes }).format('YYYY-MM-DD') === day);
    totalByDay[day] = sumDurations(tracksForDay);
    // console.log(totalByDay[day])
    allTracks = allTracks.concat(tracksForDay);
  }
  const grandTotal = sumDurations(tracks);

  const tracksUpToToday = tracks.filter(t =>
    DateWrapper.getDate({ date: t.start, utcOffsetInMinutes }).format('YYYY-MM-DD') <= today
  );
  const grandTotalUpToToday = sumDurations(tracksUpToToday);
//   console.log(grandTotal)

  return (
    <Table
      columns={columns}
      dataSource={dataSource}
      pagination={false}
      scroll={{ x: true }}
      summary={() => (
        <Table.Summary.Row className={styles.sticky}>
          <Table.Summary.Cell index={0}><b>{message('track.total.daily')}</b></Table.Summary.Cell>
          {days.map((day, idx) => (
            <Table.Summary.Cell index={idx + 1} key={day}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                <DurationFormat duration={totalByDay[day]} />
                <Progress
                  percent={Math.min(
                    100,
                    Math.round(
                      ((isoDurationToBusinessMs(businessDurationDataToIso(totalByDay[day])) ?? 0) / (team.length * 8 * 60 * 1000 * 60)) * 100
                    )
                  )}
                  size="small"
                  showInfo={false}
                  style={{ width: 100 }}
                />
              </div>
            </Table.Summary.Cell>
          ))}
          <Table.Summary.Cell index={days.length + 1}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
              <DurationFormat duration={grandTotalUpToToday} />
              <Progress
                percent={Math.min(
                  100,
                  Math.round(
                    ((isoDurationToBusinessMs(businessDurationDataToIso(grandTotalUpToToday)) ?? 0) / (team.length * daysUpToToday.length * 8 * 60 * 1000 * 60)) * 100
                  )
                )}
                size="small"
                showInfo={true}
                style={{ width: 100 }}
              />
            </div>
          </Table.Summary.Cell>
        </Table.Summary.Row>
      )}
    />
  );
} 