import { Button, Col, Row, Menu, MenuProps, Modal, Avatar } from 'antd';
import { TrackTimeButton } from 'entities/track/common/ui/TrackCalendarHeader/TrackTimeButton';
import {
  ScheduleFilled,
  DashboardOutlined,
  SettingOutlined,
  LoginOutlined,
  UsergroupAddOutlined,
  LogoutOutlined,
  FieldTimeOutlined,
  OpenAIOutlined,
  WindowsOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { GlobalFetching } from 'shared/ui/GlobalFetching';
import { ReactNode, useCallback, useState, useEffect } from 'react';
import { useMessage } from 'entities/locale/lib/hooks';
import { useGetCalendarEventsMutation, IGraphCalendarResponse } from 'entities/track/common/model/ews-api';
import { useFilters } from 'features/filters/lib/useFilters';
import { CalendarExportModal } from 'entities/track/common/ui/CalendarExportModal';
import { TTrackerConfig } from 'entities/tracker/model/types';

import { useLdapLoginAction } from 'entities/track/common/lib/hooks/use-ldap-login-action';
import { useManageTeamAction } from 'entities/track/common/lib/hooks/use-manage-team-action';
import { useLogoutTracker } from 'entities/tracker/lib/useLogoutTracker';
import { useAppDispatch, useAppSelector } from 'shared/lib/hooks';
import { actionLocaleSetCurrent } from 'entities/locale/model/actions';
import { selectLocaleCurrent } from 'entities/locale/model/selectors';
import { localeApi } from 'entities/locale/model/api';
import { selectHasLdapCredentials } from 'entities/track/common/model/selectors';
import { track } from 'entities/track/common/model/reducers';
import { TrackCalendarHeaderControlBar } from './TrackCalendarHeaderControlBar';
import { TimePeriodStepper } from './TimePeriodStepper';

import styles from './TrackCalendarHeader.module.scss';
import { RulesManage } from 'entities/track/common/ui/RulesManage';
import { message as antdMessage } from 'antd';
import { useMsal } from '@azure/msal-react';
import { Text } from 'components';

interface ITrackCalendarHeaderProps {
  isEdit?: boolean;
  _upperRowControls?: ReactNode;
  filters?: ReactNode;
  tracker: TTrackerConfig;
  currentMenuKey: string;
  onMenuChange: (key: string) => void;
}

export function TrackCalendarHeader({
  isEdit,
  filters,
  _upperRowControls,
  tracker,
  currentMenuKey,
  onMenuChange,
}: ITrackCalendarHeaderProps) {
  const message = useMessage();
  const [getCalendarMeetings, { isLoading: isCalendarLoading }] = useGetCalendarEventsMutation();
  const { from, to } = useFilters();

  const [loadings, setLoadings] = useState<boolean[]>([]);
  const hasLdapCredentials = useAppSelector(selectHasLdapCredentials) || false;
  const [calendarData, setCalendarData] = useState<IGraphCalendarResponse | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [rulesModalVisible, setRulesModalVisible] = useState(false);
  const { instance, accounts } = useMsal();
  const activeAccount = instance.getActiveAccount();

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

  const handleExportCalendar = useCallback(
    async (index: number) => {
      // console.log('Export calendar clicked!');

      setLoadings((prevLoadings) => {
        const newLoadings = [...prevLoadings];
        newLoadings[index] = true;
        return newLoadings;
      });

      try {
        if (!accounts || accounts.length === 0) {
          antdMessage.error("Please sign in to export your calendar.");
          return;
        }
        // Get access token for Microsoft Graph
        const request = {
          scopes: ["https://graph.microsoft.com/.default"],
          account: accounts[0],
        };
        const tokenResponse = await instance.acquireTokenSilent(request);

        // Call the calendar API with current date range from filters
        const result = await getCalendarMeetings({
          accessToken: tokenResponse.accessToken,
          startDateTime: from,
          endDateTime: to,
        }).unwrap();

        if (result) {
          // console.log('Calendar meetings:', result.meetings);
          // console.log('Total meetings:', result.totalMeetings);
          // console.log('Date range used:', result.dateRange);

          // Show modal with the calendar data
          setCalendarData(result);
          setModalVisible(true);
        } else {
          console.error('Failed to fetch calendar meetings');
          antdMessage.error(message('calendar.export.error'));
        }
      } catch (error) {
        console.error('Error fetching calendar meetings:', error);
        antdMessage.error(message('calendar.export.error'));
      } finally {
        setLoadings((prevLoadings) => {
          const newLoadings = [...prevLoadings];
          newLoadings[index] = false;
          return newLoadings;
        });
      }
    },
    [getCalendarMeetings, from, to, instance, accounts, message],
  );

  type TMenuItem = Required<MenuProps>['items'][number];

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

  const logoutTracker = useLogoutTracker(tracker);

  const items: TMenuItem[] = [
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
            {
              label: message('manage.team'),
              icon: <UsergroupAddOutlined />,
              key: 'manage-team',
              onClick: useManageTeamAction(),
            },
            {
              label: message('menu.rules'),
              key: 'rules',
              icon: <OpenAIOutlined />,
              onClick: () => setRulesModalVisible(true),
            },
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
              onClick: handleClickLocaleSwitch,
            },
            // Remove tz edit, because it breacs time logging
            // {
            //   label: currentTzLabel,
            //   icon: <FieldTimeOutlined />,
            //   key: 'timezone-selector',
            //   children: timezoneMenuItems
            // }
          ],
        },
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
      key: 'user',
      label: activeAccount?.name || message('home.login'),
      icon: <WindowsOutlined />,
      disabled: !activeAccount,
    },
    {
      key: 'logout',
      label: message('home.logout'),
      icon: <LogoutOutlined />,
      onClick: tracker ? logoutTracker : undefined,
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
            items={items.filter((item) => item?.key !== 'logout' && item?.key !== 'user')}
            theme="light"
          />
        </Col>
        {/* <Button icon={<UserOutlined />}>
          <Text fs={14} fw={700} style={{ textTransform: 'capitalize' }}>
            {activeAccount?.name}
          </Text>
        </Button> */}
        {activeAccount ? (
          <>
            <WindowsOutlined style={{ marginRight: 10 }} />
            <Text style={{ marginRight: 10 }}>
              {activeAccount?.name || message('home.login')}
            </Text>
          </>
        ) : null}
        {/* <Menu
            mode="vertical"
            items={items.filter((item) => item?.key === 'user')}
            theme="light"
          /> */}
        <Col style={{ marginLeft: 'auto' }}>
          <Menu
            onClick={onClick}
            mode="horizontal"
            items={items.filter((item) => item?.key === 'logout')}
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
          >
            {message('calendar.export')}
          </Button>
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
            tracker={tracker}
          />
        </Row>
      </div>
      <Modal
        open={rulesModalVisible}
        onCancel={() => setRulesModalVisible(false)}
        footer={null}
        title={message('menu.rules.title')}
        style={{ minWidth: '800px' }}
      >
        <RulesManage tracker={tracker} />
      </Modal>
    </>
  );
}