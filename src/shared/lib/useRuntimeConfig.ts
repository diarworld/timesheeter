import { getRuntimeConfig } from './getRuntimeConfig';

/**
 * Custom hook to access Next.js runtime configuration
 * This allows environment variables to be set at runtime in production containers
 */
export const useRuntimeConfig = () => {
  const config = getRuntimeConfig();

  return {
    // OpenReplay configuration
    openReplayKey: config.COMPANY_OPENREPLAY_KEY,
    openReplayUrl: config.COMPANY_OPENREPLAY_URL,

    // External service URLs
    powerBiUrl: config.COMPANY_POWERBI_URL,
    supportUrl: config.SUPPORT_URL,
    restorePasswordUrl: config.RESTORE_PASSWORD_URL,
  };
};
