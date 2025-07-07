import { YANDEX_TRACKER_API_ROOT } from 'shared/api/constants';

export const yandexQueueEndpoints = {
  queues: `${YANDEX_TRACKER_API_ROOT}/queues`,
  queue: (key: string) => `${YANDEX_TRACKER_API_ROOT}/queues/${key}?expand=team`,
};
