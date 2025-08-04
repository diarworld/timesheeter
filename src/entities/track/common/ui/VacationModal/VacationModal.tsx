import React, { useState, useCallback } from 'react';
import { Modal, Form, Button, DatePicker, Typography, Space, Alert, App } from 'antd';
import { useMessage } from 'entities/locale/lib/hooks';
import { TTrackerConfig, Tracker } from 'entities/tracker/model/types';
import { getExpectedHoursForDay } from 'entities/track/common/lib/hooks/use-expected-hours-for-day';
import { useCreateJiraTrack } from 'entities/track/jira/lib/hooks/use-create-jira-track';
import { useCreateYandexTrack } from 'entities/track/yandex/lib/hooks/use-create-yandex-track';
import { JiraIssuesSearchConnected } from 'entities/track/jira/ui/JiraIssuesSearchConnected/JiraIssuesSearchConnected';
import { YandexIssuesSearchConnected } from 'entities/track/yandex/ui/YandexIssuesSearchConnected/YandexIssuesSearchConnected';

import { Dayjs } from 'dayjs';
import styles from './VacationModal.module.scss';

const { RangePicker } = DatePicker;
const { Text } = Typography;

interface IVacationModalProps {
  visible: boolean;
  onCancel: () => void;
  tracker: TTrackerConfig;
}

interface IVacationFormData {
  dateRange: [Dayjs, Dayjs];
  issueKey: string;
}

export const VacationModal: React.FC<IVacationModalProps> = ({ visible, onCancel, tracker }) => {
  const message = useMessage();
  const { message: antMessage } = App.useApp();
  const [form] = Form.useForm<IVacationFormData>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [totalHours, setTotalHours] = useState<number>(0);
  const [workDays, setWorkDays] = useState<number>(0);
  const [currentIssueKey, setCurrentIssueKey] = useState<string>('PM-2');

  // Use appropriate track creation hook based on tracker type
  const { createTrack: createJiraTrack, isTrackCreateLoading: isJiraLoading } = useCreateJiraTrack(tracker);
  const { createTrack: createYandexTrack, isTrackCreateLoading: isYandexLoading } = useCreateYandexTrack(tracker);

  const isTrackCreateLoading = isJiraLoading || isYandexLoading;

  const calculateVacationHours = useCallback((startDate: Dayjs, endDate: Dayjs) => {
    let total = 0;
    let workDayCount = 0;
    let current = startDate.clone();

    while (current.isSameOrBefore(endDate, 'day')) {
      const dayStr = current.format('YYYY-MM-DD');
      const expectedHours = getExpectedHoursForDay(dayStr);

      if (expectedHours > 0) {
        total += expectedHours;
        workDayCount++;
      }

      current = current.add(1, 'day');
    }

    setTotalHours(total);
    setWorkDays(workDayCount);
  }, []);

  const handleDateRangeChange = useCallback(
    (dates: [Dayjs | null, Dayjs | null] | null) => {
      if (dates && dates[0] && dates[1]) {
        // Only calculate if both dates are selected
        calculateVacationHours(dates[0], dates[1]);
      } else {
        setTotalHours(0);
        setWorkDays(0);
      }
    },
    [calculateVacationHours],
  );

  const handleIssueKeyChange = useCallback(
    (value: string) => {
      setCurrentIssueKey(value);
      form.setFieldValue('issueKey', value);
    },
    [form],
  );

  const handleSubmit = useCallback(
    async (values: IVacationFormData) => {
      if (!values.dateRange || !values.dateRange[0] || !values.dateRange[1]) {
        return;
      }

      setIsSubmitting(true);

      try {
        const [startDate, endDate] = values.dateRange;
        const issueKey = values.issueKey || 'PM-2';
        let current = startDate.clone();
        const VACATION_COMMENT = 'Отпуск';
        let actualLoggedHours = 0;

        // Create tracks for each working day in the vacation period
        while (current.isSameOrBefore(endDate, 'day')) {
          const dayStr = current.format('YYYY-MM-DD');
          const expectedHours = getExpectedHoursForDay(dayStr);

          if (expectedHours > 0) {
            const startTime = current.startOf('day').format();
            const duration = `${expectedHours}h`;

            const trackData = {
              issueKey,
              start: startTime,
              duration,
              comment: VACATION_COMMENT,
            };

            // Use appropriate track creation method based on tracker type
            if (tracker.type === Tracker.Jira) {
              await createJiraTrack(trackData);
            } else if (tracker.type === Tracker.Yandex) {
              await createYandexTrack(trackData);
            }

            actualLoggedHours += expectedHours;
          }

          current = current.add(1, 'day');
        }

        // Show success message
        antMessage.success(
          `${message('vacation.modal.success')} ${message('vacation.modal.success.description', { hours: actualLoggedHours, issue: issueKey })}`,
        );

        // Close modal and reset form
        form.resetFields();
        setTotalHours(0);
        setWorkDays(0);
        setCurrentIssueKey('PM-2');
        onCancel();
      } catch (error) {
        console.error('Error creating vacation tracks:', error);
        antMessage.error(`${message('vacation.modal.error')} ${message('vacation.modal.error.description')}`);
      } finally {
        setIsSubmitting(false);
      }
    },
    [form, onCancel, tracker, createJiraTrack, createYandexTrack],
  );

  const handleCancel = useCallback(() => {
    form.resetFields();
    setTotalHours(0);
    setWorkDays(0);
    setCurrentIssueKey('PM-2');
    onCancel();
  }, [form, onCancel]);

  return (
    <Modal
      title={message('vacation.modal.title')}
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={500}
      className={styles.vacationModal}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          dateRange: undefined,
          issueKey: 'PM-2',
        }}
      >
        <Form.Item
          label={message('vacation.modal.issueKey')}
          name="issueKey"
          rules={[
            {
              required: true,
              message: message('vacation.modal.issueKeyRequired'),
            },
          ]}
        >
          {tracker.type === Tracker.Jira ? (
            <JiraIssuesSearchConnected
              tracker={tracker}
              placeholder={message('vacation.modal.issueKeyPlaceholder')}
              name="issueKey"
              value={currentIssueKey}
              onChange={handleIssueKeyChange}
              onBlur={() => {}}
              onFocus={() => {}}
            />
          ) : (
            <YandexIssuesSearchConnected
              tracker={tracker}
              placeholder={message('vacation.modal.issueKeyPlaceholder')}
              name="issueKey"
              value={currentIssueKey}
              onChange={handleIssueKeyChange}
              onBlur={() => {}}
              onFocus={() => {}}
            />
          )}
        </Form.Item>
        <Form.Item
          label={message('vacation.modal.dateRange')}
          name="dateRange"
          rules={[
            {
              required: true,
              message: message('vacation.modal.dateRangeRequired'),
            },
          ]}
        >
          <RangePicker
            style={{ width: '100%' }}
            format="YYYY-MM-DD"
            onChange={handleDateRangeChange}
            placeholder={[message('vacation.modal.startDate'), message('vacation.modal.endDate')]}
          />
        </Form.Item>
        {totalHours > 0 && (
          <Alert
            message={message('vacation.modal.summary')}
            description={
              <Space direction="vertical" size="small">
                <Text>{message('vacation.modal.workDays', { count: workDays })}</Text>
                <Text>{message('vacation.modal.totalHours', { hours: totalHours })}</Text>
                <Text type="secondary">{message('vacation.modal.willBeLogged', { issue: currentIssueKey })}</Text>
              </Space>
            }
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Space>
            <Button onClick={handleCancel}>{message('common.cancel')}</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={isSubmitting || isTrackCreateLoading}
              disabled={totalHours === 0}
            >
              {message('vacation.modal.submit')}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};
