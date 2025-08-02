import getConfig from 'next/config';

/**
 * Get runtime configuration with fallback to process.env
 * This ensures we can access environment variables at runtime in production
 */
export const getRuntimeConfig = () => {
  const { publicRuntimeConfig } = getConfig() || {};

  return {
    // OpenReplay configuration
    COMPANY_OPENREPLAY_KEY:
      publicRuntimeConfig?.NEXT_PUBLIC_COMPANY_OPENREPLAY_KEY || process.env.NEXT_PUBLIC_COMPANY_OPENREPLAY_KEY,
    COMPANY_OPENREPLAY_URL:
      publicRuntimeConfig?.NEXT_PUBLIC_COMPANY_OPENREPLAY_URL || process.env.NEXT_PUBLIC_COMPANY_OPENREPLAY_URL,

    // External service URLs
    COMPANY_POWERBI_URL: publicRuntimeConfig?.NEXT_PUBLIC_COMPANY_POWERBI_URL || process.env.NEXT_PUBLIC_COMPANY_POWERBI_URL,
    SUPPORT_URL: publicRuntimeConfig?.NEXT_PUBLIC_SUPPORT_URL || process.env.NEXT_PUBLIC_SUPPORT_URL,
    RESTORE_PASSWORD_URL: publicRuntimeConfig?.NEXT_PUBLIC_RESTORE_PASSWORD_URL || process.env.NEXT_PUBLIC_RESTORE_PASSWORD_URL,
  };
};
