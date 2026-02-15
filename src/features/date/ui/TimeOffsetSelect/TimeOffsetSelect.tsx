import { useFilters } from 'features/filters/lib/useFilters';
import { Select } from 'antd';
import { useMessage } from 'entities/locale/lib/hooks';
import { UTC_OFFSET_TO_TIMEZONE_MAP } from 'features/date/lib/constants';
import { getTimeOffsetLabelByOffset } from 'features/date/lib/helpers';
import { getBrowserTimezoneOffset } from 'features/filters/lib/useTimeOffsetFilter';

export const timezoneTimeOffsetOptions = Array.from(UTC_OFFSET_TO_TIMEZONE_MAP.values()).map((tz) => ({
  value: tz.rawOffsetInMinutes,
  label: getTimeOffsetLabelByOffset(tz.rawOffsetInMinutes) ?? tz.rawOffsetInMinutes.toString(),
}));

export const TimeOffsetSelect = () => {
  const { utcOffsetInMinutes, updateTimeOffset } = useFilters();

  const message = useMessage();

  const value = UTC_OFFSET_TO_TIMEZONE_MAP.has(utcOffsetInMinutes) ? utcOffsetInMinutes : getBrowserTimezoneOffset();

  return (
    <Select
      options={timezoneTimeOffsetOptions}
      allowClear
      onChange={updateTimeOffset}
      value={UTC_OFFSET_TO_TIMEZONE_MAP.has(value) ? value : undefined}
      placeholder={message('timeOffset.placeholder')}
    />
  );
};
