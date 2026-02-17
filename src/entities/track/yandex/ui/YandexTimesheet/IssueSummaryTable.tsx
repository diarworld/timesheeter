import React from 'react';
import { Table, Flex, Button, Avatar, Row, Progress, theme } from 'antd';
import { TYandexUser } from 'entities/user/yandex/model/types';
import { TBusinessDurationData } from 'entities/track/common/model/types';
import { isoDurationToBusinessMs } from 'entities/track/common/lib/iso-duration-to-business-ms';
import { DurationFormat } from 'features/date/ui/DurationFormat';
import { msToBusinessDurationData } from 'entities/track/common/lib/ms-to-business-duration-data';
import { businessDurationDataToIso } from 'entities/track/common/lib/business-duration-data-to-iso';
import { DateWrapper } from 'features/date/lib/DateWrapper';
import { Text } from 'components';
import { useMessage } from 'entities/locale/lib/hooks';
import { Message } from 'entities/locale/ui/Message';
import { ExportOutlined, UserOutlined, LinkOutlined } from '@ant-design/icons';
import { useGetUserExtrasQuery } from 'entities/user/common/model/api';
import { useRuntimeConfig } from 'shared/lib/useRuntimeConfig';
import { TIssueSummaryRow } from 'entities/track/common/lib/transform-tracks-by-issue';
import { getExpectedHoursForDay } from 'entities/track/common/lib/hooks/use-expected-hours-for-day';

import styles from './IssueSummaryTable.module.scss';
import clsx from 'clsx';

const DEBUG = process.env.DEBUG === 'true' || process.env.LOG_LEVEL === 'debug';
const MAX_CHARS_PER_LINE = 40;
const LINE_ELLIPSIS = '...';

interface IUserDisplayWithPhotoProps {
  uid: number;
  display: string;
}

const UserDisplayWithPhoto: React.FC<IUserDisplayWithPhotoProps> = ({ uid, display }) => {
  const { data: userExtras } = useGetUserExtrasQuery(uid, {
    skip: !uid,
  });

  return (
    <Flex align="center" gap={8} style={{ width: '100%', minWidth: 0 }}>
      {userExtras?.photo ? (
        <Avatar src={`data:image/jpeg;base64,${userExtras.photo}`} size={24} />
      ) : (
        <Avatar icon={<UserOutlined />} size={24} />
      )}
      <Text style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{display}</Text>
    </Flex>
  );
};

type TIssueSummaryTableProps = {
  team: Array<Pick<TYandexUser, 'uid' | 'login' | 'display'>>;
  issueSummaryData: TIssueSummaryRow[];
  isDarkMode: boolean;
  trackerUrl?: string;
  from: string;
  to: string;
  utcOffsetInMinutes: number | undefined;
  showWeekends: boolean;
};

export function IssueSummaryTable({
  team,
  issueSummaryData,
  isDarkMode: _isDarkMode,
  trackerUrl,
  from,
  to,
  utcOffsetInMinutes,
  showWeekends,
}: TIssueSummaryTableProps) {
  if (DEBUG) {
    console.warn('[IssueSummaryTable] Render', {
      teamSize: team.length,
      issueCount: issueSummaryData.length,
    });
  }

  const message = useMessage();
  const { powerBiUrl } = useRuntimeConfig();
  const { token } = theme.useToken();

  const days = React.useMemo(() => {
    const start = DateWrapper.getDate({ date: from, utcOffsetInMinutes });
    const end = DateWrapper.getDate({ date: to, utcOffsetInMinutes });
    const daysArr: string[] = [];
    let current = start.clone();
    while (current.isBefore(end, 'day') || current.isSame(end, 'day')) {
      const dayOfWeek = current.day();
      if (showWeekends || (dayOfWeek !== 0 && dayOfWeek !== 6)) {
        daysArr.push(current.format('YYYY-MM-DD'));
      }
      current = current.add(1, 'day');
    }
    return daysArr;
  }, [from, to, utcOffsetInMinutes, showWeekends]);

  const expectedMsPerUser = React.useMemo(() => {
    return days.reduce((sum, day) => sum + getExpectedHoursForDay(day) * 60 * 60 * 1000, 0);
  }, [days]);

  const columns = [
    {
      title: message('report.issue'),
      dataIndex: 'issueKey',
      key: 'issueKey',
      fixed: 'left' as const,
      width: 250,
      sorter: (a: Record<string, unknown>, b: Record<string, unknown>) =>
        String(a.issueKey).localeCompare(String(b.issueKey)),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      render: (issueKey: string, record: any) => {
        const issueUrl = trackerUrl ? `${trackerUrl}${issueKey}` : undefined;
        return (
          <Flex vertical gap={2} style={{ width: '100%', minWidth: 0, padding: '4px 0' }}>
            <Flex align="center" gap={8}>
              <Button
                type="link"
                icon={<LinkOutlined />}
                size="small"
                href={issueUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ padding: 0, flexShrink: 0, fontWeight: 900 }}
              >
                {issueKey}
              </Button>
            </Flex>
            {record.issueSummary &&
              (() => {
                const words = record.issueSummary.split(' ');
                const lines: string[] = [];
                let currentLine = '';

                for (const word of words) {
                  if ((currentLine + ' ' + word).trim().length <= MAX_CHARS_PER_LINE) {
                    currentLine = (currentLine + ' ' + word).trim();
                  } else {
                    if (currentLine) lines.push(currentLine);
                    currentLine = word;
                  }
                }
                if (currentLine) lines.push(currentLine);

                return (
                  <>
                    {lines.slice(0, 2).map((line, idx) => (
                      <Text
                        key={idx}
                        type="secondary"
                        style={{
                          fontSize: 12,
                          display: 'block',
                          maxWidth: '100%',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {line}
                        {idx === 1 && lines.length > 2 ? LINE_ELLIPSIS : ''}
                      </Text>
                    ))}
                  </>
                );
              })()}
          </Flex>
        );
      },
    },
    ...team.map((user) => ({
      title: <UserDisplayWithPhoto uid={user.uid} display={user.display || user.login} />,
      dataIndex: user.uid.toString(),
      key: user.uid,
      width: 220,
      sorter: (a: Record<string, unknown>, b: Record<string, unknown>) => {
        const aUsers = a.users as Record<number, TBusinessDurationData> | undefined;
        const bUsers = b.users as Record<number, TBusinessDurationData> | undefined;
        const aData = aUsers?.[user.uid];
        const bData = bUsers?.[user.uid];
        const aMs = aData ? (isoDurationToBusinessMs(businessDurationDataToIso(aData)) ?? 0) : 0;
        const bMs = bData ? (isoDurationToBusinessMs(businessDurationDataToIso(bData)) ?? 0) : 0;
        return aMs - bMs;
      },
      render: (duration: TBusinessDurationData) => {
        if (!duration || (duration.hours === 0 && duration.minutes === 0)) {
          return <Text type="secondary">-</Text>;
        }
        return <DurationFormat duration={duration} />;
      },
    })),
    {
      title: message('report.totalTime'),
      dataIndex: 'total',
      key: 'total',
      fixed: 'right' as const,
      width: 150,
      defaultSortOrder: 'ascend' as const,
      sorter: (a: Record<string, unknown>, b: Record<string, unknown>) => {
        const aTotal = a.total as TBusinessDurationData;
        const bTotal = b.total as TBusinessDurationData;
        const aMs = aTotal ? (isoDurationToBusinessMs(businessDurationDataToIso(aTotal)) ?? 0) : 0;
        const bMs = bTotal ? (isoDurationToBusinessMs(businessDurationDataToIso(bTotal)) ?? 0) : 0;
        return bMs - aMs;
      },
      render: (total: TBusinessDurationData) => {
        if (!total || (total.hours === 0 && total.minutes === 0)) {
          return <Text type="secondary">-</Text>;
        }
        return (
          <Text fw={800}>
            <DurationFormat duration={total} />
          </Text>
        );
      },
    },
  ];

  const dataSource = issueSummaryData.map((row) => ({
    key: row.issueKey,
    issueKey: row.issueKey,
    issueSummary: row.issueSummary,
    users: row.users,
    total: row.total,
    ...row.users,
  }));

  const grandTotal: TBusinessDurationData = React.useMemo(() => {
    let totalMs = 0;
    for (const row of issueSummaryData) {
      totalMs += isoDurationToBusinessMs(businessDurationDataToIso(row.total)) ?? 0;
    }
    return msToBusinessDurationData(totalMs);
  }, [issueSummaryData]);

  if (issueSummaryData.length === 0) {
    return (
      <Flex justify="center" align="center" style={{ padding: 48 }}>
        <Text type="secondary">{message('report.noIssues')}</Text>
      </Flex>
    );
  }

  return (
    <>
      <Flex justify="flex-start" vertical>
        <Row>
          <Text style={{ alignItems: 'center', display: 'flex' }}>
            <Message id="track.powerbi.message" />
          </Text>
          <Button type="link" icon={<ExportOutlined />} target="_blank" href={powerBiUrl}>
            {message('track.powerbi.link')}
          </Button>
        </Row>
      </Flex>
      <Table
        columns={columns}
        dataSource={dataSource}
        pagination={false}
        tableLayout="fixed"
        scroll={{ x: 'max-content', y: `calc(100vh - 302px)` }}
        summary={() => (
          <Table.Summary.Row
            className={clsx(
              styles.sticky,
              { [styles.sticky_dark]: _isDarkMode },
              { [styles.sticky_light]: !_isDarkMode },
            )}
          >
            <Table.Summary.Cell index={0}>
              <Flex vertical gap={2}>
                <b>{message('track.total.daily')}</b>
                <Text type="secondary" fs={11}>
                  {message('report.issue.total', { count: issueSummaryData.length })}
                </Text>
                <Text type="secondary" fs={11}>
                  {message('report.issue.avg', {
                    avg: team.length > 0 ? (issueSummaryData.length / team.length).toFixed(1) : 0,
                  })}
                </Text>
              </Flex>
            </Table.Summary.Cell>
            {team.map((user, idx) => {
              let userTotalMs = 0;
              for (const row of issueSummaryData) {
                const userData = row.users[user.uid];
                if (userData) {
                  userTotalMs += isoDurationToBusinessMs(businessDurationDataToIso(userData)) ?? 0;
                }
              }
              const percent =
                expectedMsPerUser > 0 ? Math.min(100, Math.round((userTotalMs / expectedMsPerUser) * 100)) : 0;
              return (
                <Table.Summary.Cell index={idx + 1} key={user.uid}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                    <Text fw={800}>
                      <DurationFormat duration={msToBusinessDurationData(userTotalMs)} />
                    </Text>
                    <Progress percent={percent} size="small" showInfo={false} style={{ width: 100 }} />
                  </div>
                </Table.Summary.Cell>
              );
            })}
            <Table.Summary.Cell index={team.length + 1}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
                <Text fw={800}>
                  <DurationFormat duration={grandTotal} />
                </Text>
                <span style={{ color: token.colorTextQuaternary, fontSize: 10 }}>
                  <DurationFormat duration={msToBusinessDurationData(expectedMsPerUser * team.length)} />
                </span>
                <Progress
                  percent={Math.min(
                    100,
                    Math.round(
                      ((isoDurationToBusinessMs(businessDurationDataToIso(grandTotal)) ?? 0) /
                        (expectedMsPerUser * team.length)) *
                        100,
                    ),
                  )}
                  size="small"
                  showInfo
                />
              </div>
            </Table.Summary.Cell>
          </Table.Summary.Row>
        )}
      />
    </>
  );
}
