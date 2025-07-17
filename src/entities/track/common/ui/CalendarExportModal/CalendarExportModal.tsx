import {
  Modal,
  Table,
  Space,
  Typography,
  TableProps,
  Flex,
  Button,
  Input,
  message as antMessage,
  Popover,
  Badge,
} from 'antd';
import { useMessage } from 'entities/locale/lib/hooks';
import { IEwsCalendarResponse, IMeetingOrganizer } from 'entities/track/common/model/ews-api';
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
import { validateHumanReadableDuration } from 'entities/track/common/lib/validate-human-readable-duration';
import { DurationFormat } from 'features/date/ui/DurationFormat/DurationFormat';
import { useFormatDuration } from 'entities/track/common/lib/hooks/use-format-duration';
import { msToBusinessDurationData } from 'entities/track/common/lib/ms-to-business-duration-data';

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
  organizer?: IMeetingOrganizer;
}

interface ICalendarExportModalProps {
  visible: boolean;
  onHidden: () => void;
  data: IEwsCalendarResponse | null;
  loading: boolean;
  tracker: TTrackerConfig;
}

// Define types for rule and action
interface IRuleAction {
  type: string;
  value: string;
}
interface ITimesheeterRule {
  conditions: Array<unknown>; // Replace with a more specific type if known
  actions: IRuleAction[];
}
interface ITimesheeterRuleCondition {
  field: string;
  operator: string;
  value: string;
  logic: string;
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

  // Add state for editing duration
  const [editingDurationKey, setEditingDurationKey] = useState<string | null>(null);
  const [editingDurationValue, setEditingDurationValue] = useState<string>('');
  const [editingDurationError, setEditingDurationError] = useState<string>('');

  // Get the appropriate track creation hook based on tracker type
  const jiraTrackHook = useCreateJiraTrack(tracker);
  const yandexTrackHook = useCreateYandexTrack(tracker);

  const createTrack = isJiraTrackerCfg(tracker) ? jiraTrackHook.createTrack : yandexTrackHook.createTrack;

  // handleIssueKeyChange is not used in this component but kept for interface compatibility
  // 1. Remove unused handleIssueKeyChange
  // (function is not used, so remove it)

  const validateIssueKey = (value: string) => {
    const regex = /^[A-Za-z]+-[0-9]+$/;
    return regex.test(value);
  };

  const tableData =
    data?.meetings.map((meeting, index) => ({
      key: meeting.id ? String(meeting.id) : String(index),
      ...meeting,
    })) || [];

  // Add state for filtered table data
  const [filteredTableData, setFilteredTableData] = useState<IDataType[]>(tableData);

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
  function meetingMatchesRule(meeting: IDataType, rule: ITimesheeterRule) {
    if (!rule.conditions || rule.conditions.length === 0) return false;
    let result = null;
    for (let i = 0; i < rule.conditions.length; i += 1) {
      const cond = rule.conditions[i] as ITimesheeterRuleCondition;
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
          const allEmails = [...(meeting.requiredAttendees || []), ...(meeting.optionalAttendees || [])];
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
        const fieldName = meeting.organizer?.name || '';
        const fieldEmail = meeting.organizer?.address || '';
        if (op === 'is')
          condResult =
            fieldName.localeCompare(val, undefined, { sensitivity: 'accent' }) === 0 ||
            fieldEmail.localeCompare(val, undefined, { sensitivity: 'accent' }) === 0;
        else if (op === 'contains')
          condResult =
            fieldName.toLowerCase().includes(val.toLowerCase()) || fieldEmail.toLowerCase().includes(val.toLowerCase());
        else if (op === 'not_contains')
          condResult =
            !fieldName.toLowerCase().includes(val.toLowerCase()) &&
            !fieldEmail.toLowerCase().includes(val.toLowerCase());
        else if (op === 'is_not')
          condResult =
            fieldName.localeCompare(val, undefined, { sensitivity: 'accent' }) !== 0 &&
            fieldEmail.localeCompare(val, undefined, { sensitivity: 'accent' }) !== 0;
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

  // Apply rules to all meetings and set issueKeys
  const applyRulesToAll = () => {
    const rules: ITimesheeterRule[] = getTimesheeterRules();
    const newIssueKeys: Record<string, string> = {};
    const newIssueDurations: Record<string, number> = {};
    const newFilteredTableData: IDataType[] = [];
    tableData.forEach((record: IDataType) => {
      let matchedKey = defaultIssueKey;
      let newDuration = record.duration;
      let skip = false;
      for (const rule of rules) {
        if (!rule.actions) {
          continue;
        }
        if (meetingMatchesRule(record, rule)) {
          const skipAction = rule.actions.find((a: IRuleAction) => a.type === 'skip' && a.value === 'true');
          if (skipAction) {
            skip = true;
            break;
          }
          const setTaskAction = rule.actions.find((a: IRuleAction) => a.type === 'set_task');
          const setDurationAction = rule.actions.find((a: IRuleAction) => a.type === 'set_duration');
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
        newFilteredTableData.push(record);
      }
    });
    setIssueKeys(newIssueKeys);
    setIssueDurations(newIssueDurations);
    setFilteredTableData(newFilteredTableData);
  };

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

  // Helper to format business duration as string (like DurationFormat)
  function formatBusinessDurationString(duration: ReturnType<typeof msToBusinessDurationData>) {
    const parts = [];
    if (duration.hours) parts.push(`${duration.hours}h`);
    if (duration.minutes) parts.push(`${duration.minutes}m`);
    if (duration.seconds && !parts.length) parts.push(`${duration.seconds}s`); // only show seconds if no h/m
    if (!parts.length) parts.push('0m');
    return parts.join(' ');
  }

  const handleEditDuration = (key: string, currentValue: number) => {
    setEditingDurationKey(key);
    const ms = currentValue * 60 * 1000;
    const businessDuration = msToBusinessDurationData(ms);
    const value = formatBusinessDurationString(businessDuration);
    setEditingDurationValue(value);
    setEditingDurationError('');
  };
  // Handler for input change
  const handleDurationInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEditingDurationValue(value);
    if (!validateHumanReadableDuration(value)) {
      setEditingDurationError(message('form.invalid.format'));
    } else {
      setEditingDurationError('');
    }
  };
  // Handler to save edit
  const saveDurationEdit = (key: string) => {
    if (!validateHumanReadableDuration(editingDurationValue)) {
      setEditingDurationError(message('form.invalid.format'));
      return;
    }
    // Convert to ISO, then to minutes
    const iso = humanReadableDurationToISO(editingDurationValue);
    if (!iso) {
      setEditingDurationError(message('form.invalid.format'));
      return;
    }
    const seconds = isoDurationToSeconds(iso);
    if (typeof seconds !== 'number') {
      setEditingDurationError(message('form.invalid.format'));
      return;
    }
    setIssueDurations((prev) => ({ ...prev, [key]: seconds / 60 }));
    setEditingDurationKey(null);
    setEditingDurationValue('');
    setEditingDurationError('');
  };
  // Handler to cancel edit
  const cancelDurationEdit = () => {
    setEditingDurationKey(null);
    setEditingDurationValue('');
    setEditingDurationError('');
  };

  const handleImportTracks = async () => {
    if (selectedRowKeys.length === 0) return;

    setIsImporting(true);
    try {
      const selectedRows = filteredTableData.filter((record: IDataType) =>
        selectedRowKeys.map(String).includes(record.key),
      );
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
      title: message('calendar.export.table.organizer'),
      dataIndex: 'organizer',
      key: 'organizer',
      render: (organizer: IMeetingOrganizer, record: IDataType) => {
        const attendees = [...(record.requiredAttendees || []), ...(record.optionalAttendees || [])];
        // Remove duplicates
        const uniqueAttendees = Array.from(new Set(attendees));
        const showAttendees = uniqueAttendees.slice(0, 10);
        const hasMore = uniqueAttendees.length > 10;
        return (
          <>
            <Text>{organizer.name}</Text>
            <Popover
              content={
                <div style={{ maxWidth: 300, maxHeight: 350, overflowY: 'auto' }}>
                  {showAttendees.map((email) => (
                    <Text
                      key={email}
                      style={{ display: 'block', marginBottom: 4, fontFamily: 'monospace', fontSize: 12 }}
                    >
                      {email}
                    </Text>
                  ))}
                  {hasMore && <Text style={{ display: 'block', fontFamily: 'monospace', fontSize: 12 }}>...</Text>}
                </div>
              }
              title={message('calendar.export.table.attendees')}
              trigger="hover"
            >
              <Badge
                count={record.participants}
                style={{ marginLeft: 3, backgroundColor: '#fdc300', color: '#21282b' }}
              />
            </Popover>
          </>
        );
      },
    },
    {
      title: message('calendar.export.table.start'),
      dataIndex: 'start',
      key: 'start',
      render: (date: string) => <Text>{dayjs(date).format('MMM DD, YYYY HH:mm')}</Text>,
    },
    {
      title: message('calendar.export.table.duration'),
      dataIndex: 'duration',
      key: 'duration',
      render: (minutes: number, record: IDataType) => {
        const key = String(record.key);
        const value = issueDurations[key] || minutes;
        if (editingDurationKey === key) {
          return (
            <div className="editable-cell">
              <Input
                value={editingDurationValue}
                autoFocus
                onChange={handleDurationInputChange}
                onBlur={() => saveDurationEdit(key)}
                onPressEnter={() => saveDurationEdit(key)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') cancelDurationEdit();
                }}
                onFocus={(e) => e.target.select()}
                size="small"
                status={editingDurationError ? 'error' : ''}
                placeholder="1h 30m"
                style={{ width: 100 }}
              />
              {editingDurationError && (
                <div style={{ color: 'red', fontSize: 12 }}>{editingDurationError}</div>
              )}
            </div>
          );
        }
        // Convert minutes to ms, then to business duration
        const ms = value * 60 * 1000;
        const businessDuration = msToBusinessDurationData(ms);
        return (
          <div className="editable-cell editable-row">
            <div
              className="editable-cell-value-wrap"
              onClick={() => handleEditDuration(key, value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleEditDuration(key, value);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <Text strong style={{ cursor: 'pointer' }}>
                <DurationFormat duration={businessDuration} />
              </Text>
            </div>
          </div>
        );
      },
    },
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
              {data.totalMeetings} {message('calendar.export.results.top')}{' '}
              {message('calendar.export.results.top.from')}{' '}
              {DateWrapper.getDateFormat(dayjs(data.dateRange.start_date), 'DD MMMM YYYY')}{' '}
              {message('calendar.export.results.top.to')}{' '}
              {DateWrapper.getDateFormat(dayjs(data.dateRange.end_date), 'DD MMMM YYYY')}
            </Text>
          )}
          <Space>
            <Text>{message('calendar.import.issue.key')}</Text>
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
                event.target.closest('.editable-cell') ||
                event.target.closest('.ant-popover'))
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
