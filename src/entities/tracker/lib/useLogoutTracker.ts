import { TTrackerConfig } from 'entities/tracker/model/types';
import { useAppDispatch } from 'shared/lib/hooks';
import { useCallback } from 'react';
import { trackers } from 'entities/tracker/model/reducers';
import { useUserHasCreatedTrackers } from 'entities/tracker/lib/useUserHasCreatedTrackers';
import { CURRENT_ORG_ID_STORAGE_KEY } from 'entities/organization/model/constants';

export const useLogoutTracker = (tracker: TTrackerConfig) => {
  const hasCreatedTrackers = useUserHasCreatedTrackers();
  const dispatch = useAppDispatch();

  const logout = useCallback(() => {
    // Remove the cookie first, then reload.
    localStorage.removeItem(CURRENT_ORG_ID_STORAGE_KEY);
    fetch('/api/set-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clear: true }),
    }).then(() => {
      window.location.reload();
    });
  }, []);

  return logout;
};
