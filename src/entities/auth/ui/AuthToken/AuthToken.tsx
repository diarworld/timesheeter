import { useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAppDispatch } from 'shared/lib/hooks';
import { Loading } from 'shared/ui/Loading';
import { actionSetTrackerToken } from 'entities/tracker/model/actions';
import { getTrackerIdFromQuery } from 'entities/tracker/lib/getTrackerIdFromQuery';

export const AuthToken = () => {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const hasRun = useRef(false);

  const { token, type } = useMemo(() => {
    const query = window.location.hash.split('#')[1];
    const parameters = new URLSearchParams(query);
    if (parameters.get('access_token')) {
      return { token: parameters.get('access_token'), type: 'yandex' };
    } else if (parameters.get('code')) {
      return { token: parameters.get('code'), type: 'microsoft' };
    }
    return { token: null, type: null };
  }, []);

  useEffect(() => {
    if (type === 'microsoft' && token) {
      fetch('/api/ews/token-exchange', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: token,
          redirectUri: `${window.location.origin}/token`, // or your actual redirect URI
        }),
      })
        .then(res => res.json())
        .then(() => {
          // Optionally clear the hash
          window.location.hash = '';
          // Redirect or update UI
          router.replace('/');
        });
    }
    if (!token || hasRun.current) return;
    hasRun.current = true;
    const parameters = new URLSearchParams(window.location.search);
    const pathToRedirect = parameters.get('redirect_path');
    parameters.delete('redirect_path');
    const trackerId = parameters.get('trackerId');

    if (token && type) {
      fetch('/api/set-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, type }),
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
    }
  }, [token, type, router, dispatch]);

  return <Loading isLoading />;
};
