import { PropsWithChildren } from 'react';
import styles from './TrackCalendarInnerRow.module.scss';
import clsx from 'clsx';

export const TrackCalendarInnerRow = ({ children, isDarkMode }: PropsWithChildren<{ isDarkMode: boolean }>) => (
  <tr className={clsx(styles.row, { [styles.row_dark]: isDarkMode }, { [styles.row_light]: !isDarkMode })}>{children}</tr>
);

TrackCalendarInnerRow.displayName = 'TrackCalendarInnerRow';