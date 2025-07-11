import { useRef, useEffect, useMemo } from 'react';
import { useAppDispatch } from 'shared/lib/hooks';
import { Loading } from 'shared/ui/Loading';
import { actionSetTrackerToken } from 'entities/tracker/model/actions';
import { getTrackerIdFromQuery } from 'entities/tracker/lib/getTrackerIdFromQuery';

export const AuthToken = () => {
  const dispatch = useAppDispatch();
  const hasRun = useRef(false);

  const token = useMemo(() => {
    const query = window.location.hash.split('#')[1];
    const parameters = new URLSearchParams(query);
    return parameters.get('access_token');
  }, []);

  useEffect(() => {
    if (!token || hasRun.current) return;
    hasRun.current = true;
    const parameters = new URLSearchParams(window.location.search);
    const pathToRedirect = parameters.get('redirect_path');
    parameters.delete('redirect_path');
    const trackerId = parameters.get('trackerId');

    fetch('/api/set-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then(() => {
        dispatch(actionSetTrackerToken(token, trackerId ? getTrackerIdFromQuery(trackerId) : undefined));
        const url = pathToRedirect
          ? `${pathToRedirect}${parameters.toString() ? `?${parameters.toString()}` : ''}`
          : '/';
        window.location.replace(url);
      })
      .catch((err) => {
        console.error('Failed to set token:', err);
      });
  }, [dispatch, token]);

  return <Loading isLoading />;
};
