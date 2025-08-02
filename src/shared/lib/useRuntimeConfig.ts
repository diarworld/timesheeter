import { useEnvContext } from './EnvContext';

/**
 * Custom hook to access runtime configuration
 * Uses shared environment variables from EnvContext to prevent duplicate API calls
 */
export const useRuntimeConfig = () => {
  return useEnvContext();
};
