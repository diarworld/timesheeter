import { Modal, Table, Space, Typography } from 'antd';
import { useMessage } from 'entities/locale/lib/hooks';
import { TEwsCalendarResponse } from 'entities/track/common/model/ews-api';
import dayjs from 'dayjs';

const { Text, Title } = Typography;

interface CalendarExportModalProps {
  visible: boolean;
  onHidden: () => void;
  data: TEwsCalendarResponse | null;
  loading: boolean;
}

export const CalendarExportModal: React.FC<CalendarExportModalProps> = ({
  visible,
  onHidden,
  data,
  loading
}) => {
  const message = useMessage();

  const columns = [
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
    {
      title: message('calendar.export.table.end'),
      dataIndex: 'end',
      key: 'end',
      render: (date: string) => (
        <Text>{dayjs(date).format('MMM DD, YYYY HH:mm')}</Text>
      ),
    },
    {
      title: message('calendar.export.table.duration'),
      dataIndex: 'duration',
      key: 'duration',
      render: (minutes: number) => (
        <Text>{Math.floor(minutes / 60)}h {minutes % 60}m</Text>
      ),
    },
    // {
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

  return (
    <Modal
      title={
        <Space direction="vertical" size={0}>
          <Title level={4}>{message('calendar.export.results')}</Title>
          {data && (
            <Text type="secondary">
              {data.totalMeetings} meetings from {dayjs(data.dateRange.start_date).format('MMM DD, YYYY')} to {dayjs(data.dateRange.end_date).format('MMM DD, YYYY')}
            </Text>
          )}
        </Space>
      }
      open={visible}
      onCancel={onHidden}
      footer={null}
      width={1000}
      destroyOnHidden
    >
      <Table
        columns={columns}
        dataSource={tableData}
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} meetings`,
        }}
        scroll={{ x: 800 }}
        size="small"
      />
    </Modal>
  );
}; 