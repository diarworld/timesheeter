import { Button, Col, Row, Menu, MenuProps, Modal, Typography, Card, Avatar, App } from 'antd';
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
  CalendarOutlined,
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

import { DarkModeSwitch, ThemeMode } from 'entities/track/common/ui/DarkModeSwitch';
import { useYandexUser } from 'entities/user/yandex/hooks/use-yandex-user';
import { useFilterValues } from 'features/filters/lib/useFilterValues';
import clsx from 'clsx';
import { useGetUserExtrasQuery } from 'entities/user/common/model/api';
import { YandexTracker } from 'components/Icons/YandexTracker';
import { PhotoUploadModal } from 'entities/track/common/ui/PhotoUploadModal/PhotoUploadModal';
import styles from './TrackCalendarHeader.module.scss';
import { TimePeriodStepper } from './TimePeriodStepper';
import { TrackCalendarHeaderControlBar } from './TrackCalendarHeaderControlBar';

interface ITrackCalendarHeaderProps {
  isEdit?: boolean;
  filters?: ReactNode;
  tracker: TTrackerConfig;
  currentMenuKey: string;
  onMenuChange: (key: string) => void;
  isDarkMode: boolean;
  setIsDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
}

// Move UserAvatar and UserInfo outside the component to avoid unstable nested components
interface IUserExtras {
  photo?: string;
  department?: string;
  division?: string;
}

interface IUserAvatarProps {
  userExtras: IUserExtras;
  isDarkMode: boolean;
  setPhotoUploadModalVisible: (visible: boolean) => void;
}
const UserAvatar: React.FC<IUserAvatarProps> = ({ userExtras, isDarkMode, setPhotoUploadModalVisible }) => {
  if (userExtras?.photo) {
    return (
      <div
        style={{
          cursor: 'pointer',
          border: '2px solid transparent',
          transition: 'border-color 0.2s',
          borderRadius: '50%',
          marginTop: '5px',
        }}
        onClick={() => setPhotoUploadModalVisible(true)}
        onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
          e.currentTarget.style.borderColor = '#1890ff';
        }}
        onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
          e.currentTarget.style.borderColor = 'transparent';
        }}
        tabIndex={0}
        role="button"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            setPhotoUploadModalVisible(true);
          }
        }}
        aria-label="Upload photo"
      >
        <Avatar src={`data:image/jpeg;base64,${userExtras.photo}`} size={42} />
      </div>
    );
  }
  return (
    <div
      onClick={() => setPhotoUploadModalVisible(true)}
      style={{
        cursor: 'pointer',
        padding: '4px',
        borderRadius: '50%',
        border: '2px solid transparent',
        transition: 'border-color 0.2s',
      }}
      onMouseEnter={(e: React.MouseEvent<HTMLDivElement>) => {
        e.currentTarget.style.borderColor = '#1890ff';
      }}
      onMouseLeave={(e: React.MouseEvent<HTMLDivElement>) => {
        e.currentTarget.style.borderColor = 'transparent';
      }}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          setPhotoUploadModalVisible(true);
        }
      }}
      aria-label="Upload photo"
    >
      <YandexTracker
        style={{
          fill: isDarkMode ? '#fff' : '#000',
          fontSize: '20px',
        }}
      />
    </div>
  );
};

interface IUserInfoProps {
  userExtras: IUserExtras;
  isDarkMode: boolean;
}
const UserInfo: React.FC<IUserInfoProps> = ({ userExtras, isDarkMode }) => {
  const hasExtras = userExtras?.department || userExtras?.division;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginTop: '-10px' }}>
      {hasExtras && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          {userExtras.department && (
            <Typography.Text
              style={{
                fontSize: '11px',
                color: isDarkMode ? '#8c8c8c' : '#666',
                lineHeight: '1',
                cursor: 'default',
              }}
            >
              {userExtras.department}
            </Typography.Text>
          )}
          {userExtras.division && (
            <Typography.Text
              style={{
                fontSize: '11px',
                color: isDarkMode ? '#8c8c8c' : '#666',
                lineHeight: '1',
                cursor: 'default',
              }}
            >
              {userExtras.division}
            </Typography.Text>
          )}
        </div>
      )}
    </div>
  );
};

export function TrackCalendarHeader({
  isEdit,
  filters,
  tracker,
  currentMenuKey,
  onMenuChange,
  isDarkMode,
  setIsDarkMode,
}: ITrackCalendarHeaderProps) {
  const message = useMessage();
  const { message: antdMessage } = App.useApp();
  const [getCalendarMeetings, { isLoading: isCalendarLoading }] = useGetCalendarMeetingsMutation();
  const { from, to } = useFilters();

  const [loadings, setLoadings] = useState<boolean[]>([]);
  const hasLdapCredentials = useAppSelector(selectHasLdapCredentials) || false;
  const [calendarData, setCalendarData] = useState<IEwsCalendarResponse | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [rulesModalVisible, setRulesModalVisible] = useState(false);
  const [photoUploadModalVisible, setPhotoUploadModalVisible] = useState(false);
  // const handleClickTheme = () => setIsDarkMode((prev) => !prev);
  const [themeMode, setThemeMode] = useState(isDarkMode ? ThemeMode.Dark : ThemeMode.Light);

  const toggleThemeMode = (themeMode: ThemeMode) => {
    setThemeMode(themeMode);
    setIsDarkMode(themeMode === ThemeMode.Dark);
  };
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
    [getCalendarMeetings, from, to, message, antdMessage],
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
  const { userId, login } = useFilterValues();
  const { self } = useYandexUser(tracker, userId, login);
  const { data: userExtras, refetch: refetchUserExtras } = useGetUserExtrasQuery(self?.uid || 0, {
    skip: !self?.uid,
  });
  const displayName = self ? self.display : tracker.username || '';
  const leftMenuItems: TMenuItem[] = [
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
      label: message('menu.calendar'),
      key: 'calendar',
      icon: <CalendarOutlined />,
      // disabled: true,
    },
    {
      label: message('menu.reports'),
      key: 'reports',
      icon: <DashboardOutlined />,
      // disabled: true,
    },
  ];
  const rightMenuItems: TMenuItem[] = [
    {
      key: 'theme',
      label: (
        <DarkModeSwitch
          onChange={toggleThemeMode}
          isSystemThemeModeEnabled={false}
          themeMode={themeMode}
          size={36}
          style={{ marginTop: '5px' }}
        />
      ),
      disabled: true,
      style: { cursor: 'default', padding: '0px' },
    },
    {
      key: 'user-info',
      label: (
        <Card size="small" style={{ marginTop: '-5px', borderLeft: 'none', borderRight: 'none', borderTop: 'none' }}>
          <Card.Meta
            style={{ margin: 0, padding: 0 }}
            avatar={
              <UserAvatar
                userExtras={userExtras as IUserExtras}
                isDarkMode={isDarkMode}
                setPhotoUploadModalVisible={setPhotoUploadModalVisible}
              />
            }
            title={
              <Typography.Text
                style={{
                  fontSize: '12px',
                  fontWeight: 800,
                  margin: 0,
                  padding: 0,
                  cursor: 'default',
                  marginTop: '5px',
                }}
              >
                {displayName}
              </Typography.Text>
            }
            description={<UserInfo userExtras={userExtras as IUserExtras} isDarkMode={isDarkMode} />}
          />
        </Card>
      ),
      className: clsx(styles.menu),
      disabled: true,
      style: { cursor: 'default' },
    },
    {
      key: 'logout',
      label: message('home.logout'),
      icon: <LogoutOutlined />,
      onClick: tracker ? logoutTracker : undefined,
      disabled: !tracker,
    },
  ];
  const menuItems = [
    ...leftMenuItems,
    {
      type: 'divider' as const,
      style: { flexGrow: 1, order: leftMenuItems.length, borderTopWidth: 0, marginBlock: 0 },
    },
    ...rightMenuItems,
  ];

  const onClick: MenuProps['onClick'] = (e) => {
    if (e.key === 'tracks' || e.key === 'reports' || e.key === 'calendar') {
      onMenuChange(e.key);
    }
  };

  return (
    <>
      <Menu onClick={onClick} selectedKeys={[currentMenuKey]} mode="horizontal" items={menuItems} />

      <div
        className={clsx(styles.header, { [styles.header_dark]: isDarkMode }, { [styles.header_light]: !isDarkMode })}
      >
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
          <Col flex="auto">
            <TimePeriodStepper loader={<GlobalFetching />} isDarkMode={isDarkMode} currentMenuKey={currentMenuKey} />
          </Col>
        </Row>
        <Row className={styles.durationRow}>
          <TrackCalendarHeaderControlBar
            isDarkMode={isDarkMode}
            currentMenuKey={currentMenuKey}
            disableShowWeekends={currentMenuKey === 'calendar'}
          >
            {filters}
          </TrackCalendarHeaderControlBar>

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
        <RulesManage tracker={tracker} isDarkMode={isDarkMode} />
      </Modal>
      {/* TODO: The import of PhotoUploadModal may violate a restricted import pattern. If so, refactor its location or usage as needed. */}
      <PhotoUploadModal
        visible={photoUploadModalVisible}
        onCancel={() => setPhotoUploadModalVisible(false)}
        onSuccess={() => refetchUserExtras()}
        uid={self?.uid || 0}
        currentPhoto={userExtras?.photo || null}
      />
    </>
  );
}
