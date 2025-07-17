import React from 'react';
import { Table, Progress, Badge, Popover, Row, Flex, Button } from 'antd';
import { DateWrapper } from 'features/date/lib/DateWrapper';
import { TYandexUser } from 'entities/user/yandex/model/types';
import { TTransformedTracksByUser, TBusinessDurationData } from 'entities/track/common/model/types';

import { isoDurationToBusinessMs } from 'entities/track/common/lib/iso-duration-to-business-ms';

import { DurationFormat } from 'features/date/ui/DurationFormat';
import { msToBusinessDurationData } from 'entities/track/common/lib/ms-to-business-duration-data';
import { businessDurationDataToIso } from 'entities/track/common/lib/business-duration-data-to-iso';
import { Text } from 'components';
import { isRuLocale } from 'entities/locale/lib/helpers';
import { useCurrentLocale, useMessage } from 'entities/locale/lib/hooks';
import { DATE_FORMAT_MONTH } from 'features/date/lib/constants';
import clsx from 'clsx';
import { Message } from 'entities/locale/ui/Message';
import { ExportOutlined } from '@ant-design/icons';
import { getExpectedHoursForDay } from 'entities/track/common/lib/hooks/use-expected-hours-for-day';

import styles from './ReportsTable.module.scss';

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

type TReportsTableProps = {
  team: Array<Pick<TYandexUser, 'uid' | 'login' | 'display'>>;
  tracks: TTransformedTracksByUser[];
  from: string;
  to: string;
  utcOffsetInMinutes: number | undefined;
  showWeekends: boolean;
  isDarkMode: boolean;
};

function sumDurations(tracks: TTransformedTracksByUser[]): TBusinessDurationData {
  const ms = tracks.reduce((acc, t) => acc + (isoDurationToBusinessMs(t.duration) ?? 0), 0);
  return msToBusinessDurationData(ms);
}

export function ReportsTable({ team, tracks, from, to, utcOffsetInMinutes, showWeekends, isDarkMode }: TReportsTableProps) {
  //   const days = useRange({ from, to, showWeekends, utcOffsetInMinutes });
  //   console.log('days:', days);
  const message = useMessage();
  const days = getDaysArray(from, to, utcOffsetInMinutes, showWeekends);
  const today = DateWrapper.getDate({ utcOffsetInMinutes }).format('YYYY-MM-DD');
  const currentLocale = useCurrentLocale();

  const daysUpToToday = days.filter((day) => day <= today);

  const dayHeaders = days.map((day) => {
    const dateObj = DateWrapper.getDate({ date: day, utcOffsetInMinutes });
    const dateFormat = DateWrapper.getDateFormat(dateObj, DATE_FORMAT_MONTH);
    const dayFormat = DateWrapper.getDateFormat(dateObj, isRuLocale(currentLocale) ? 'dd' : 'ddd');
    const isWeekend = DateWrapper.isWeekend(dateObj);
    const isHoliday = DateWrapper.isHoliday(dateObj);
    const isPreholiday = DateWrapper.isPreholiday(dateObj);
    const expectedHours = getExpectedHoursForDay(day);

    let popoverContent = '';
    let marker = '';
    if (isHoliday) {
      popoverContent = message('calendar.holiday') || 'Holiday: non-working day';
      marker = ' *';
    } else if (isPreholiday) {
      popoverContent = message('calendar.preholiday') || 'Preholiday: shortened workday';
      marker = ' *';
    }

    return {
      key: day,
      dataIndex: day,
      isWeekend,
      isHoliday,
      expectedHours,
      title: (
        <div>
          {isHoliday || isPreholiday ? (
            <Popover content={popoverContent}>
              <span>
                <Text fs={13} fw={800} style={{ textTransform: 'capitalize', color: isHoliday ? '#d00' : undefined }}>
                  {dayFormat}
                </Text>
                <Text fs={13} style={{ color: isHoliday ? '#d00' : undefined }}>
                  {' '}
                  {dateFormat}
                  {marker}
                </Text>
              </span>
            </Popover>
          ) : (
            <>
              <Text fs={13} fw={800} style={{ textTransform: 'capitalize' }}>
                {dayFormat}
              </Text>
              <Text fs={13}> {dateFormat}</Text>
            </>
          )}
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
      // onHeaderCell: () => ({ style: { width: 250 } }),
      sorter: (a: Record<string, unknown>, b: Record<string, unknown>) =>
        String(a.display).localeCompare(String(b.display)),
      render: (display: string) => <Text style={{ minWidth: 200, display: 'inline-block' }}>{display}</Text>,
    },
    ...dayHeaders.map(({ key, title, dataIndex, isWeekend, isHoliday, expectedHours }) => ({
      title,
      dataIndex, // use dataIndex here
      key,
      className: clsx(styles.col, { [styles.col_weekend_light]: (isWeekend || isHoliday) && !isDarkMode }, { [styles.col_weekend_dark]: (isWeekend || isHoliday) && isDarkMode  }),
      render: (iso: TBusinessDurationData) => {
        const ms = isoDurationToBusinessMs(businessDurationDataToIso(iso));
        const loggedHours = ms ? Math.floor(ms / (1000 * 60 * 60)) : 0;
        const isFullDay = loggedHours > 0 && loggedHours === expectedHours;
        const isInvalid = loggedHours > expectedHours;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            {isInvalid ? (
              <Popover content={message('track.log.message')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Badge status="error" />
                  <DurationFormat duration={iso} />
                </div>
              </Popover>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {isFullDay && <Badge status="success" />}
                <DurationFormat duration={iso} />
              </div>
            )}
          </div>
        );
      },
    })),
    {
      title: message('track.total.logged'),
      dataIndex: 'total',
      key: 'total',
      fixed: 'right' as const,
      defaultSortOrder: 'descend' as const,
      // onHeaderCell: () => ({ style: { minWidth: 250 } }),
      sorter: (a: Record<string, unknown>, b: Record<string, unknown>) => {
        const aMs = isoDurationToBusinessMs(businessDurationDataToIso(a.total as TBusinessDurationData));
        const bMs = isoDurationToBusinessMs(businessDurationDataToIso(b.total as TBusinessDurationData));
        return (aMs || 0) - (bMs || 0);
      },
      render: (duration: TBusinessDurationData, _row: Record<string, unknown>) => {
        const iso = businessDurationDataToIso(duration);
        const ms = isoDurationToBusinessMs(iso);
        const loggedMinutes = ms ? Math.floor(ms / (1000 * 60)) : 0;
        const expectedMinutes = days.reduce((sum, day) => sum + getExpectedHoursForDay(day) * 60, 0);
        const percent = expectedMinutes > 0 ? Math.min(100, Math.round((loggedMinutes / expectedMinutes) * 100)) : 0;
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 200 }}>
            <Text fs={13} fw={800} style={{ textTransform: 'capitalize', minWidth: 55 }}>
              <DurationFormat duration={duration} />
            </Text>
            <span style={{ color: '#888', fontSize: 10 }}>
              <DurationFormat duration={msToBusinessDurationData(expectedMinutes * 60 * 1000)} />
            </span>
            <Progress
              percent={percent}
              size="small"
              showInfo
              // style={{ width: 100 }}
            />
          </div>
        );
      },
    },
  ];

  const dataSource = team.map((user) => {
    const userTracks = tracks.filter((t) => t.uid === user.uid);
    const dayDurations: Record<string, TBusinessDurationData> = {};
    for (const day of days) {
      const tracksForDay = userTracks.filter(
        (t) => DateWrapper.getDate({ date: t.start, utcOffsetInMinutes }).format('YYYY-MM-DD') === day,
      );
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
    const tracksForDay = tracks.filter(
      (t) => DateWrapper.getDate({ date: t.start, utcOffsetInMinutes }).format('YYYY-MM-DD') === day,
    );
    totalByDay[day] = sumDurations(tracksForDay);
    // console.log(totalByDay[day])
    allTracks = allTracks.concat(tracksForDay);
  }
  // const grandTotal = sumDurations(tracks);

  const tracksUpToToday = tracks.filter(
    (t) => DateWrapper.getDate({ date: t.start, utcOffsetInMinutes }).format('YYYY-MM-DD') <= today,
  );
  const grandTotalUpToToday = sumDurations(tracksUpToToday);
  //   console.log(grandTotal)

  return (
    <>
      <Flex justify="flex-start" vertical>
        <Row>
          <Text style={{ alignItems: 'center', display: 'flex' }}>
            <Message id="track.powerbi.message" />
          </Text>
          <Button
            type="link"
            icon={<ExportOutlined />}
            target="_blank"
            href="https://powerbi.data.lmru.tech/reports/powerbi/Отчеты Power BI/HR Analytics/Учет трудозатрат ЛМЦТ"
          >
            {message('track.powerbi.link')}
          </Button>
        </Row>
      </Flex>
      <Table
        columns={columns}
        dataSource={dataSource}
        pagination={false}
        scroll={{ x: true, y: `calc(100vh - 302px)` }}
        summary={() => (
          <Table.Summary.Row className={clsx(styles.sticky, { [styles.sticky_dark]: isDarkMode }, { [styles.sticky_light]: !isDarkMode })}>
            <Table.Summary.Cell index={0}>
              <b>{message('track.total.daily')}</b>
            </Table.Summary.Cell>
            {days.map((day, idx) => (
              <Table.Summary.Cell index={idx + 1} key={day}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                  <Text fs={13} fw={800} style={{ textTransform: 'capitalize' }}>
                    <DurationFormat duration={totalByDay[day]} />
                  </Text>
                  <span style={{ color: '#888', fontSize: 10 }}>
                    <DurationFormat
                      duration={msToBusinessDurationData(team.length * getExpectedHoursForDay(day) * 60 * 60 * 1000)}
                    />
                  </span>
                  <Progress
                    percent={Math.min(
                      100,
                      Math.round(
                        ((isoDurationToBusinessMs(businessDurationDataToIso(totalByDay[day])) ?? 0) /
                          (team.length * getExpectedHoursForDay(day) * 60 * 60 * 1000)) *
                          100,
                      ),
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
                <Text fs={13} fw={800} style={{ textTransform: 'capitalize' }}>
                  <DurationFormat duration={grandTotalUpToToday} />
                </Text>
                <span style={{ color: '#888', fontSize: 10 }}>
                  <DurationFormat
                    duration={msToBusinessDurationData(
                      team.length *
                        daysUpToToday.reduce((sum, day) => sum + getExpectedHoursForDay(day) * 60, 0) *
                        60 *
                        1000,
                    )}
                  />
                </span>
                <Progress
                  percent={Math.min(
                    100,
                    Math.round(
                      ((isoDurationToBusinessMs(businessDurationDataToIso(grandTotalUpToToday)) ?? 0) /
                        (team.length *
                          daysUpToToday.reduce((sum, day) => sum + getExpectedHoursForDay(day) * 60, 0) *
                          60 *
                          1000)) *
                        100,
                    ),
                  )}
                  size="small"
                  showInfo
                  // style={{ width: 100 }}
                />
              </div>
            </Table.Summary.Cell>
          </Table.Summary.Row>
        )}
      />
    </>
  );
}
