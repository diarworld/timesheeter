import { Button, Col, Row, Space, Menu, MenuProps } from 'antd';
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
import { TTrackerConfig } from 'entities/tracker/model/types';
import { DashboardOutlined, SettingOutlined, LoginOutlined, UsergroupAddOutlined, LogoutOutlined, FieldTimeOutlined } from '@ant-design/icons';
import { useLdapLoginAction } from 'entities/track/common/lib/hooks/use-ldap-login-action';
import { useManageTeamAction } from 'entities/track/common/lib/hooks/use-manage-team-action';
import { useLogoutTracker } from 'entities/tracker/lib/useLogoutTracker';
import { useAppDispatch, useAppSelector } from 'shared/lib/hooks';
import { actionLocaleSetCurrent } from 'entities/locale/model/actions';
import { selectLocaleCurrent } from 'entities/locale/model/selectors';
import { localeApi } from 'entities/locale/model/api';
import { timezoneTimeOffsetOptions } from 'features/date/ui/TimeOffsetSelect/TimeOffsetSelect';
import { selectHasLdapCredentials } from 'entities/track/common/model/selectors';
import { track } from 'entities/track/common/model/reducers';

import styles from './TrackCalendarHeader.module.scss';

interface ITrackCalendarHeaderProps {
  isEdit?: boolean;
  upperRowControls?: ReactNode;
  filters?: ReactNode;
  tracker: TTrackerConfig;
  currentMenuKey: string;
  onMenuChange: (key: string) => void;
}

export function TrackCalendarHeader({ isEdit, filters, upperRowControls, tracker, currentMenuKey, onMenuChange }: ITrackCalendarHeaderProps) {
  const message = useMessage();
  const [getCalendarMeetings, { isLoading: isCalendarLoading }] = useGetCalendarMeetingsMutation();
  const { from, to, utcOffsetInMinutes, updateTimeOffset } = useFilters();
  
  const [loadings, setLoadings] = useState<boolean[]>([]);
  const hasLdapCredentials = useAppSelector(selectHasLdapCredentials) || false;
  const [calendarData, setCalendarData] = useState<TEwsCalendarResponse | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  const dispatch = useAppDispatch();
  
  // Initialize LDAP credentials status from localStorage on mount
  useEffect(() => {
    try {
      const savedCredentials = JSON.parse(localStorage.getItem('ldapCredentials') || '{}');
      const hasCredentials = !!(savedCredentials.username && savedCredentials.token);
      dispatch(track.actions.setHasLdapCredentials(hasCredentials));
    } catch {
      dispatch(track.actions.setHasLdapCredentials(false));
    }
  }, [dispatch]);
  

  const handleExportCalendar = useCallback(async (index: number) => {
    // console.log('Export calendar clicked!');
    
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
      
      // console.log('Exporting calendar for date range:', { from: currentFrom, to: currentTo });

      // Call the calendar API with current date range from filters
      const result = await getCalendarMeetings({
        username: savedCredentials.username,
        token: savedCredentials.token,
        start_date: currentFrom,
        end_date: currentTo
      }).unwrap();

      if (result.success) {
        // console.log('Calendar meetings:', result.meetings);
        // console.log('Total meetings:', result.totalMeetings);
        // console.log('Date range used:', result.dateRange);
        
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

  type MenuItem = Required<MenuProps>['items'][number];

  const localeCurrent = useAppSelector(selectLocaleCurrent);
  const { data: localeList } = localeApi.useGetLocalesQuery();

  const handleClickLocaleSwitch = () => {
    if (!localeList || localeList.length === 0 || !localeCurrent) return;
    const currentIdx = localeList.indexOf(localeCurrent);
    const nextIdx = (currentIdx + 1) % localeList.length;
    dispatch(actionLocaleSetCurrent(localeList[nextIdx]));
  };

  // Doesn't use for now
  // const currentTzIdx = timezoneTimeOffsetOptions.findIndex(opt => opt.value === utcOffsetInMinutes);
  // const nextTzIdx = (currentTzIdx + 1) % timezoneTimeOffsetOptions.length;
  // const currentTzLabel = timezoneTimeOffsetOptions[currentTzIdx]?.label ?? message('timeOffset.placeholder');

  // const handleClickTimezoneSwitch = () => {
  //   updateTimeOffset(timezoneTimeOffsetOptions[nextTzIdx].value);
  // };

  // const timezoneMenuItems: MenuItem[] = [
  //   // Current timezone on top, highlighted
  //   {
  //     label: (
  //       <span>
  //         {currentTzLabel} <strong>({message('timeOffset.placeholder')})</strong>
  //       </span>
  //     ),
  //     key: `timezone-current`,
  //     icon: <FieldTimeOutlined style={{ color: '#1890ff' }} />,
  //     disabled: true,
  //   },
  //   // Divider (optional)
  //   { type: 'divider' as const },
  //   // All timezones
  //   ...timezoneTimeOffsetOptions.map((tz) => ({
  //     label: tz.label,
  //     key: `timezone-${tz.value}`,
  //     icon: tz.value === utcOffsetInMinutes ? <FieldTimeOutlined style={{ color: '#1890ff' }} /> : undefined,
  //     onClick: () => updateTimeOffset(tz.value),
  //   })),
  // ];

  const items: MenuItem[] = [
    {
      label: message('menu.settings'),
      key: 'SubMenu',
      icon: <SettingOutlined />,
      children: [
        {
          type: 'group',
          label: message('menu.user.custom'),
          children: [
            { label: message('ldap.auth'), icon: <LoginOutlined />, key: 'ldap-login', onClick: useLdapLoginAction() },
            { label: message('manage.team'), icon: <UsergroupAddOutlined />, key: 'manage-team', onClick: useManageTeamAction() },
          ],
        },
        {
          type: 'group',
          label: message('menu.user.interface'),
          children: [
            {
              label: message(localeCurrent === 'ru' ? 'menu.locale.english' : 'menu.locale.russian'),
              icon: <span style={{ fontSize: 18 }}>{localeCurrent === 'ru' ? '🇬🇧' : '🇷🇺'}</span>,
              key: 'locale-selector',
              onClick: handleClickLocaleSwitch
            },
            // Remove tz edit, because it breacs time logging
            // {
            //   label: currentTzLabel,
            //   icon: <FieldTimeOutlined />,
            //   key: 'timezone-selector',
            //   children: timezoneMenuItems
            // }
          ]
        }
      ],
    },
    {
      label: message('menu.tracks'),
      key: 'tracks',
      icon: <FieldTimeOutlined />,
    },
    {
      label: message('menu.reports'),
      key: 'reports',
      icon: <DashboardOutlined />,
      // disabled: true,
    },
    {
      key: 'logout',
      label: message('home.logout'),
      icon: <LogoutOutlined />,
      onClick: tracker ? useLogoutTracker(tracker) : undefined,
      disabled: !tracker,
    },
  ];

  const onClick: MenuProps['onClick'] = (e) => {
    if (e.key === 'tracks' || e.key === 'reports') {
      onMenuChange(e.key);
    }
  };
  return (
    <>
      <Row className={styles.menu} justify="space-between" align="middle">
        <Col flex="auto">
          <Menu
            onClick={onClick}
            selectedKeys={[currentMenuKey]}
            mode="horizontal"
            items={items.filter(item => item?.key !== 'logout')}
            theme="light"
          />
        </Col>
        <Col style={{ marginLeft: 'auto' }}>
          <Menu
            onClick={onClick}
            mode="horizontal"
            items={items.filter(item => item?.key === 'logout')}
            theme="light"
            style={{ minWidth: 'fit-content' }}
          />
        </Col>
      </Row>
      <div className={styles.header}>
        <Row className={styles.durationRow}>
          <Button
            type="link"
            disabled={!isEdit || !hasLdapCredentials}
            icon={<ScheduleFilled />}
            loading={loadings[1] || isCalendarLoading}
            onClick={() => handleExportCalendar(1)}
            title={!hasLdapCredentials ? message('calendar.export.no.credentials') : message('calendar.export')}
          >{message('calendar.export')}</Button>
          <TrackTimeButton className={styles.addTrackBtn} isEdit={isEdit} />
          {/* <TodayText /> */}
          <Col flex="auto">
            <TimePeriodStepper loader={<GlobalFetching />} />
          </Col>
        </Row>
        <Row className={styles.durationRow}>
        <TrackCalendarHeaderControlBar>{filters}</TrackCalendarHeaderControlBar>

        <CalendarExportModal
          visible={modalVisible}
          onHidden={() => setModalVisible(false)}
          data={calendarData}
          loading={isCalendarLoading}
          tracker={tracker} />
          </Row>
      </div>
    </>
  );
}
