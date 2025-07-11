import { useMessage } from 'entities/locale/lib/hooks';
import { isQueryErrorStatusInSet } from 'shared/lib/isQueryErrorStatusInSet';
import { UnauthorizedTracker } from 'entities/auth/ui/UnauthorizedTracker/UnauthorizedTracker';
import { getQueryErrorStatus } from 'shared/lib/getQueryErrorStatus';
import { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { SerializedError } from '@reduxjs/toolkit';
import { TTrackerConfig } from 'entities/tracker/model/types';

const unautharizedErrors = new Set([401, 403]);

export const useUnauthorizedTracker = (
  errorSelf: FetchBaseQueryError | SerializedError | undefined,
  tracker: TTrackerConfig,
  logout?: () => void,
  _resetMainTracker: boolean = false,
) => {
  const message = useMessage();

  const status = getQueryErrorStatus(errorSelf);
  let errorMessage;
  if (status === 401) {
    errorMessage = message('unauthorizedTracker.error.401');
  } else if (status === 403) {
    errorMessage = message('unauthorizedTracker.error.403');
  } else if (status === 404) {
    errorMessage = message('unauthorizedTracker.error.404');
  } else {
    errorMessage = message('unauthorizedTracker.noAccess.message');
  }

  if (isQueryErrorStatusInSet(errorSelf, unautharizedErrors)) {
    return <UnauthorizedTracker errorMessage={errorMessage} logout={logout} />;
  }

  return undefined;
};
