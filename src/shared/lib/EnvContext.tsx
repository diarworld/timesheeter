import React, { createContext, useContext, ReactNode } from 'react';
import { useEnvVariables } from './useEnvVariables';
import { IEnvContextType } from './types';

const EnvContext = createContext<IEnvContextType | undefined>(undefined);

interface IEnvProviderProps {
  children: ReactNode;
}

export const EnvProvider: React.FC<IEnvProviderProps> = ({ children }) => {
  const { envVariables, loading, error } = useEnvVariables();

  const value: IEnvContextType = {
    envVariables,
    loading,
    error,
    // Individual properties for convenience
    openReplayKey: envVariables?.COMPANY_OPENREPLAY_KEY,
    openReplayUrl: envVariables?.COMPANY_OPENREPLAY_URL,
    powerBiUrl: envVariables?.COMPANY_POWERBI_URL,
    supportUrl: envVariables?.SUPPORT_URL,
    restorePasswordUrl: envVariables?.RESTORE_PASSWORD_URL,
  };

  return <EnvContext.Provider value={value}>{children}</EnvContext.Provider>;
};

export const useEnvContext = (): IEnvContextType => {
  const context = useContext(EnvContext);
  if (context === undefined) {
    throw new Error('useEnvContext must be used within an EnvProvider');
  }
  return context;
};
