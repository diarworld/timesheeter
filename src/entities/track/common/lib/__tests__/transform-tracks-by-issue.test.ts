import { TTransformedTracksByUser } from 'entities/track/common/model/types';
import { transformTracksByIssue } from 'entities/track/common/lib/transform-tracks-by-issue';

const mockTracks: TTransformedTracksByUser[] = [
  {
    id: 1,
    issueKey: 'TEST-1',
    comment: 'Work on feature',
    start: '2026-02-17T10:00:00.000+03:00',
    duration: 'PT2H',
    uid: 100,
    display: 'User One',
  },
  {
    id: 2,
    issueKey: 'TEST-1',
    comment: 'More work',
    start: '2026-02-17T14:00:00.000+03:00',
    duration: 'PT1H',
    uid: 100,
    display: 'User One',
  },
  {
    id: 3,
    issueKey: 'TEST-1',
    comment: 'Bug fix',
    start: '2026-02-17T10:00:00.000+03:00',
    duration: 'PT3H',
    uid: 200,
    display: 'User Two',
  },
  {
    id: 4,
    issueKey: 'TEST-2',
    comment: 'Another task',
    start: '2026-02-17T10:00:00.000+03:00',
    duration: 'PT4H',
    uid: 100,
    display: 'User One',
  },
  {
    id: 5,
    issueKey: 'TEST-2',
    comment: 'Code review',
    start: '2026-02-17T10:00:00.000+03:00',
    duration: 'PT1H',
    uid: 300,
    display: 'User Three',
  },
];

const mockUsers = [
  { uid: 100, display: 'User One' },
  { uid: 200, display: 'User Two' },
  { uid: 300, display: 'User Three' },
];

describe('transformTracksByIssue', () => {
  it('groups tracks by issue key', () => {
    const result = transformTracksByIssue(mockTracks, mockUsers);

    expect(result.rows).toHaveLength(2);
    expect(result.rows.map((r) => r.issueKey).sort()).toEqual(['TEST-1', 'TEST-2']);
  });

  it('calculates duration per user per issue', () => {
    const result = transformTracksByIssue(mockTracks, mockUsers);

    const test1Row = result.rows.find((r) => r.issueKey === 'TEST-1');
    expect(test1Row?.users[100]?.hours).toBe(3); // 2h + 1h
    expect(test1Row?.users[200]?.hours).toBe(3); // 3h
    expect(test1Row?.users[300]).toBeUndefined(); // no work on TEST-1, so no entry
  });

  it('calculates total per issue', () => {
    const result = transformTracksByIssue(mockTracks, mockUsers);

    const test1Row = result.rows.find((r) => r.issueKey === 'TEST-1');
    expect(test1Row?.total.hours).toBe(6); // 2h + 1h + 3h

    const test2Row = result.rows.find((r) => r.issueKey === 'TEST-2');
    expect(test2Row?.total.hours).toBe(5); // 4h + 1h
  });

  it('returns user IDs in order', () => {
    const result = transformTracksByIssue(mockTracks, mockUsers);

    expect(result.userIds).toEqual([100, 200, 300]);
  });

  it('handles empty tracks array', () => {
    const result = transformTracksByIssue([], mockUsers);

    expect(result.rows).toHaveLength(0);
    expect(result.userIds).toEqual([100, 200, 300]);
  });

  it('handles tracks with missing issue key', () => {
    const tracksWithMissingKey: TTransformedTracksByUser[] = [
      {
        id: 1,
        issueKey: '',
        comment: 'No issue',
        start: '2026-02-17T10:00:00.000+03:00',
        duration: 'PT1H',
        uid: 100,
        display: 'User One',
      },
    ];

    const result = transformTracksByIssue(tracksWithMissingKey, mockUsers);

    expect(result.rows).toHaveLength(0);
  });

  it('handles tracks with invalid duration', () => {
    const tracksWithInvalidDuration: TTransformedTracksByUser[] = [
      {
        id: 1,
        issueKey: 'TEST-1',
        comment: 'Invalid',
        start: '2026-02-17T10:00:00.000+03:00',
        duration: 'INVALID' as never,
        uid: 100,
        display: 'User One',
      },
    ];

    const result = transformTracksByIssue(tracksWithInvalidDuration, mockUsers);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].users[100]).toBeUndefined(); // invalid duration skipped, no entry
  });

  it('sorts rows by total duration descending', () => {
    const result = transformTracksByIssue(mockTracks, mockUsers);

    // TEST-1 has 6h, TEST-2 has 5h
    expect(result.rows[0].issueKey).toBe('TEST-1');
    expect(result.rows[1].issueKey).toBe('TEST-2');
  });
});
