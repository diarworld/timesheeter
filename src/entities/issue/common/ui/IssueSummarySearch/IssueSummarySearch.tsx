import { Input, Select, Spin, Space, Button } from 'antd';
import { useCallback, useState } from 'react';
import { useMessage } from 'entities/locale/lib/hooks';
import { TOption } from 'shared/lib/types';
import styles from 'entities/issue/common/ui/IssueSummarySearch/IssueSummarySearch.module.scss';
import { SearchOutlined } from '@ant-design/icons';

export interface IIssueSummarySearchProps {
  defaultValue: string | undefined;
  onSearch(str: string): void;
  onChange?(str: string): void;
  options?: TOption[];
  isFetchingIssues?: boolean;
  loadMore?: () => void;
  hasMore?: boolean;
  isLoadingMore?: boolean;
}

export const IssueSummarySearch = ({
  onSearch,
  onChange,
  defaultValue,
  options,
  isFetchingIssues,
  loadMore,
  hasMore,
  isLoadingMore,
}: IIssueSummarySearchProps) => {
  const message = useMessage();
  const [searchValue, setSearchValue] = useState(defaultValue || '');

  const handleSelect = useCallback(
    (issueKey: string) => {
      setSearchValue(issueKey);
      onSearch(issueKey);
      onChange?.(issueKey);
    },
    [onSearch, onChange],
  );

  const handleSearchClick = useCallback(() => {
    onSearch(searchValue);
    onChange?.(searchValue);
  }, [onSearch, onChange, searchValue]);

  const handleInputChange = useCallback((value: string) => {
    setSearchValue(value);
  }, []);

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

  if (options) {
    const dropdownContent = (menu: React.ReactNode) => (
      <Spin spinning={isFetchingIssues}>
        {menu}
      </Spin>
    );

    return (
      <Space.Compact>
        <Select
          className={styles.select}
          showSearch
          allowClear
          options={options}
          onSearch={onSearch}
          onChange={handleInputChange}
          value={searchValue || undefined}
          optionFilterProp="label"
          onSelect={handleSelect}
          popupRender={dropdownContent}
          onPopupScroll={handlePopupScroll}
          placeholder={message('filter.summary.placeholder')}
        />
        <Button icon={<SearchOutlined />} onClick={handleSearchClick} />
      </Space.Compact>
    );
  }

  return (
    <Input.Search
      className={styles.input}
      count={{ max: 300 }}
      defaultValue={defaultValue}
      onSearch={onSearch}
      placeholder={message('filter.summary.placeholder')}
      allowClear
    />
  );
};
