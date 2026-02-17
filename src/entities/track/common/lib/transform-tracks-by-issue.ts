import { TTransformedTracksByUser, TBusinessDurationData } from 'entities/track/common/model/types';
import { isoDurationToBusinessMs } from './iso-duration-to-business-ms';
import { msToBusinessDurationData } from './ms-to-business-duration-data';
import { businessDurationDataToIso } from './business-duration-data-to-iso';

const DEBUG = process.env.DEBUG === 'true' || process.env.LOG_LEVEL === 'debug';

/**
 * Represents a single row in the issue summary table
 */
export type TIssueSummaryRow = {
  /** The issue key (e.g., "PROJ-123") */
  issueKey: string;
  /** The issue summary/description */
  issueSummary: string;
  /** Map of user ID to their duration for this issue */
  users: Record<number, TBusinessDurationData>;
  /** Total time spent on this issue by all users */
  total: TBusinessDurationData;
};

/**
 * Structured data for IssueSummaryTable
 */
export type TIssueSummaryData = {
  /** Array of issue summary rows */
  rows: TIssueSummaryRow[];
  /** Ordered list of user IDs included in the report */
  userIds: number[];
};

/**
 * Transforms tracks grouped by user into issue-summary grouped data
 * @param tracks - Array of tracks with user info
 * @param users - Array of user IDs to include in the report
 * @returns Structured data for IssueSummaryTable
 */
export const transformTracksByIssue = (
  tracks: TTransformedTracksByUser[],
  users: Array<{ uid: number; display?: string }>,
): TIssueSummaryData => {
  if (DEBUG) {
    console.warn('[transformTracksByIssue] START', {
      trackCount: tracks.length,
      userCount: users.length,
    });
  }

  const userIds = users.map((u) => u.uid);
  const issueMap: Record<string, TIssueSummaryRow> = {};

  for (const track of tracks) {
    if (!track.issueKey) {
      if (DEBUG) {
        console.warn('[transformTracksByIssue] Track missing issueKey', { trackId: track.id });
      }
      continue;
    }

    if (!issueMap[track.issueKey]) {
      issueMap[track.issueKey] = {
        issueKey: track.issueKey,
        issueSummary: track.issueSummary || '',
        users: {},
        total: { hours: 0, minutes: 0, seconds: 0 },
      };
    }

    const userMs = isoDurationToBusinessMs(track.duration);
    if (userMs === null) {
      if (DEBUG) {
        console.warn('[transformTracksByIssue] Invalid duration', {
          trackId: track.id,
          duration: track.duration,
        });
      }
      continue;
    }

    const currentUserMs = isoDurationToBusinessMs(
      businessDurationDataToIso(issueMap[track.issueKey].users[track.uid] ?? { hours: 0, minutes: 0, seconds: 0 }),
    );
    const newUserMs = (currentUserMs ?? 0) + userMs;
    issueMap[track.issueKey].users[track.uid] = msToBusinessDurationData(newUserMs);
  }

  const rows = Object.values(issueMap).map((row) => {
    let totalMs = 0;
    for (const userId of userIds) {
      const userData = row.users[userId];
      if (userData) {
        totalMs += isoDurationToBusinessMs(businessDurationDataToIso(userData)) ?? 0;
      }
    }
    return {
      ...row,
      total: msToBusinessDurationData(totalMs),
    };
  });

  rows.sort((a, b) => {
    const aMs = isoDurationToBusinessMs(businessDurationDataToIso(a.total)) ?? 0;
    const bMs = isoDurationToBusinessMs(businessDurationDataToIso(b.total)) ?? 0;
    return bMs - aMs;
  });

  if (DEBUG) {
    console.warn('[transformTracksByIssue] COMPLETE', {
      groupedIssueCount: rows.length,
      userIds,
    });
  }

  return {
    rows,
    userIds,
  };
};
