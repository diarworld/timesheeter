import getConfig from 'next/config';

/**
 * Custom hook to access Next.js runtime configuration
 * This allows environment variables to be set at runtime in production containers
 */
export const useRuntimeConfig = () => {
  const { publicRuntimeConfig } = getConfig() || {};
  
  return {
    // OpenReplay configuration
    openReplayKey: publicRuntimeConfig?.COMPANY_OPENREPLAY_KEY,
    openReplayUrl: publicRuntimeConfig?.COMPANY_OPENREPLAY_URL,
    
    // External service URLs
    powerBiUrl: publicRuntimeConfig?.COMPANY_POWERBI_URL,
    supportUrl: publicRuntimeConfig?.SUPPORT_URL,
    restorePasswordUrl: publicRuntimeConfig?.RESTORE_PASSWORD_URL,
  };
}; 