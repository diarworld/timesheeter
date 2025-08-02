import { useState, useEffect } from 'react';
import { IEnvVariables } from './types';

/**
 * Custom hook to fetch environment variables from API
 * Works in both production and development
 */
export const useEnvVariables = () => {
  const [envVariables, setEnvVariables] = useState<IEnvVariables | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch('/api/get-env')
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        setEnvVariables(data.variables);
        setError(null);
      })
      .catch((err) => {
        console.error('Failed to fetch environment variables:', err);
        setError(err.message);
        setEnvVariables(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return { envVariables, loading, error };
};
