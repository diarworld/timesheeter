import { useCallback } from 'react';
import { useAppDispatch } from 'shared/lib/hooks';
import { track } from 'entities/track/common/model/reducers';

export const useLdapLoginAction = () => {
  const dispatch = useAppDispatch();

  return useCallback(
    () => {
      dispatch(
        track.actions.setLdapLoginCreate({
        }),
      );
    },
    [dispatch],
  );
};
