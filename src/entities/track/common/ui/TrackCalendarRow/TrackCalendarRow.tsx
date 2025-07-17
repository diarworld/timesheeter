import { Button, Tooltip } from 'antd';
import { PushpinFilled, PushpinOutlined } from '@ant-design/icons';
import { ArrowRight } from 'components/Icons/ArrowRight';
import { IssueStatusBadge } from 'entities/issue/common/ui/IssueStatusBadge';
import { TrackInnerRows } from 'entities/track/common/ui//TrackInnerRows';
import { AddNewTrackRowButton } from 'entities/track/common/ui/AddNewTrackRowButton';
import { memo, useCallback, useMemo, useState } from 'react';
import { TrackCalendarColIssueSumDay } from 'entities/track/common/ui/TrackCalendarColIssueSumDay';
import { TrackCalendarInnerRow } from 'entities/track/common/ui/TrackCalendarInnerRow';
import { TrackCalendarColSumIssue } from 'entities/track/common/ui/TrackCalendarColSumIssue';
import { compareTrackCalendarRowProps } from 'entities/track/common/ui/TrackCalendarRow/compareTrackCalendarRowProps';
import { TTrack, TTrackInputEditForm } from 'entities/track/common/model/types';
import { useMessage } from 'entities/locale/lib/hooks';
import { TIssue } from 'entities/issue/common/model/types';
import { TYandexIssue } from 'entities/issue/yandex/model/types';
import styles from './TrackCalendarRow.module.scss';
import clsx from 'clsx';

export type TTrackCalendarRowProps = {
  range: string[];
  issue: TIssue | TYandexIssue;
  tracks?: TTrack[] | undefined;
  date2IssueTracks: Record<string, TTrack[]>;
  isEdit?: boolean;
  isEditTrackComment?: boolean;
  trackCommentEditDisabledReason?: string;
  pinnedIssues: string[];
  pinIssue?(issueKey: string): void;
  unpinIssue?(issueKey: string): void;
  updateTrack(input: Partial<TTrackInputEditForm>, issueIdOrKey?: string, trackId?: number | string): void;
  getIssueUrl(issueKey: string): string;
  deleteTrack(form: { issueIdOrKey: string; trackId: number | string }): void;
  isDarkMode: boolean;
};

const fixedColumnsCount = 3; // 3 = issueKey + status + summary columns

// !NOTICE that this memo component has custom compareProps function implementation
export const TrackCalendarRow = memo(
  ({
    range,
    issue,
    isEdit = false,
    isEditTrackComment = isEdit,
    pinnedIssues,
    pinIssue,
    unpinIssue,
    date2IssueTracks,
    tracks,
    updateTrack,
    getIssueUrl,
    trackCommentEditDisabledReason,
    deleteTrack,
    isDarkMode,
  }: TTrackCalendarRowProps) => {
    const message = useMessage();
    const [isExpanded, setIsExpanded] = useState(false);
    const issueId = issue.id;
    const issueKey = issue.key;

    const issueIsPinned = useMemo(() => pinnedIssues.includes(issueKey), [pinnedIssues, issueKey]);

    const handlePinIssue = useCallback(() => {
      pinIssue?.(issueKey);
    }, [pinIssue, issueKey]);

    const handleUnpinIssue = useCallback(() => {
      unpinIssue?.(issueKey);
    }, [issueKey, unpinIssue]);

    if (!issue) {
      return null;
    }

    const rowColSpan = range.length + fixedColumnsCount;

    return (
      <>
        <tr className={styles.row}>
          <th className={clsx(styles.issueCol, { [styles.issueCol_dark]: isDarkMode }, { [styles.issueCol_light]: !isDarkMode })}>
            <div>
              <Button
                type="text"
                shape="circle"
                className={styles.expandBtn}
                data-expanded={isExpanded}
                onClick={() => setIsExpanded(!isExpanded)}
              >
                <ArrowRight />
              </Button>

              <div className={styles.issueDescription}>
                <div className={styles.issueKeyRow}>
                  <a
                    className={clsx(styles.issueKey, { [styles.issueKey_dark]: isDarkMode }, { [styles.issueKey_light]: !isDarkMode })}
                    href={getIssueUrl(issue.key)}
                    target="_blank"
                    rel="nofollow noopener noreferrer"
                  >
                    {issue.key}
                  </a>
                  {issueIsPinned ? (
                    <>{unpinIssue && <PushpinFilled className={clsx(styles.pinIcon, { [styles.pinIcon_dark]: isDarkMode }, { [styles.pinIcon_light]: !isDarkMode })} onClick={handleUnpinIssue} />}</>
                  ) : (
                    <>{pinIssue && <PushpinOutlined className={clsx(styles.pinIcon, { [styles.pinIcon_dark]: isDarkMode }, { [styles.pinIcon_light]: !isDarkMode })} onClick={handlePinIssue} />}</>
                  )}
                </div>
                <div className={clsx(styles.issueSummary, { [styles.issueSummary_dark]: isDarkMode }, { [styles.issueSummary_light]: !isDarkMode })}>{issue.summary}</div>
              </div>
            </div>
          </th>

          <th className={clsx(styles.statusCol, { [styles.statusCol_dark]: isDarkMode }, { [styles.statusCol_light]: !isDarkMode })} aria-label="issue status badge">
            <div>
              <IssueStatusBadge status={issue.status} isDarkMode={isDarkMode} />
            </div>
          </th>

          {/* New columns for domains, productteams, products */}
          <td className={styles.domainsCol}>
            {'domains' in issue && Array.isArray(issue.domains) && issue.domains.length > 0
              ? issue.domains.map((domain, idx) => {
                  const [firstPart] = domain.split('—');
                  return (
                    <Tooltip key={domain} placement="top" title={domain}>
                      <Button type="text" size="small">
                        {firstPart.trim()}
                      </Button>
                    </Tooltip>
                  );
                })
              : null}
          </td>
          <td className={styles.productTeamsCol}>
            {'productteams' in issue && Array.isArray(issue.productteams) && issue.productteams.length > 0
              ? issue.productteams.map((team, idx) => {
                  const [firstPart] = team.split('—');
                  return (
                    <Tooltip key={team} placement="top" title={team}>
                      <Button type="text" size="small">
                        {firstPart.trim()}
                      </Button>
                    </Tooltip>
                  );
                })
              : null}
          </td>
          <td className={styles.productsCol}>
            {'products' in issue && Array.isArray(issue.products) && issue.products.length > 0
              ? issue.products.map((product, idx) => {
                  const [firstPart] = product.split('—');
                  return (
                    <Tooltip key={product} placement="top" title={product}>
                      <Button type="text" size="small">
                        {firstPart.trim()}
                      </Button>
                    </Tooltip>
                  );
                })
              : null}
          </td>

          {range.map((date) => (
            <TrackCalendarColIssueSumDay
              key={date.valueOf()}
              isEdit={isEdit}
              date={date}
              tracks={date2IssueTracks[date]}
              issueKey={issueKey}
              isDarkMode={isDarkMode}
            />
          ))}

          <TrackCalendarColSumIssue tracks={tracks} isDarkMode={isDarkMode} />
        </tr>

        {isExpanded && (
          <>
            {isEdit && (
              <TrackCalendarInnerRow isDarkMode={isDarkMode}>
                <td colSpan={rowColSpan} className={styles.newTrackRow} aria-label={message('track.create.add')}>
                  <AddNewTrackRowButton issueKey={issueKey} isDarkMode={isDarkMode} />
                </td>
              </TrackCalendarInnerRow>
            )}

            <TrackInnerRows
              issueId={issueId}
              tracks={tracks}
              range={range}
              isEdit={isEdit}
              isEditTrackComment={isEditTrackComment}
              trackCommentEditDisabledReason={trackCommentEditDisabledReason}
              updateTrack={updateTrack}
              deleteTrack={deleteTrack}
              isDarkMode={isDarkMode}
            />
          </>
        )}
      </>
    );
  },
  compareTrackCalendarRowProps,
);

TrackCalendarRow.displayName = 'TrackCalendarRow';
