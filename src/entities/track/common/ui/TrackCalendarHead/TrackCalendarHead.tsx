import { Message } from 'entities/locale/ui/Message';
import { memo, useMemo } from 'react';
import { TrackCalendarColHead } from 'entities/track/common/ui/TrackCalendarColHead';
import { Text } from 'components';
import { useMessage } from 'entities/locale/lib/hooks';
import { Button } from 'antd';
import { SortAscendingOutlined, SortDescendingOutlined } from '@ant-design/icons';
import { useFilters } from 'features/filters/lib/useFilters';
import { DateWrapper } from 'features/date/lib/DateWrapper';
import clsx from 'clsx';
import styles from './TrackCalendarHead.module.scss';

interface ITrackCalendarHeadProps {
  range: string[];
  sortingKey: string;
  isDarkMode: boolean;
}

export const TrackCalendarHead = memo(({ range, sortingKey, isDarkMode }: ITrackCalendarHeadProps) => {
  const message = useMessage();
  const { sorting, updateSorting, utcOffsetInMinutes } = useFilters();

  const now = useMemo(() => DateWrapper.getDate({ utcOffsetInMinutes }), [utcOffsetInMinutes]);

  const toggleSorting = () => {
    updateSorting(sortingKey, sorting.sortOrder === 'ASC' ? 'DESC' : 'ASC');
  };

  return (
    <thead className={clsx(styles.head, { [styles.head_dark]: isDarkMode }, { [styles.head_light]: !isDarkMode })}>
      <tr>
        <th className={styles.issueCol} aria-label={message('issue.title')}>
          <Button type="text" onClick={toggleSorting} className={styles.issueSortBtn}>
            <Text fs={13}>
              <Message id="issue.title" />
            </Text>
            {sorting.sortOrder === 'ASC' && <SortAscendingOutlined />}
            {sorting.sortOrder === 'DESC' && <SortDescendingOutlined />}
          </Button>
        </th>

        <th className={styles.statusCol} aria-label={message('issue.item.status')}>
          <div>
            <Text fs={13}>
              <Message id="issue.item.status" />
            </Text>
          </div>
        </th>

        {/* TODO Translate to russian New columns for domains, productteams, products */}
        <th className={styles.domainsCol} aria-label="Domains">
          <Text fs={13}>
            <Message id="track.domains" />
          </Text>
        </th>
        <th className={styles.productTeamsCol} aria-label="Product Teams">
          <Text fs={13}>
            <Message id="track.productTeams" />
          </Text>
        </th>
        <th className={styles.productsCol} aria-label="Products">
          <Text fs={13}>
            <Message id="track.products" />
          </Text>
        </th>

        {range.map((date) => (
          <TrackCalendarColHead date={date} key={date} now={now} isDarkMode={isDarkMode} />
        ))}

        <th className={styles.sumCol} aria-label={message('issue.item.summary')}>
          <Text fs={13}>
            <Message id="issue.item.summary" />
          </Text>
        </th>
      </tr>
    </thead>
  );
});

TrackCalendarHead.displayName = 'TrackCalendarHead';
