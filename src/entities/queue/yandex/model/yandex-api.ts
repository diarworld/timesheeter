import { fetchAllPages, TFetchAllPagesBaseQueryResult } from 'shared/api';
import { api } from 'shared/api';
import { identity } from 'shared/lib/utils';
import { TGetQueuesParams, TQueue, TGetQueueParams } from 'entities/queue/common/model/types';
import { getTrackerHeaders } from 'entities/tracker/lib/getTrackerHeaders';
import { yandexQueueEndpoints } from 'entities/queue/yandex/model/endpoints';

export const yandexQueueApi = api.injectEndpoints({
  overrideExisting: true,
  endpoints: (build) => ({
    getQueues: build.query<TQueue[], TGetQueuesParams>({
      async queryFn({ tracker }, __, ___, fetchWithBQ) {
        const res = await fetchAllPages(
          (page) =>
            fetchWithBQ({
              url: yandexQueueEndpoints.queues,
              params: { page, perPage: 100 },
              headers: getTrackerHeaders(tracker),
            }) as TFetchAllPagesBaseQueryResult<TQueue[]>,
          identity,
        );
        return res;
      },
    }),
    getQueueByKeys: build.query<TQueue[], TGetQueueParams>({
      async queryFn({ keys, tracker }, __, ___, fetchWithBQ) {
        const results = await Promise.all(
          keys.map(async (key) => {
            const response = await fetchWithBQ({
              url: yandexQueueEndpoints.queue(key),
              headers: getTrackerHeaders(tracker),
            });
            return response.data as TQueue;
          })
        );
        console.log(results)
        return { data: results }
      },
    }),
  }),
});
