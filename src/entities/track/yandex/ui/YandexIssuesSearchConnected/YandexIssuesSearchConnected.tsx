import { IssuesSearch } from 'entities/issue/common/ui/IssuesSearch/IssuesSearch';
import { TYandexTrackerConfig } from 'entities/tracker/model/types';
import { useYandexIssuesSearchOptions } from 'entities/issue/yandex/lib/use-yandex-issues-search-options';
import { AutoCompleteProps } from 'antd';
import { FieldInputProps } from 'react-final-form';

type TProps = AutoCompleteProps<string> &
  FieldInputProps<string> & {
    tracker: TYandexTrackerConfig;
    maxItems?: number;
    perPage?: number;
  };

export const YandexIssuesSearchConnected = (props: TProps) => {
  const { value, tracker, maxItems, perPage } = props;
  const { onSearch, options, isFetching } = useYandexIssuesSearchOptions(tracker, value, maxItems, perPage);

  return <IssuesSearch {...props} onSearch={onSearch} options={options} isFetchingIssues={isFetching} />;
};
