import getConfig from 'next/config';

/**
 * Get runtime configuration with fallback to process.env
 * This ensures we can access environment variables at runtime in production
 */
export const getRuntimeConfig = () => {
  // In production with standalone output, process.env is available at runtime
  if (process.env.NODE_ENV === 'production') {
    return {
      // OpenReplay configuration
      COMPANY_OPENREPLAY_KEY: process.env.COMPANY_OPENREPLAY_KEY,
      COMPANY_OPENREPLAY_URL: process.env.COMPANY_OPENREPLAY_URL,
      
      // External service URLs
      COMPANY_POWERBI_URL: process.env.COMPANY_POWERBI_URL,
      SUPPORT_URL: process.env.SUPPORT_URL,
      RESTORE_PASSWORD_URL: process.env.RESTORE_PASSWORD_URL,
    };
  }
  
  // In development, try Next.js runtime config first, then fallback to process.env
  const { publicRuntimeConfig } = getConfig() || {};
  
  return {
    // OpenReplay configuration
    COMPANY_OPENREPLAY_KEY: publicRuntimeConfig?.COMPANY_OPENREPLAY_KEY || process.env.COMPANY_OPENREPLAY_KEY,
    COMPANY_OPENREPLAY_URL: publicRuntimeConfig?.COMPANY_OPENREPLAY_URL || process.env.COMPANY_OPENREPLAY_URL,
    
    // External service URLs
    COMPANY_POWERBI_URL: publicRuntimeConfig?.COMPANY_POWERBI_URL || process.env.COMPANY_POWERBI_URL,
    SUPPORT_URL: publicRuntimeConfig?.SUPPORT_URL || process.env.SUPPORT_URL,
    RESTORE_PASSWORD_URL: publicRuntimeConfig?.RESTORE_PASSWORD_URL || process.env.RESTORE_PASSWORD_URL,
  };
}; 