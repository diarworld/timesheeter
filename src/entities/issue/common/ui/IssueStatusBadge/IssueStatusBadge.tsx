import styles from 'entities/issue/common/ui/IssueStatusBadge/IssueStatusBadge.module.scss';
import { TIssueStatus } from 'entities/issue/common/model/types';
import clsx from 'clsx';

interface IIssueStatusBadgeProps {
  status: TIssueStatus;
  isDarkMode: boolean;
}

export const IssueStatusBadge = ({ status, isDarkMode }: IIssueStatusBadgeProps) => (
  <div className={clsx(styles.badge, { [styles.badge_dark]: isDarkMode }, { [styles.badge_light]: !isDarkMode })} data-key={status.key}>
    {status.display}
  </div>
);
