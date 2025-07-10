import { FC, useEffect } from 'react';
import { useMainTracker } from 'entities/tracker/lib/useMainTracker';
import { TrackerWorklog } from 'entities/tracker/ui/common/TrackerWorklog/TrackerWorklog';
import { useUserHasCreatedTrackers } from 'entities/tracker/lib/useUserHasCreatedTrackers';
import { useAppDispatch } from 'shared/lib/hooks';
import { actionSetTrackerToken } from 'entities/tracker/model/actions';

export const IndexPage: FC<{ accessToken?: string }> = ({ accessToken }) => {
  const tracker = useMainTracker();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (accessToken && tracker?.id) {
      dispatch(actionSetTrackerToken(accessToken, tracker.id));
    }
  }, [accessToken, tracker?.id, dispatch]);

  // assume that if user created new trackers, we don't need to appear as old UX.
  const unauthorizedErrorShouldAppearAsOrgChange = !useUserHasCreatedTrackers();

  return (
    <TrackerWorklog
      tracker={tracker}
      unauthorizedErrorShouldAppearAsOrgChange={unauthorizedErrorShouldAppearAsOrgChange}
    />
  );
};
