import { Button, Col, Row, Menu, MenuProps, Modal, message as antdMessage, Typography, Card } from 'antd';
import { TrackTimeButton } from 'entities/track/common/ui/TrackCalendarHeader/TrackTimeButton';
import Icon, {
  ScheduleFilled,
  DashboardOutlined,
  SettingOutlined,
  LoginOutlined,
  UsergroupAddOutlined,
  LogoutOutlined,
  FieldTimeOutlined,
  OpenAIOutlined,
} from '@ant-design/icons';
import { GlobalFetching } from 'shared/ui/GlobalFetching';
import { ReactNode, useCallback, useState, useEffect } from 'react';
import { useMessage } from 'entities/locale/lib/hooks';
import { useGetCalendarMeetingsMutation, IEwsCalendarResponse } from 'entities/track/common/model/ews-api';
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
import { RulesManage } from 'entities/track/common/ui/RulesManage';
import { CustomIconComponentProps } from '@ant-design/icons/lib/components/Icon';
import { TrackCalendarHeaderControlBar } from './TrackCalendarHeaderControlBar';
import { TimePeriodStepper } from './TimePeriodStepper';

import { DarkModeSwitch } from 'react-toggle-dark-mode';
import styles from './TrackCalendarHeader.module.scss';
import { useYandexUser } from 'entities/user/yandex/hooks/use-yandex-user';
import { useFilterValues } from 'features/filters/lib/useFilterValues';
import clsx from 'clsx';

interface ITrackCalendarHeaderProps {
  isEdit?: boolean;
  _upperRowControls?: ReactNode;
  filters?: ReactNode;
  tracker: TTrackerConfig;
  currentMenuKey: string;
  onMenuChange: (key: string) => void;
  isDarkMode: boolean;
  setIsDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
}

export function TrackCalendarHeader({
  isEdit,
  filters,
  _upperRowControls,
  tracker,
  currentMenuKey,
  onMenuChange,
  isDarkMode,
  setIsDarkMode,
}: ITrackCalendarHeaderProps) {
  const message = useMessage();
  const [getCalendarMeetings, { isLoading: isCalendarLoading }] = useGetCalendarMeetingsMutation();
  const { from, to } = useFilters();

  const [loadings, setLoadings] = useState<boolean[]>([]);
  const hasLdapCredentials = useAppSelector(selectHasLdapCredentials) || false;
  const [calendarData, setCalendarData] = useState<IEwsCalendarResponse | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [rulesModalVisible, setRulesModalVisible] = useState(false);
  const handleClickTheme = () => setIsDarkMode(prev => !prev);

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
          end_date: currentTo,
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
    [getCalendarMeetings, from, to, message],
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
  const { userId, login } = useFilterValues();
  const { self } = useYandexUser(tracker, userId, login);
  const displayName = self ? self.display : tracker.username || '';
  // const displayName = user ? user.display : tracker.username || '';
  const YTSvg = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 16 16">
      <path
        fillRule="evenodd"
        d="M2.75 2.5a.25.25 0 0 0-.25.25v2.167c0 .138.112.25.25.25h2.417V2.5zm3.917 0v2.667h2.666V2.5zm4.166 0v2.667h2.417a.25.25 0 0 0 .25-.25V2.75a.25.25 0 0 0-.25-.25zm0 4.167h2.417A1.75 1.75 0 0 0 15 4.917V2.75A1.75 1.75 0 0 0 13.25 1H2.75A1.75 1.75 0 0 0 1 2.75v2.167c0 .966.784 1.75 1.75 1.75h2.417v6.583c0 .966.783 1.75 1.75 1.75h2.166a1.75 1.75 0 0 0 1.75-1.75zm-1.5 0H6.667v2.666h2.666zm0 4.166H6.667v2.417c0 .138.112.25.25.25h2.166a.25.25 0 0 0 .25-.25z"
        clipRule="evenodd"
      />
    </svg>
  );
  const YTIcon = (props: Partial<CustomIconComponentProps>) => <Icon component={YTSvg} {...props} />;
  return (
    <>
      <Row className={styles.menu} justify="space-between" align="middle">
        <Col flex="auto">
          <Menu
            onClick={onClick}
            selectedKeys={[currentMenuKey]}
            mode="horizontal"
            items={items.filter((item) => item?.key !== 'logout')}
            theme="light"
          />
        </Col>

        <Col style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
            {/* <Button onClick={handleClickTheme} style={{ height: '46px' }}> */}
              {/* {isDarkMode ? "Light" : "Dark"} */}
            {/* </Button> */}
            <DarkModeSwitch
              style={{ marginRight: '10px', }}
              checked={isDarkMode}
              onChange={handleClickTheme}
              size={22}
            />
          <Card style={{ display: 'flex', alignItems: 'center', padding: '0px', height: '46px' }}>
          <YTIcon style={{ marginRight: 10, fill: isDarkMode ? '#fff' : '#000' }} />
          <Typography.Text style={{ marginRight: 10 }}>{displayName}</Typography.Text>
          </Card>
          <Menu
            onClick={onClick}
            mode="horizontal"
            items={items.filter((item) => item?.key === 'logout')}
            theme="light"
            style={{ minWidth: 'fit-content' }}
          />
        </Col>
      </Row>
      <div className={clsx(styles.header, { [styles.header_dark]: isDarkMode }, { [styles.header_light]: !isDarkMode })}>
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
            <TimePeriodStepper loader={<GlobalFetching />} isDarkMode={isDarkMode} />
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
