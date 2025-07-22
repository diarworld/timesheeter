import type { RangePickerProps } from 'antd/lib/date-picker';
import { DatePicker } from 'antd';
import clsx from 'clsx';
import styles from './RangePicker.module.scss';

export const RangePicker = ({ isDarkMode, ...rest }: RangePickerProps & { isDarkMode: boolean }) => (
  <div className={clsx(styles.wrapper, { [styles.wrapper_dark]: isDarkMode }, { [styles.wrapper_light]: !isDarkMode })}>
    <DatePicker.RangePicker {...rest} getPopupContainer={(trigger) => trigger} />
  </div>
);
