import {
  IssueSummarySearch,
  IIssueSummarySearchProps,
} from 'entities/issue/common/ui/IssueSummarySearch/IssueSummarySearch';
import { useYandexIssuesSearchOptionsPaginated } from 'entities/issue/yandex/lib/use-yandex-issues-search-options';
import { TYandexTrackerConfig } from 'entities/tracker/model/types';

interface IProps extends Omit<IIssueSummarySearchProps, 'onSearch' | 'loadMore' | 'hasMore' | 'isLoadingMore'> {
  tracker: TYandexTrackerConfig;
  value: string | undefined;
  onChange(value: string): void;
  maxItems?: number;
  perPage?: number;
}

export const YandexIssueSummarySearchConnected = ({
  tracker,
  value,
  onChange,
  maxItems: _maxItems,
  perPage = 50,
  defaultValue,
}: IProps) => {
  const { onSearch, options, isFetching, loadMore, hasMore, isLoadingMore } = useYandexIssuesSearchOptionsPaginated(
    tracker,
    value,
    perPage,
  );

  return (
    <IssueSummarySearch
      defaultValue={defaultValue}
      onSearch={onSearch}
      onChange={onChange}
      options={options}
      isFetchingIssues={isFetching}
      loadMore={loadMore}
      hasMore={hasMore}
      isLoadingMore={isLoadingMore}
    />
  );
};
