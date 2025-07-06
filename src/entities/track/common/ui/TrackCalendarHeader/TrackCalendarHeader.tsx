import { Button, Col, Row, Space } from 'antd';
import { LocaleSelector } from 'entities/locale/ui/LocaleSelector';
import { TrackTimeButton } from 'entities/track/common/ui/TrackCalendarHeader/TrackTimeButton';
import { ManageTeamButton } from 'entities/track/common/ui/TrackCalendarHeader/ManageTeamButton';
import { LdapLoginButton } from 'entities/track/common/ui/TrackCalendarHeader/LdapLoginButton';
import { ScheduleFilled } from '@ant-design/icons';
import { TimeOffsetSelect } from 'features/date/ui/TimeOffsetSelect/TimeOffsetSelect';
import { GlobalFetching } from 'shared/ui/GlobalFetching';
import { ReactNode, useCallback, useState, useEffect } from 'react';
import { useMessage } from 'entities/locale/lib/hooks';
import { useGetCalendarMeetingsMutation, TEwsCalendarResponse } from 'entities/track/common/model/ews-api';
import { useFilters } from 'features/filters/lib/useFilters';
import { CalendarExportModal } from 'entities/track/common/ui/CalendarExportModal';
import { TimePeriodStepper } from './TimePeriodStepper';
import { TodayText } from './TodayText';
import { TrackCalendarHeaderControlBar } from './TrackCalendarHeaderControlBar';

import styles from './TrackCalendarHeader.module.scss';

interface ITrackCalendarHeaderProps {
  isEdit?: boolean;
  upperRowControls?: ReactNode;
  filters?: ReactNode;
}

export function TrackCalendarHeader({ isEdit, filters, upperRowControls }: ITrackCalendarHeaderProps) {
  const message = useMessage();
  const [getCalendarMeetings, { isLoading: isCalendarLoading }] = useGetCalendarMeetingsMutation();
  const { from, to } = useFilters();
  
  const [loadings, setLoadings] = useState<boolean[]>([]);
  const [hasLdapCredentials, setHasLdapCredentials] = useState(false);
  const [calendarData, setCalendarData] = useState<TEwsCalendarResponse | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  // Check if LDAP credentials are saved
  const checkLdapCredentials = useCallback(() => {
    try {
      const savedCredentials = JSON.parse(localStorage.getItem('ldapCredentials') || '{}');
      const hasCredentials = !!(savedCredentials.username && savedCredentials.token);
      setHasLdapCredentials(hasCredentials);
    } catch {
      setHasLdapCredentials(false);
    }
  }, []);
  
  // Check credentials on mount and set up storage listener
  useEffect(() => {
    checkLdapCredentials();
    
    // Listen for storage changes (when credentials are saved)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'ldapCredentials') {
        checkLdapCredentials();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically for local changes
    const interval = setInterval(checkLdapCredentials, 1000);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [checkLdapCredentials]);

  const handleExportCalendar = useCallback(async (index: number) => {
    console.log('Export calendar clicked!');
    
    setLoadings((prevLoadings) => {
      const newLoadings = [...prevLoadings];
      newLoadings[index] = true;
      return newLoadings;
    });

    try {
      // Get saved credentials from localStorage
      const savedCredentials = JSON.parse(localStorage.getItem('ldapCredentials') || '{}');
      
      if (!savedCredentials.username || !savedCredentials.token) {
        console.error('No saved credentials found');
        return;
      }

      // Get current date range from filters (this will be reactive)
      const currentFrom = from;
      const currentTo = to;
      
      console.log('Exporting calendar for date range:', { from: currentFrom, to: currentTo });

      // Call the calendar API with current date range from filters
      const result = await getCalendarMeetings({
        username: savedCredentials.username,
        token: savedCredentials.token,
        start_date: currentFrom,
        end_date: currentTo
      }).unwrap();

      if (result.success) {
        console.log('Calendar meetings:', result.meetings);
        console.log('Total meetings:', result.totalMeetings);
        console.log('Date range used:', result.dateRange);
        
        // Show modal with the calendar data
        setCalendarData(result);
        setModalVisible(true);
      } else {
        console.error('Failed to fetch calendar meetings');
      }
    } catch (error) {
      console.error('Error fetching calendar meetings:', error);
    } finally {
      setLoadings((prevLoadings) => {
        const newLoadings = [...prevLoadings];
        newLoadings[index] = false;
        return newLoadings;
      });
    }
  }, [getCalendarMeetings, from, to]);
  
  return (
    <div className={styles.header}>
      <Row justify="space-between">
        <Col>
        <LdapLoginButton className={styles.addTrackBtn} isEdit={isEdit} />
        <ManageTeamButton className={styles.addTrackBtn} isEdit={isEdit} />
        <Button 
          type="link"
          disabled={!isEdit || !hasLdapCredentials}
          icon={<ScheduleFilled />}
          loading={loadings[1] || isCalendarLoading}
          onClick={() => handleExportCalendar(1)}
          title={!hasLdapCredentials ? message('calendar.export.no.credentials') : message('calendar.export')}
          >{message('calendar.export')}</Button>

        <TrackTimeButton className={styles.addTrackBtn} isEdit={isEdit} />

        <TodayText />
        </Col>

        <Col>
          <Space>
            {upperRowControls}
            <LocaleSelector />
            <TimeOffsetSelect />
          </Space>
        </Col>
      </Row>

      <Row className={styles.durationRow}>
        <Col flex="auto">
          <TimePeriodStepper loader={<GlobalFetching />} />
        </Col>
      </Row>

      <TrackCalendarHeaderControlBar>{filters}</TrackCalendarHeaderControlBar>
      
      <CalendarExportModal
        visible={modalVisible}
        onHidden={() => setModalVisible(false)}
        data={calendarData}
        loading={isCalendarLoading}
      />
    </div>
  );
}
