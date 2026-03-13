import { startTransition, useCallback, useEffect, useRef, useState } from 'react';

/**
 * like useState(), but calls to setState() are debounced
 * @param initialValue
 * @param delay
 */
export const useDebouncedState = <T>(initialValue: T, delay: number = 500) => {
  const [value, setValue] = useState(initialValue);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const timeoutRef = useRef<number | undefined>(undefined);

  // Clean up pending timeout on unmount to prevent stale state updates
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const seValueDebounced = useCallback(
    (nextValue: T) => {
      startTransition(() => {
        setIsDebouncing(true);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        startTransition(() => {
          setValue(nextValue);
          setIsDebouncing(false);
        });
      }, delay);
    },
    [delay],
  );

  return [value, seValueDebounced, isDebouncing] as const;
};
