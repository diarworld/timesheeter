import { useRouter } from 'next/router';
import { useEffect } from 'react';
import dayjs from 'dayjs';

export const PeriodInitializer: React.FC<{ defaultPeriod?: 'week' | 'month' }> = ({ defaultPeriod = 'week' }) => {
  const router = useRouter();

  useEffect(() => {
    const { from, to } = router.query;
    if (!from || !to) {
      const now = dayjs();
      const start = now.startOf(defaultPeriod).format('YYYY-MM-DD');
      const end = now.endOf(defaultPeriod).format('YYYY-MM-DD');
      router.replace({
        query: {
          ...router.query,
          from: start,
          to: end,
        },
      });
    }
    // Only run on mount
    // eslint-disable-next-line
  }, []);

  return null;
};
