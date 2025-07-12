import { Text } from 'components';
import { useMessage } from 'entities/locale/lib/hooks';
import calendar from 'entities/track/yandex/ui/YandexTimesheet/calendar.json';
import { Popover } from 'antd';
import { isRuLocale } from 'entities/locale/lib/helpers';
import { useCurrentLocale } from 'entities/locale/lib/hooks';
import { DATE_FORMAT_MONTH } from 'features/date/lib/constants';
import { DateWrapper, TDate } from 'features/date/lib/DateWrapper';
import React, { useMemo } from 'react';
import { useFilterValues } from 'features/filters/lib/useFilterValues';
import { clsx } from 'clsx';
import styles from './TrackCalendarColHead.module.scss';
import { getExpectedHoursForDay } from 'entities/track/common/lib/hooks/use-expected-hours-for-day';

type TProps = {
  date: string;
  now: TDate;
};
// TODO
export const TrackCalendarColHead = ({ date, now }: TProps) => {
  const currentLocale = useCurrentLocale();
  const { utcOffsetInMinutes } = useFilterValues();

  const dateObj = useMemo(() => DateWrapper.getDate({ date, utcOffsetInMinutes }), [date, utcOffsetInMinutes]);

  const dateFormat = useMemo(() => DateWrapper.getDateFormat(dateObj, DATE_FORMAT_MONTH), [dateObj]);
  const dayFormat = useMemo(
    () => DateWrapper.getDateFormat(dateObj, isRuLocale(currentLocale) ? 'dd' : 'ddd'),
    [dateObj, currentLocale],
  );

  const isSamePeriod = useMemo(() => now.isSame(date, 'day'), [now, date]);

  const isWeekend = useMemo(() => DateWrapper.isWeekend(dateObj), [dateObj]);
  const isHoliday = useMemo(() => DateWrapper.isHoliday(dateObj), [dateObj]);
  const isPreholiday = useMemo(() => DateWrapper.isPreholiday(dateObj), [dateObj]);

  const message = useMessage();
  let popoverContent = '';
  let marker = '';
  if (isHoliday) {
    popoverContent = message('calendar.holiday') || 'Holiday: non-working day';
    marker = ' *';
  } else if (isPreholiday) {
    popoverContent = message('calendar.preholiday') || 'Preholiday: shortened workday';
    marker = ' *';
  }

  return (
    <th className={clsx(styles.col, { [styles.col_weekend]: isWeekend || isHoliday })} data-current={isSamePeriod}>
      <div>
        {isHoliday || isPreholiday ? (
          <Popover content={popoverContent}>
            <span>
              <Text fs={13} fw={800} style={{ textTransform: 'capitalize', color: isHoliday ? '#d00' : undefined }}>
                {dayFormat}
              </Text>
              <Text fs={13} style={{ color: isHoliday ? '#d00' : undefined }}>
                {' '}
                {dateFormat}
                {marker}
              </Text>
            </span>
          </Popover>
        ) : (
          <>
            <Text fs={13} fw={800} style={{ textTransform: 'capitalize' }}>
              {dayFormat}
            </Text>
            <Text fs={13}> {dateFormat}</Text>
          </>
        )}
      </div>
    </th>
  );
};
