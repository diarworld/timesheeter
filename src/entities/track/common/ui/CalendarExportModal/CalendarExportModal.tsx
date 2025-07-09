import { Modal, Table, Space, Typography, TableProps, Flex, Button, Input, message as antMessage, AutoCompleteProps, Popover, Alert } from 'antd';
import { useMessage } from 'entities/locale/lib/hooks';
import { TEwsCalendarResponse } from 'entities/track/common/model/ews-api';
import { DateWrapper } from 'features/date/lib/DateWrapper';
import dayjs from 'dayjs';
import { useState } from 'react';
import { ScheduleFilled } from '@ant-design/icons';
import { TTrackerConfig } from 'entities/tracker/model/types';
import { useCreateJiraTrack } from 'entities/track/jira/lib/hooks/use-create-jira-track';
import { useCreateYandexTrack } from 'entities/track/yandex/lib/hooks/use-create-yandex-track';
import { isJiraTrackerCfg, isYandexTrackerCfg } from 'entities/tracker/model/types';
import { humanReadableDurationToISO } from 'entities/track/common/lib/human-readable-duration-to-iso';
import './CalendarExportModal.scss';
import { YandexIssuesSearchConnected } from 'entities/track/yandex/ui/YandexIssuesSearchConnected/YandexIssuesSearchConnected';
const { Text, Title } = Typography;

interface DataType {
  key: React.Key;
  subject: React.Key;
  start: string;
  end: string;
  duration: number;
  issueKey?: string;
}

interface CalendarExportModalProps {
  visible: boolean;
  onHidden: () => void;
  data: TEwsCalendarResponse | null;
  loading: boolean;
  tracker: TTrackerConfig;
}

export const CalendarExportModal: React.FC<CalendarExportModalProps> = ({
  visible,
  onHidden,
  data,
  loading,
  tracker
}) => {
  const message = useMessage();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [issueKeys, setIssueKeys] = useState<Record<string, string>>({});
  
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

  const handleIssueKeyChange = (key: string, value: string) => {
    setIssueKeys(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const validateIssueKey = (value: string) => {
    const regex = /^[A-Za-z]+-[0-9]+$/;
    return regex.test(value);
  };

  const applyDefaultToAll = () => {
    const newIssueKeys: Record<string, string> = {};
    tableData.forEach((record) => {
      newIssueKeys[String(record.key)] = defaultIssueKey;
    });
    setIssueKeys(newIssueKeys);
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
    setSubjects(prev => ({ ...prev, [key]: editingSubjectValue }));
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
    setIssueKeys(prev => ({ ...prev, [key]: editingIssueKeyValue }));
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
      const selectedRows = tableData.filter(record => selectedRowKeys.includes(record.key));
      
      for (const row of selectedRows) {
        const issueKey = issueKeys[String(row.key)] || defaultIssueKey;
        const subject = subjects[String(row.key)] ?? row.subject;
        
        if (!validateIssueKey(issueKey)) {
          console.warn(`Invalid issue key for meeting: ${subject}`);
          continue;
        }

        // Convert duration from minutes to human readable format
        const hours = Math.floor(row.duration / 60);
        const minutes = row.duration % 60;
        const durationString = `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
        
        // Convert to ISO duration
        const isoDuration = humanReadableDurationToISO(durationString);
        if (!isoDuration) {
          console.warn(`Invalid duration for meeting: ${subject}`);
          continue;
        }

        // Create track
        await createTrack({
          issueKey,
          start: row.start,
          duration: durationString,
          comment: "Meeting: " + subject
        });
      }
      // Show notification after successful import
      // Close modal after successful import
      antMessage.success(message('calendar.import.success') + ' ' + message('calendar.import.success.description'));
      onHidden();
    } catch (error) {
      console.error('Error importing tracks:', error);
    } finally {
      setIsImporting(false);
    }
  };

  const columns = [
    {
      title: (
        <Popover
          content={
            <>
            {/* <CloseCircleFilled style={{ color: 'red' }}/> */}
            <span>{message('calendar.export.table.issue.help')}</span></>
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
      render: (text: string, record: DataType) => {
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
                />
              ) : (
                // Fallback: plain Input or JiraIssuesSearchConnected for Jira
                <Input
                  value={editingIssueKeyValue}
                  autoFocus
                  onChange={handleIssueKeyInputChange}
                  onBlur={() => saveIssueKeyEdit(key)}
                  onPressEnter={() => saveIssueKeyEdit(key)}
                  onKeyDown={e => { if (e.key === 'Escape') cancelIssueKeyEdit(); }}
                  onFocus={e => e.target.select()}
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
      render: (text: string, record: DataType) => {
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
                onKeyDown={e => { if (e.key === 'Escape') cancelSubjectEdit(); }}
                onFocus={e => e.target.select()}
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
      render: (date: string) => (
        <Text>{dayjs(date).format('MMM DD, YYYY HH:mm')}</Text>
      ),
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
      render: (minutes: number) => (
        <Text>{message('date.hours.short', { value: Math.floor(minutes / 60) })} {message('date.minutes.short', { value: Math.floor(minutes % 60) })}</Text>
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

  const tableData = data?.meetings.map((meeting, index) => ({
    key: meeting.id || index,
    ...meeting,
  })) || [];


  // rowSelection object indicates the need for row selection
const rowSelection: TableProps<DataType>['rowSelection'] = {
  selectedRowKeys: selectedRowKeys,
  onChange: (selectedRowKeys: React.Key[], selectedRows: DataType[]) => {
    setSelectedRowKeys(selectedRowKeys);
    // console.log(`selectedRowKeys: ${selectedRowKeys}`, 'selectedRows: ', selectedRows);
  },
  getCheckboxProps: (record: DataType) => ({
    disabled: false, // Column configuration not to be checked
    name: String(record.subject),
  }),
};

const handleRowClick = (record: DataType) => {
  const key = record.key;
  const newSelectedRowKeys = selectedRowKeys.includes(key)
    ? selectedRowKeys.filter((k: React.Key) => k !== key)
    : [...selectedRowKeys, key];
  setSelectedRowKeys(newSelectedRowKeys);
};

  return (
    <Modal
      title={
        <Space direction="vertical" size={0}>
          <Title level={4}>{message('calendar.export.results')}</Title>
          {data && (
            <Text type="secondary">
              {data.totalMeetings} {message('calendar.export.results.top')} {message('calendar.export.results.top.from')} {DateWrapper.getDateFormat(dayjs(data.dateRange.start_date), 'DD MMMM YYYY')} {message('calendar.export.results.top.to')} {DateWrapper.getDateFormat(dayjs(data.dateRange.end_date), 'DD MMMM YYYY')}
            </Text>
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
            />
          ) : (
            // Fallback: plain Input or JiraIssuesSearchConnected for Jira
            <Input
              value={defaultIssueKey}
              autoFocus
              onChange={handleIssueKeyInputChange}
              onBlur={() => saveIssueKeyEdit(defaultIssueKey)}
              onPressEnter={() => saveIssueKeyEdit(defaultIssueKey)}
              onKeyDown={e => { if (e.key === 'Escape') cancelIssueKeyEdit(); }}
              onFocus={e => e.target.select()}
              size="small"
              status={defaultIssueKey && !validateIssueKey(defaultIssueKey) ? 'error' : ''}
              placeholder="PM-4"
              style={{ minWidth: 120 }}
            />
          )}
          <Button onClick={applyDefaultToAll}>
          {message('calendar.export.default.set')}
          </Button>
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
        rowSelection={{ type: "checkbox", ...rowSelection }}
        columns={columns}
        dataSource={tableData}
        loading={loading}
        onRow={(record) => ({
          onClick: (event) => {
            // Prevent row selection if clicking inside an input or textarea
            if (
              event.target instanceof HTMLElement &&
              (
                event.target.tagName === 'INPUT' ||
                event.target.closest('.editable-cell-value-wrap') ||
                event.target.closest('.editable-cell')
              )
            ) {
              return;
            }
            handleRowClick(record);
          },
          style: { cursor: 'pointer' }
        })}
        pagination={{
          showTotal: (total, range) => `${range[0]}-${range[1]} ${message('calendar.export.results.top.of')} ${total}`,
          showSizeChanger: true
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
           >{message('calendar.import')}
         </Button>
      </Flex>
    </Modal>
  );
}; 