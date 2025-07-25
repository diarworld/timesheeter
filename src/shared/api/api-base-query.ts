import { fetchBaseQuery, retry, FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { SerializedError } from '@reduxjs/toolkit';
import { isQueryErrorStatusInSet } from 'shared/lib/isQueryErrorStatusInSet';

const RETRY_BLACKLIST = new Set([400, 401, 403, 404, 422]);
export const createApiBaseQuery = ({ baseUrl }: { baseUrl: string } = { baseUrl: '' }) =>
  retry(
    fetchBaseQuery({
      baseUrl,
      prepareHeaders: (headers) => {
        headers.set('Content-Type', 'application/json');
      },
    }),
    {
      retryCondition(error, _, { attempt }) {
        if (attempt > 3) {
          return false;
        }

        return !isQueryErrorStatusInSet(error as FetchBaseQueryError | SerializedError | undefined, RETRY_BLACKLIST);
      },
    },
  );
