import { useRouter } from 'next/router';
import { useMemo } from 'react';

export const useQueueFilter = () => {
  const router = useRouter();

  const queueQuery = router.query.queue;

  const queue = useMemo(() => (Array.isArray(queueQuery) ? queueQuery : [queueQuery].filter(Boolean)), [queueQuery]);

  return queue as string[];
};
