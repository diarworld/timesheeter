import { Modal, Table, Space, Typography, TableProps, Flex, Button, Input, message as antMessage, Popover } from 'antd';
import { useMessage } from 'entities/locale/lib/hooks';
import { IGraphCalendarResponse } from 'entities/track/common/model/ews-api';
import { DateWrapper } from 'features/date/lib/DateWrapper';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { ScheduleFilled } from '@ant-design/icons';
import { TTrackerConfig, isJiraTrackerCfg, isYandexTrackerCfg } from 'entities/tracker/model/types';
import { useCreateJiraTrack } from 'entities/track/jira/lib/hooks/use-create-jira-track';
import { useCreateYandexTrack } from 'entities/track/yandex/lib/hooks/use-create-yandex-track';

import { humanReadableDurationToISO } from 'entities/track/common/lib/human-readable-duration-to-iso';
import './CalendarExportModal.scss';
import { YandexIssuesSearchConnected } from 'entities/track/yandex/ui/YandexIssuesSearchConnected/YandexIssuesSearchConnected';
import { isoDurationToSeconds } from '../../lib/iso-duration-to-seconds';

const { Text, Title } = Typography;

interface IDataType {
  key: string;
  subject: React.Key;
  start: string;
  end: string;
  duration: number;
  issueKey?: string;
  requiredAttendees?: string[];
  optionalAttendees?: string[];
  participants?: number;
  organizer?: string;
}

interface ICalendarExportModalProps {
  visible: boolean;
  onHidden: () => void;
  data: IGraphCalendarResponse | null;
  loading: boolean;
  tracker: TTrackerConfig;
}

export const CalendarExportModal: React.FC<ICalendarExportModalProps> = ({
  visible,
  onHidden,
  data,
  loading,
  tracker,
}) => {
  const message = useMessage();
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [issueKeys, setIssueKeys] = useState<Record<string, string>>({});
  const [issueDurations, setIssueDurations] = useState<Record<string, number>>({});

  // Load default issue key from localStorage on component mount
  const [defaultIssueKey, setDefaultIssueKey] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('defaultIssueKey');
      return saved || 'PM-4';
    } catch {
      return 'PM-4';
    }
  });

  const [isImporting, setIsImporting] = useState(false);

  // Add state for editing subject
  const [editingSubjectKey, setEditingSubjectKey] = useState<string | null>(null);
  const [editingSubjectValue, setEditingSubjectValue] = useState<string>('');
  const [subjects, setSubjects] = useState<Record<string, string>>({});

  // Add state for editing issueKey
  const [editingIssueKey, setEditingIssueKey] = useState<string | null>(null);
  const [editingIssueKeyValue, setEditingIssueKeyValue] = useState<string>('');

  // Get the appropriate track creation hook based on tracker type
  const jiraTrackHook = useCreateJiraTrack(tracker);
  const yandexTrackHook = useCreateYandexTrack(tracker);

  const createTrack = isJiraTrackerCfg(tracker) ? jiraTrackHook.createTrack : yandexTrackHook.createTrack;

  // handleIssueKeyChange is not used in this component but kept for interface compatibility
  const handleIssueKeyChange = (key: string, value: string) => {
    setIssueKeys((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const validateIssueKey = (value: string) => {
    const regex = /^[A-Za-z]+-[0-9]+$/;
    return regex.test(value);
  };

  // const tableData =
  //   data?.meetings.map((meeting, index) => ({
  //     key: meeting.id ? String(meeting.id) : String(index),
  //     ...meeting,
  //   })) || [];

  // Helper: get rules from localStorage
  function getTimesheeterRules() {
    try {
      const rulesStr = localStorage.getItem('timesheeterRules');
      if (!rulesStr) return [];
      return JSON.parse(rulesStr);
    } catch {
      return [];
    }
  }

  // Helper: check if a meeting matches a rule (case-insensitive)
  function meetingMatchesRule(meeting: IDataType, rule: any) {
    if (!rule.conditions || rule.conditions.length === 0) return false;
    let result = null;
    for (let i = 0; i < rule.conditions.length; i++) {
      const cond = rule.conditions[i];
      let condResult = false;
      const op = cond.operator;
      const val = cond.value?.toString() || '';

      if (cond.field === 'participants') {
        if (op === '>' || op === '<' || op === '=') {
          const num = typeof meeting.participants === 'number' ? meeting.participants : Number(meeting.participants);
          const cmp = parseFloat(val);
          if (op === '>') condResult = num > cmp;
          else if (op === '<') condResult = num < cmp;
          else if (op === '=') condResult = num === cmp;
        } else if (op === 'includes' || op === 'not_includes') {
          const allEmails = [
            ...(meeting.requiredAttendees || []),
            ...(meeting.optionalAttendees || [])
          ];
          if (op === 'includes') condResult = allEmails.includes(val);
          else condResult = !allEmails.includes(val);
        }
      } else if (cond.field === 'summary') {
        const fieldValue = String(meeting.subject || '');
        if (op === 'equals') condResult = fieldValue.localeCompare(val, undefined, { sensitivity: 'accent' }) === 0;
        else if (op === 'contains') condResult = fieldValue.toLowerCase().includes(val.toLowerCase());
        else if (op === 'not_contains') condResult = !fieldValue.toLowerCase().includes(val.toLowerCase());
      } else if (cond.field === 'duration') {
        // meeting.duration is in minutes, val is human-readable (e.g. '1h 30m')
        const fieldMinutes = typeof meeting.duration === 'number' ? meeting.duration : Number(meeting.duration);
        const iso = humanReadableDurationToISO(val);
        const seconds = iso ? isoDurationToSeconds(iso) : undefined;
        const compareMinutes = typeof seconds === 'number' ? seconds / 60 : NaN;
        if (op === '>') condResult = fieldMinutes > compareMinutes;
        else if (op === '<') condResult = fieldMinutes < compareMinutes;
        else if (op === '=') condResult = fieldMinutes === compareMinutes;
      } else if (cond.field === 'organizer') {
        const fieldValue = meeting.organizer || '';
        if (op === 'is') condResult = fieldValue.localeCompare(val, undefined, { sensitivity: 'accent' }) === 0;
        else if (op === 'is_not') condResult = fieldValue.localeCompare(val, undefined, { sensitivity: 'accent' }) !== 0;
      }

      // Logic
      if (i === 0) {
        result = condResult;
      } else {
        const logic = cond.logic || 'AND';
        if (logic === 'AND') result = result && condResult;
        else result = result || condResult;
      }
    }
    return !!result;
  }
  const tableData = data?.value || [];
  // Apply rules to all meetings and set issueKeys
  const applyRulesToAll = () => {
    const rules = getTimesheeterRules();
    const newIssueKeys: Record<string, string> = {};
    const newIssueDurations: Record<string, number> = {};
    const filteredTableData: IDataType[] = [];
    tableData.forEach((record: IDataType) => {
      let matchedKey = defaultIssueKey;
      let newDuration = record.duration;
      let skip = false;
      for (const rule of rules) {
        if (!rule.actions) continue;
        if (meetingMatchesRule(record, rule)) {
          const skipAction = rule.actions.find((a: any) => a.type === 'skip' && a.value === 'true');
          if (skipAction) {
            skip = true;
            break;
          }
          const setTaskAction = rule.actions.find((a: any) => a.type === 'set_task');
          const setDurationAction = rule.actions.find((a: any) => a.type === 'set_duration');
          if (setTaskAction) {
            matchedKey = setTaskAction.value;
          }
          if (setDurationAction) {
            const duration = setDurationAction.value;
            const isoDuration = humanReadableDurationToISO(duration);
            if (isoDuration) {
              const seconds = isoDurationToSeconds(isoDuration);
              if (typeof seconds === 'number') {
                newDuration = seconds / 60;
              }
            }
          }
        }
      }
      if (!skip) {
        newIssueKeys[record.key] = matchedKey;
        newIssueDurations[record.key] = newDuration;
        filteredTableData.push(record);
      }
    });
    setIssueKeys(newIssueKeys);
    setIssueDurations(newIssueDurations);
    setFilteredTableData(filteredTableData);
  };

  // Add state for filtered table data
  const [filteredTableData, setFilteredTableData] = useState<IDataType[]>(tableData);

  // Save default issue key to localStorage whenever it changes
  const handleDefaultIssueKeyChange = (value: string) => {
    setDefaultIssueKey(value);
    try {
      localStorage.setItem('defaultIssueKey', value);
    } catch (error) {
      console.warn('Failed to save default issue key to localStorage:', error);
    }
  };

  // Handler to start editing
  const handleEditSubject = (key: string, currentValue: string) => {
    setEditingSubjectKey(key);
    setEditingSubjectValue(currentValue);
  };
  // Handler for input change
  const handleSubjectInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingSubjectValue(e.target.value);
  };
  // Handler to save edit
  const saveSubjectEdit = (key: string) => {
    setSubjects((prev) => ({ ...prev, [key]: editingSubjectValue }));
    setEditingSubjectKey(null);
    setEditingSubjectValue('');
  };
  // Handler to cancel edit
  const cancelSubjectEdit = () => {
    setEditingSubjectKey(null);
    setEditingSubjectValue('');
  };

  // Handler to start editing issueKey
  const handleEditIssueKey = (key: string, currentValue: string) => {
    setEditingIssueKey(key);
    setEditingIssueKeyValue(currentValue);
  };
  // Handler for input change
  const handleIssueKeyInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingIssueKeyValue(e.target.value);
  };
  // Handler to save edit
  const saveIssueKeyEdit = (key: string) => {
    setIssueKeys((prev) => ({ ...prev, [key]: editingIssueKeyValue }));
    setEditingIssueKey(null);
    setEditingIssueKeyValue('');
  };
  // Handler to cancel edit
  const cancelIssueKeyEdit = () => {
    setEditingIssueKey(null);
    setEditingIssueKeyValue('');
  };

  const handleImportTracks = async () => {
    if (selectedRowKeys.length === 0) return;

    setIsImporting(true);
    try {
      const selectedRows = filteredTableData.filter((record: IDataType) => selectedRowKeys.map(String).includes(record.key));
      const validRows = selectedRows.filter((row) => {
        const issueKey = issueKeys[String(row.key)] || defaultIssueKey;
        const duration = issueDurations[String(row.key)] || row.duration;
        const subject = subjects[String(row.key)] ?? row.subject;

        if (!validateIssueKey(issueKey)) {
          console.warn(`Invalid issue key for meeting: ${subject}`);
          return false;
        }

        // Convert duration from minutes to human readable format
        const hours = Math.floor(duration / 60);
        const minutes = duration % 60;
        const durationString = `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;

        // Convert to ISO duration
        const isoDuration = humanReadableDurationToISO(durationString);
        if (!isoDuration) {
          console.warn(`Invalid duration for meeting: ${subject}`);
          return false;
        }

        return true;
      });

      // Create all tracks in parallel
      const trackPromises = validRows.map((row) => {
        const issueKey = issueKeys[String(row.key)] || defaultIssueKey;
        const duration = issueDurations[String(row.key)] || row.duration;
        const subject = subjects[String(row.key)] ?? row.subject;
        const hours = Math.floor(duration / 60);
        const minutes = duration % 60;
        const durationString = `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;

        return createTrack({
          issueKey,
          start: row.start,
          duration: durationString,
          comment: `Meeting: ${subject}`,
        });
      });

      await Promise.all(trackPromises);

      // Show notification after successful import
      // Close modal after successful import
      antMessage.success(`${message('calendar.import.success')} ${message('calendar.import.success.description')}`);
      onHidden();
    } catch (error) {
      console.error('Error importing tracks:', error);
    } finally {
      setIsImporting(false);
    }
  };

  // Call applyRulesToAll on first open
  useEffect(() => {
    if (visible) {
      applyRulesToAll();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const columns = [
    {
      title: (
        <Popover
          content={
            <>
              {/* <CloseCircleFilled style={{ color: 'red' }}/> */}
              <span>{message('calendar.export.table.issue.help')}</span>
            </>
            // <Alert
            //   type="error"
            //   showIcon
            //   description={message('calendar.export.table.issue.help')}
            // />
          }
          arrow={false}
        >
          <span>
            {message('calendar.export.table.issue')}
            <span style={{ color: 'red' }}> *</span>
          </span>
        </Popover>
      ),
      dataIndex: 'issueKey',
      key: 'issueKey',
      width: 160,
      render: (text: string, record: IDataType) => {
        const key = String(record.key);
        const value = issueKeys[key] || defaultIssueKey;
        if (editingIssueKey === key) {
          return (
            <div className="editable-cell">
              {isYandexTrackerCfg(tracker) ? (
                <YandexIssuesSearchConnected
                  value={editingIssueKeyValue}
                  onChange={(newValue: string) => setEditingIssueKeyValue(newValue)}
                  tracker={tracker}
                  status={editingIssueKeyValue && !validateIssueKey(editingIssueKeyValue) ? 'error' : undefined}
                  placeholder="PM-4"
                  maxItems={50}
                  perPage={50}
                  onBlur={() => saveIssueKeyEdit(key)}
                  autoFocus
                  name={`issueKey-${key}`}
                  onFocus={() => {}}
                  style={{ width: '250px' }}
                />
              ) : (
                // Fallback: plain Input or JiraIssuesSearchConnected for Jira
                <Input
                  value={editingIssueKeyValue}
                  autoFocus
                  onChange={handleIssueKeyInputChange}
                  onBlur={() => saveIssueKeyEdit(key)}
                  onPressEnter={() => saveIssueKeyEdit(key)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') cancelIssueKeyEdit();
                  }}
                  onFocus={(e) => e.target.select()}
                  size="small"
                  status={value && !validateIssueKey(value) ? 'error' : ''}
                  placeholder="PM-4"
                  style={{ minWidth: 120 }}
                />
              )}
            </div>
          );
        }
        return (
          <div className="editable-cell editable-row">
            <div
              className="editable-cell-value-wrap"
              onClick={() => handleEditIssueKey(key, value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleEditIssueKey(key, value);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <Text
                strong
                style={{ cursor: 'pointer' }}
                type={value && !validateIssueKey(value) ? 'danger' : undefined}
              >
                {value}
              </Text>
            </div>
          </div>
        );
      },
    },
    {
      title: message('calendar.export.table.subject'),
      dataIndex: 'subject',
      key: 'subject',
      render: (text: string, record: IDataType) => {
        const key = String(record.key);
        if (editingSubjectKey === key) {
          return (
            <div className="editable-cell">
              <Input
                value={editingSubjectValue}
                autoFocus
                onChange={handleSubjectInputChange}
                onBlur={() => saveSubjectEdit(key)}
                onPressEnter={() => saveSubjectEdit(key)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') cancelSubjectEdit();
                }}
                onFocus={(e) => e.target.select()}
                size="small"
                style={{ minWidth: 120 }}
              />
            </div>
          );
        }
        return (
          <div className="editable-cell editable-row">
            <div
              className="editable-cell-value-wrap"
              onClick={() => handleEditSubject(key, subjects[key] ?? text)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleEditSubject(key, subjects[key] ?? text);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <Text strong style={{ cursor: 'pointer' }}>
                {subjects[key] ?? text}
              </Text>
            </div>
          </div>
        );
      },
    },
    {
      title: message('calendar.export.table.start'),
      dataIndex: 'start',
      key: 'start',
      render: (date: string) => <Text>{dayjs(date).format('MMM DD, YYYY HH:mm')}</Text>,
    },
    // {
    //   title: message('calendar.export.table.end'),
    //   dataIndex: 'end',
    //   key: 'end',
    //   render: (date: string) => (
    //     <Text>{dayjs(date).format('MMM DD, YYYY HH:mm')}</Text>
    //   ),
    // },
    {
      title: message('calendar.export.table.duration'),
      dataIndex: 'duration',
      key: 'duration',
      render: (minutes: number, record: IDataType) => (
        <Text>
          {message('date.hours.short', { value: (Math.floor((issueDurations[String(record.key)] || minutes) / 60)) })}{' '}
          {message('date.minutes.short', { value: (Math.floor((issueDurations[String(record.key)] || minutes) % 60)) })}
        </Text>
      ),
    },
    //   title: message('calendar.export.table.location'),
    //   dataIndex: 'location',
    //   key: 'location',
    //   render: (location: string) => location ? <Text>{location}</Text> : <Text type="secondary">-</Text>,
    // },
    // {
    //   title: message('calendar.export.table.type'),
    //   key: 'type',
    //   render: (record: any) => (
    //     <Space>
    //       {record.isAllDay && <Tag color="blue">{message('calendar.export.table.all.day')}</Tag>}
    //       {record.isCancelled && <Tag color="red">{message('calendar.export.table.cancelled')}</Tag>}
    //     </Space>
    //   ),
    // },
  ];

  // rowSelection object indicates the need for row selection
  const rowSelection: TableProps<IDataType>['rowSelection'] = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys) => {
      setSelectedRowKeys(newSelectedRowKeys.map(String));
    },
    getCheckboxProps: (record: IDataType) => ({
      disabled: false, // Column configuration not to be checked
      name: String(record.subject),
    }),
  };

  const handleRowClick = (record: IDataType) => {
    const { key } = record;
    const keyStr = String(key);
    const selectedKeysStr = selectedRowKeys.map(String);
    const newSelectedRowKeys = selectedKeysStr.includes(keyStr)
      ? selectedRowKeys.filter((k) => String(k) !== keyStr)
      : [...selectedRowKeys, keyStr];
    setSelectedRowKeys(newSelectedRowKeys);
  };

  return (
    <Modal
      title={
        <Space direction="vertical" size={0}>
          <Title level={4}>{message('calendar.export.results')}</Title>
          {data && (
            <Text type="secondary">
              {data.value.length} {message('calendar.export.results.top')}
            </Text>
            // <Text type="secondary">
            //   {data.totalMeetings} {message('calendar.export.results.top')}{' '}
            //   {message('calendar.export.results.top.from')}{' '}
            //   {DateWrapper.getDateFormat(dayjs(data.dateRange.start_date), 'DD MMMM YYYY')}{' '}
            //   {message('calendar.export.results.top.to')}{' '}
            //   {DateWrapper.getDateFormat(dayjs(data.dateRange.end_date), 'DD MMMM YYYY')}
            // </Text>
          )}
          <Space>
            <Text>{message('calendar.import.issue.key')}</Text>
            {/* <Input
            value={defaultIssueKey}
            onChange={(e) => handleDefaultIssueKeyChange(e.target.value)}
            placeholder="PM-4"
            style={{ width: 160 }}
            onFocus={(e) => e.target.select()}
            status={defaultIssueKey && !validateIssueKey(defaultIssueKey) ? 'error' : ''}
          /> */}
            {isYandexTrackerCfg(tracker) ? (
              <YandexIssuesSearchConnected
                value={defaultIssueKey}
                onChange={handleDefaultIssueKeyChange}
                tracker={tracker}
                status={defaultIssueKey && !validateIssueKey(defaultIssueKey) ? 'error' : undefined}
                placeholder="PM-4"
                maxItems={50}
                perPage={50}
                onBlur={() => saveIssueKeyEdit(defaultIssueKey)}
                autoFocus
                name={`issueKey-${defaultIssueKey}`}
                onFocus={() => {}}
                style={{ width: '540px' }}
              />
            ) : (
              // Fallback: plain Input or JiraIssuesSearchConnected for Jira
              <Input
                value={defaultIssueKey}
                autoFocus
                onChange={handleIssueKeyInputChange}
                onBlur={() => saveIssueKeyEdit(defaultIssueKey)}
                onPressEnter={() => saveIssueKeyEdit(defaultIssueKey)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') cancelIssueKeyEdit();
                }}
                onFocus={(e) => e.target.select()}
                size="small"
                status={defaultIssueKey && !validateIssueKey(defaultIssueKey) ? 'error' : ''}
                placeholder="PM-4"
                style={{ minWidth: 120 }}
              />
            )}
            <Button onClick={applyRulesToAll}>{message('calendar.export.default.set')}</Button>
          </Space>
        </Space>
      }
      open={visible}
      onCancel={onHidden}
      footer={null}
      width={1200}
      destroyOnHidden
    >
      <Table
        bordered
        rowSelection={{ type: 'checkbox', ...rowSelection }}
        columns={columns}
        dataSource={filteredTableData}
        loading={loading}
        onRow={(record: IDataType) => ({
          onClick: (event) => {
            // Prevent row selection if clicking inside an input or textarea
            if (
              event.target instanceof HTMLElement &&
              (event.target.tagName === 'INPUT' ||
                event.target.closest('.editable-cell-value-wrap') ||
                event.target.closest('.editable-cell'))
            ) {
              return;
            }
            handleRowClick(record);
          },
          style: { cursor: 'pointer' },
        })}
        pagination={{
          showTotal: (total, range) => `${range[0]}-${range[1]} ${message('calendar.export.results.top.of')} ${total}`,
          showSizeChanger: true,
        }}
        // scroll={{ x: 800 }}
        scroll={{ x: 'max-content' }}
        size="middle"
      />
      <Flex gap="middle" justify="space-evenly" vertical>
        <Button
          type="primary"
          icon={<ScheduleFilled />}
          onClick={handleImportTracks}
          disabled={selectedRowKeys.length === 0 || isImporting}
          loading={isImporting}
        >
          {message('calendar.import')}
        </Button>
      </Flex>
    </Modal>
  );
};
