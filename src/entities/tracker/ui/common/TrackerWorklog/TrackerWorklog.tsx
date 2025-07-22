import { isJiraTrackerCfg, isYandexTrackerCfg, TTrackerConfig } from 'entities/tracker/model/types';
import { Head } from 'widgets/Head';
import { useMessage } from 'entities/locale/lib/hooks';
import { Layout } from 'widgets/Layout';
import { useAppSelector } from 'shared/lib/hooks';
import { selectLocaleCurrent } from 'entities/locale/model/selectors';
import { YandexAuthorizedTimesheet } from 'entities/track/yandex/ui/YandexAuthorizedTimesheet/YandexAuthorizedTimesheet';
import { AuthRoute } from 'entities/auth/ui/AuthRoute';
import { JiraAuthorizedTimesheet } from 'entities/track/jira/ui/JiraAuthorizedTimesheet/JiraAuthorizedTimesheet';
import { ConfigProvider, theme } from 'antd';
import React, { useEffect, useState } from 'react';

type TProps = {
  tracker: TTrackerConfig | undefined;
  unauthorizedErrorShouldAppearAsOrgChange?: boolean;
};

export const TrackerWorklog = ({ tracker, unauthorizedErrorShouldAppearAsOrgChange = false }: TProps) => {
  const message = useMessage();
  const language = useAppSelector(selectLocaleCurrent);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const stored = localStorage.getItem('isDarkMode');
    return stored === null ? false : stored === 'true';
  });
  const { defaultAlgorithm, darkAlgorithm } = theme;

  // Only keep the effect that writes to localStorage and updates body background
  useEffect(() => {
    localStorage.setItem('isDarkMode', String(isDarkMode));
    document.body.style.backgroundColor = isDarkMode ? '#141414' : '#fff';
  }, [isDarkMode]);

  let renderedTracker = <span>No such tracker</span>;
  if (isYandexTrackerCfg(tracker)) {
    renderedTracker = (
      <AuthRoute tracker={tracker}>
        <YandexAuthorizedTimesheet
          language={language}
          tracker={tracker}
          unauthorizedErrorShouldAppearAsOrgChange={unauthorizedErrorShouldAppearAsOrgChange}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
        />
      </AuthRoute>
    );
  } else if (isJiraTrackerCfg(tracker)) {
    renderedTracker = <JiraAuthorizedTimesheet language={language} tracker={tracker} />;
  }

  return (
    <ConfigProvider theme={{ algorithm: isDarkMode ? darkAlgorithm : defaultAlgorithm }}>
      <Layout
        head={<Head description={message('home.description')} title={tracker?.name ?? 'No tracker found'} />}
        isDarkMode={isDarkMode}
      >
        {React.cloneElement(renderedTracker, { isDarkMode, setIsDarkMode })}
      </Layout>
    </ConfigProvider>
  );
};
