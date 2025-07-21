import { Button, CheckboxOptionType, Radio, RadioChangeEvent, Space } from 'antd';
import { useMessage } from 'entities/locale/lib/hooks';
import { DateWrapper } from 'features/date/lib/DateWrapper';
import { ReactNode, useMemo } from 'react';
import { Text } from 'components';
// import { ArrowLeft } from 'components/Icons/ArrowLeft';
// import { ArrowRight } from 'components/Icons/ArrowRight';
import { useCalculateSelectedPeriod } from 'entities/track/common/ui/TrackCalendarHeader/hooks/useCalculateSelectedPeriod';
import { useFilters } from 'features/filters/lib/useFilters';
import { CalendarOutlined, LeftCircleOutlined, RightCircleOutlined } from '@ant-design/icons';
import styles from './TimePeriodStepper.module.scss';

export function TimePeriodStepper({ loader, isDarkMode, currentMenuKey }: { loader?: ReactNode, isDarkMode: boolean, currentMenuKey?: string }) {
  const message = useMessage();

  const periodOptions: CheckboxOptionType[] = useMemo(
    () => [
      { value: 'week', label: message('track.calendar.duration.week') },
      { value: 'month', label: message('track.calendar.duration.month') },
    ],
    [message],
  );

  const { from, to, updateRangeFilter, utcOffsetInMinutes } = useFilters();

  const fromDate = useMemo(() => DateWrapper.getDate({ date: from, utcOffsetInMinutes }), [from, utcOffsetInMinutes]);
  const toDate = useMemo(() => DateWrapper.getDate({ date: to, utcOffsetInMinutes }), [to, utcOffsetInMinutes]);

  const unit = useCalculateSelectedPeriod(fromDate, toDate);

  const handleUnitChange = (e: RadioChangeEvent) => {
    const nextUnit = e.target.value;
    if (!nextUnit) return;

    const date = DateWrapper.getDate({ utcOffsetInMinutes });

    updateRangeFilter({
      from: DateWrapper.getDateFormat(date.startOf(nextUnit)),
      to: DateWrapper.getDateFormat(date.endOf(nextUnit)),
    });
  };

  const handleDateNavClick = (direction: -1 | 1) => () => {
    let nextFrom = fromDate;
    let nextTo = toDate;

    if (unit === 'month') {
      nextFrom = nextFrom.add(direction, unit).startOf('month');
      nextTo = nextFrom.endOf('month');
    } else if (unit === 'week') {
      nextFrom = nextFrom.add(direction * 7, 'days').startOf('day');
      nextTo = nextFrom.add(6, 'days').endOf('day');
    } else {
      const diff = toDate.diff(fromDate, 'days');
      nextFrom = nextFrom.add(direction * diff + direction, 'days').startOf('day');
      nextTo = nextFrom.add(diff, 'days').endOf('day');
    }

    updateRangeFilter({
      from: DateWrapper.getDateFormat(nextFrom),
      to: DateWrapper.getDateFormat(nextTo),
    });
  };

  return (
    <div className={styles.stepper}>
      <Space direction="horizontal" size="small">
        <CalendarOutlined style={{ color: isDarkMode ? '#fff' : '#000' }} />
        <Text>{message(`track.calendar.unit.${unit}`)}</Text>

        <Space size="small">
          <Button type="text" icon={<LeftCircleOutlined />} shape="circle" onClick={handleDateNavClick(-1)}>
          </Button>

          <Text fw={800} fs={20} lh={34} style={{ whiteSpace: 'nowrap' }}>
            {DateWrapper.getDateFormat(fromDate, 'DD MMMM')}
            {' – '}
            {DateWrapper.getDateFormat(toDate, 'DD MMMM')}
          </Text>

          <Button type="text" icon={<RightCircleOutlined />} shape="circle" style={{ verticalAlign: 'bottom' }} onClick={handleDateNavClick(1)}>
          </Button>
        </Space>
        {loader}
      </Space>

      <Radio.Group
        options={periodOptions}
        optionType="button"
        value={currentMenuKey === 'calendar' ? 'month' : unit}
        onChange={handleUnitChange}
        disabled={currentMenuKey === 'calendar'}
      />
    </div>
  );
}
