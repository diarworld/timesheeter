import React, { useCallback } from 'react';
import { AutoCompleteProps, Select, Spin } from 'antd';
import { FieldInputProps } from 'react-final-form';
import { TOption } from 'shared/lib/types';
import { DEFAULT_ISSUES_PER_PAGE, DEFAULT_ISSUES_MAX_ITEMS } from 'entities/issue/common/lib/constants';

export type TIssuesSearchProps = AutoCompleteProps<string> &
  FieldInputProps<string> & {
    options: TOption[];
    isFetchingIssues: boolean;
    onSearch(value: string): void;
    loadMore?: () => void;
    hasMore?: boolean;
    isLoadingMore?: boolean;
    perPage?: number;
    maxItems?: number;
  };

export const IssuesSearch = ({
  onChange,
  value,
  options,
  onSearch,
  isFetchingIssues,
  loadMore,
  hasMore,
  isLoadingMore,
  perPage: _perPage = DEFAULT_ISSUES_PER_PAGE,
  maxItems: _maxItems = DEFAULT_ISSUES_MAX_ITEMS,
  ...autoCompleteProps
}: TIssuesSearchProps) => {
  // perPage and maxItems are used by connected components (e.g., YandexIssuesSearchConnected)
  // to configure the underlying API calls
  const handleSelect = useCallback(
    (issueKey: string) => {
      onChange(issueKey);
    },
    [onChange],
  );

  const handlePopupScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.target as HTMLDivElement;
      const { scrollTop, clientHeight, scrollHeight } = target;
      if (scrollHeight - scrollTop - clientHeight < 50 && hasMore && !isLoadingMore && loadMore) {
        loadMore();
      }
    },
    [hasMore, isLoadingMore, loadMore],
  );

  return (
    <Select
      {...autoCompleteProps}
      showSearch
      allowClear
      options={options}
      onSearch={onSearch}
      // when initial value is undefined, react-final-form may pass "" here and in that case antd select doesn't show placeholder
      value={value || undefined}
      optionFilterProp="label"
      onSelect={handleSelect}
      onPopupScroll={handlePopupScroll}
      popupRender={(menu) => <Spin spinning={isFetchingIssues}>{menu}</Spin>}
    />
  );
};
