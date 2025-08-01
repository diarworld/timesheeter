import { Modal, Table, Space, Typography, TableProps, Flex, Button, Input, Popover, Badge, App } from 'antd';
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
import { validateHumanReadableDuration } from 'entities/track/common/lib/validate-human-readable-duration';
import { DurationFormat } from 'features/date/ui/DurationFormat/DurationFormat';
import { msToBusinessDurationData } from 'entities/track/common/lib/ms-to-business-duration-data';
import { useYandexUser } from 'entities/user/yandex/hooks/use-yandex-user';
import { useFilterValues } from 'features/filters/lib/useFilterValues';
import { TCondition, TAction, TRule } from 'entities/track/common/ui/RulesManage/types';
import { isoDurationToSeconds } from 'entities/track/common/lib/iso-duration-to-seconds';

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

export const CalendarExportModal: React.FC<ICalendarExportModalProps> = ({
  visible,
  onHidden,
  data,
  loading,
  tracker,
}) => {
  const message = useMessage();
  const { message: antMessage } = App.useApp();
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [issueKeys, setIssueKeys] = useState<Record<string, string>>({});
  const [issueDurations, setIssueDurations] = useState<Record<string, number>>({});
  const { userId, login } = useFilterValues();
  const { self } = useYandexUser(tracker, userId, login);

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

  // Add state for rule matches
  const [issueKeyRuleMatches, setIssueKeyRuleMatches] = useState<Record<string, TRule[]>>({});
  // Get all shared rules for all teams
  const [sharedRules, setSharedRules] = useState<TRule[]>([]);

  // Get the appropriate track creation hook based on tracker type
  const jiraTrackHook = useCreateJiraTrack(tracker);
  const yandexTrackHook = useCreateYandexTrack(tracker);
  // Fetch all shared rules for all teams
  useEffect(() => {
    if (!self) return;
    const fetchRules = async () => {
      try {
        const res = await fetch(`/api/team-rules`, {
          headers: { 'x-user-id': self?.uid?.toString() || '', 'x-user-email': self?.email || '' },
        });
        if (res.ok) {
          const rulesData = await res.json();
          setSharedRules(Array.isArray(rulesData.rules) ? rulesData.rules : []);
        }
      } catch (e) {
        console.error('Error fetching shared rules:', e);
      }
    };
    fetchRules();
  }, [self]);

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

  // Helper to stable stringify objects (sort keys)
  function stableStringify(obj: unknown): string {
    if (Array.isArray(obj)) {
      return `[${obj.map(stableStringify).join(',')}]`;
    }
    if (obj && typeof obj === 'object') {
      const keys = Object.keys(obj).sort();
      return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify((obj as Record<string, unknown>)[k])}`).join(',')}}`;
    }
    return JSON.stringify(obj);
  }

  // Helper: get rules from localStorage
  function getTimesheeterRules() {
    try {
      const rules = JSON.parse(localStorage.getItem('timesheeterRules') || '[]');
      const allData = [...rules, ...sharedRules];
      // Deduplicate: unique if actions[] and conditions[] (with omitted .key) are unique, regardless of field order
      const seen = new Set();
      const uniqueRules = [];
      for (const rule of allData) {
        if (!rule) {
          // skip this iteration
        } else {
          const actions: TAction[] = Array.isArray(rule.actions)
            ? rule.actions.map((a: Record<string, unknown>) => {
                const { key: _key, ...restA } = a;
                return restA as TAction;
              })
            : rule.actions;
          const conditions: TCondition[] = Array.isArray(rule.conditions)
            ? rule.conditions.map((c: Record<string, unknown>) => {
                const { key: _key, ...restC } = c;
                return restC as TCondition;
              })
            : rule.conditions;
          const compareKey = stableStringify({ actions, conditions });
          if (!seen.has(compareKey)) {
            seen.add(compareKey);
            uniqueRules.push(rule);
          }
        }
      }
      return uniqueRules;
    } catch {
      return [];
    }
  }

  // Helper: check if a meeting matches a rule (case-insensitive)
  function meetingMatchesRule(meeting: IDataType, rule: TRule) {
    if (!rule.conditions || rule.conditions.length === 0) return false;
    let result = null;
    for (let i = 0; i < rule.conditions.length; i += 1) {
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
    const rules: TRule[] = getTimesheeterRules();
    const newIssueKeys: Record<string, string> = {};
    const newIssueDurations: Record<string, number> = {};
    const newFilteredTableData: IDataType[] = [];
    const newRuleMatches: Record<string, TRule[]> = {};

    tableData.forEach((record: IDataType) => {
      let matchedKey = defaultIssueKey;
      let newDuration = record.duration;
      let skip = false;
      const matchedRules: TRule[] = [];

      for (const rule of rules) {
        if (!rule.actions) {
          // skip this iteration
        } else if (meetingMatchesRule(record, rule)) {
          matchedRules.push(rule);
          const skipAction = rule.actions.find((a: TAction) => a.type === 'skip' && a.value === 'true');
          if (skipAction) {
            skip = true;
            break;
          }
          const setTaskAction = rule.actions.find((a: TAction) => a.type === 'set_task');
          const setDurationAction = rule.actions.find((a: TAction) => a.type === 'set_duration');
          if (setTaskAction) matchedKey = setTaskAction.value;
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
          // Do not break here; collect all matching rules
        }
      }
      if (!skip) {
        newIssueKeys[record.key] = matchedKey;
        newIssueDurations[record.key] = newDuration;
        newFilteredTableData.push(record);
        newRuleMatches[record.key] = matchedRules;
      }
    });
    setIssueKeys(newIssueKeys);
    setIssueDurations(newIssueDurations);
    setFilteredTableData(newFilteredTableData);
    setIssueKeyRuleMatches(newRuleMatches);
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
    const { value } = e.target;
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
        const matchedRules = issueKeyRuleMatches[key] || [];

        const rulePopoverContent =
          matchedRules.length > 0 ? (
            <div style={{ maxWidth: 450 }}>
              <div>
                <b>{message('calendar.export.rules.fired')}</b>
              </div>
              <ul style={{ paddingLeft: 16 }}>
                {matchedRules.map((rule) => (
                  <li key={rule.id}>
                    <b>{rule.name}</b>: {rule.description}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <span>{message('calendar.export.rules.none')}</span>
          );

        const cellContent =
          editingIssueKey === key ? (
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
                  style={{ width: '220px' }}
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
          ) : (
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

        return matchedRules.length > 0 ? (
          <Popover content={rulePopoverContent} title={message('calendar.export.rules.info')} trigger="hover">
            {cellContent}
          </Popover>
        ) : (
          cellContent
        );
      },
    },
    {
      title: message('calendar.export.table.subject'),
      dataIndex: 'subject',
      key: 'subject',
      // minWidth: 250,
      maxWidth: 600,
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
      width: 250,
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
      width: 160,
      render: (date: string) => <Text>{dayjs(date).format('MMM DD, YYYY HH:mm')}</Text>,
    },
    {
      title: message('calendar.export.table.duration'),
      dataIndex: 'duration',
      key: 'duration',
      width: 100,
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
              {editingDurationError && <div style={{ color: 'red', fontSize: 12 }}>{editingDurationError}</div>}
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
              style={{ width: 100 }}
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
      // width={1200}
      // style={{ minWidth: '80%' }}
      width="fit-content"
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
