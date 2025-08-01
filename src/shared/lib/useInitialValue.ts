import { useMemo } from 'react';

// !!eslint is disabled on purpose!!

export const useInitialValue = <T>(initialValue: T) => useMemo(() => initialValue, []);
