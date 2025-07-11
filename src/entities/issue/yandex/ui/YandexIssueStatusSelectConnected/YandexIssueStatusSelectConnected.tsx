import { useMemo } from 'react';
import { yandexIssueApi } from 'entities/issue/yandex/model/yandex-api';
import { defaultLocale } from 'entities/locale/model/constants';
import { TCurrentLocale } from 'entities/locale/model/types';
import { TYandexTrackerConfig } from 'entities/tracker/model/types';
import {
  IIssueStatusSelectProps,
  IssueStatusSelect,
} from 'entities/issue/common/ui/IssueStatusSelect/IssueStatusSelect';

type TProps = Omit<IIssueStatusSelectProps, 'statusList' | 'isFetchingStatusList'> & {
  language: TCurrentLocale | undefined;
  tracker: TYandexTrackerConfig;
};

export const YandexIssueStatusSelectConnected = ({ language, tracker, ...props }: TProps) => {
  const { currentData: statusList, isFetching: isFetchingStatusList } = yandexIssueApi.useGetYandexStatusesQuery(
    { language: language ?? defaultLocale, tracker },
    { skip: !language },
  );

  const sortedStatusList = useMemo(
    () => (statusList ? [...statusList].sort((a, b) => a.name.localeCompare(b.name)) : undefined),
    [statusList],
  );

  return <IssueStatusSelect {...props} statusList={sortedStatusList} isFetchingStatusList={isFetchingStatusList} />;
};
