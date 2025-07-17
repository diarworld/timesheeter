import type { RangePickerProps } from 'antd/lib/date-picker';
import { DatePicker } from 'antd';
import clsx from 'clsx';
import styles from './RangePicker.module.scss';

export const RangePicker = (props: RangePickerProps & { isDarkMode: boolean }) => (
  <div className={clsx(styles.wrapper, { [styles.wrapper_dark]: props.isDarkMode }, { [styles.wrapper_light]: !props.isDarkMode })}>
    <DatePicker.RangePicker {...props} getPopupContainer={(trigger) => trigger} />
  </div>
);
