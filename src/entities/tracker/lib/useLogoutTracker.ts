import { TTrackerConfig } from 'entities/tracker/model/types';
import { useCallback } from 'react';
import { trackers as _trackers } from 'entities/tracker/model/reducers';
import { CURRENT_ORG_ID_STORAGE_KEY } from 'entities/organization/model/constants';

export const useLogoutTracker = (_tracker: TTrackerConfig) => {
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
