import React, { FC, useEffect, useState } from 'react';
import { Providers } from '@microsoft/mgt-element';
import { Msal2Provider } from '@microsoft/mgt-msal2-provider';
import { Button, Spin } from 'antd';
import { AuthConfig } from './AuthConfig';

// Helper to check for access token cookie
function getAccessTokenCookie() {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|; )access_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export const LdapLoginFormManage: FC = () => {
  const [hasToken, setHasToken] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for access token cookie
    setHasToken(!!getAccessTokenCookie());
    setLoading(false);
  }, []);

  useEffect(() => {
    // Initialize MSAL2 provider for MGT
    Providers.globalProvider = new Msal2Provider({
      clientId: AuthConfig.appId,
      authority: `https://login.microsoftonline.com/${AuthConfig.tenantId}`,
      scopes: AuthConfig.appScopes,
      redirectUri: `${window.location.origin}/token`,
    });
  }, []);

  const handleMicrosoftLogin = () => {
    // Use MGT provider to sign in, if available
    if (Providers.globalProvider && typeof Providers.globalProvider.login === 'function') {
      Providers.globalProvider.login();
    } else {
      console.error('Microsoft provider is not initialized.');
    }
  };

  if (loading) return <Spin />;
  if (hasToken) return <div>Microsoft account connected.</div>;

  return (
    <Button type="primary" onClick={handleMicrosoftLogin}>
      Sign in with Microsoft
    </Button>
  );
};