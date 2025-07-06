import { Modal, Table, Space, Typography, TableProps, Flex, Button, Input, message as antMessage } from 'antd';
import { useMessage } from 'entities/locale/lib/hooks';
import { TEwsCalendarResponse } from 'entities/track/common/model/ews-api';
import { DateWrapper } from 'features/date/lib/DateWrapper';
import dayjs from 'dayjs';
import { useState } from 'react';
import { ScheduleFilled } from '@ant-design/icons';
import { TTrackerConfig } from 'entities/tracker/model/types';
import { useCreateJiraTrack } from 'entities/track/jira/lib/hooks/use-create-jira-track';
import { useCreateYandexTrack } from 'entities/track/yandex/lib/hooks/use-create-yandex-track';
import { isJiraTrackerCfg } from 'entities/tracker/model/types';
import { humanReadableDurationToISO } from 'entities/track/common/lib/human-readable-duration-to-iso';

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

  const handleImportTracks = async () => {
    if (selectedRowKeys.length === 0) return;

    setIsImporting(true);
    try {
      const selectedRows = tableData.filter(record => selectedRowKeys.includes(record.key));
      
      for (const row of selectedRows) {
        const issueKey = issueKeys[String(row.key)] || defaultIssueKey;
        
        if (!validateIssueKey(issueKey)) {
          console.warn(`Invalid issue key for meeting: ${row.subject}`);
          continue;
        }

        // Convert duration from minutes to human readable format
        const hours = Math.floor(row.duration / 60);
        const minutes = row.duration % 60;
        const durationString = `${hours}h${minutes > 0 ? ` ${minutes}m` : ''}`;
        
        // Convert to ISO duration
        const isoDuration = humanReadableDurationToISO(durationString);
        if (!isoDuration) {
          console.warn(`Invalid duration for meeting: ${row.subject}`);
          continue;
        }

        // Create track
        await createTrack({
          issueKey,
          start: row.start,
          duration: durationString,
          comment: "Meeting: " + row.subject
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
      title: message('calendar.export.table.issue'),
      dataIndex: 'issueKey',
      key: 'issueKey',
      width: 160,
      render: (text: string, record: DataType) => (
        <Input
          value={issueKeys[String(record.key)] || defaultIssueKey}
          onChange={(e) => handleIssueKeyChange(String(record.key), e.target.value)}
          onFocus={(e) => e.target.select()}
          status={issueKeys[String(record.key)] && !validateIssueKey(issueKeys[String(record.key)]) ? 'error' : ''}
          placeholder="PM-4"
        />
      ),
    },
    {
      title: message('calendar.export.table.subject'),
      dataIndex: 'subject',
      key: 'subject',
      render: (text: string) => <Text strong>{text}</Text>,
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
    console.log(`selectedRowKeys: ${selectedRowKeys}`, 'selectedRows: ', selectedRows);
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
              {data.totalMeetings} {message('calendar.export.results.top')} {DateWrapper.getDateFormat(dayjs(data.dateRange.start_date), 'DD MMMM YYYY')} {message('calendar.export.results.top.to')} {DateWrapper.getDateFormat(dayjs(data.dateRange.end_date), 'DD MMMM YYYY')}
            </Text>
          )}
        <Space>
          <Text>{message('calendar.import.issue.key')}</Text>
          <Input
            value={defaultIssueKey}
            onChange={(e) => handleDefaultIssueKeyChange(e.target.value)}
            placeholder="PM-4"
            style={{ width: 160 }}
            onFocus={(e) => e.target.select()}
            status={defaultIssueKey && !validateIssueKey(defaultIssueKey) ? 'error' : ''}
          />
          <Button onClick={applyDefaultToAll}>
          {message('organiztions.emptyOrganization.save')}
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
          onClick: () => handleRowClick(record),
          style: { cursor: 'pointer' }
        })}
        pagination={{
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} meetings`,
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