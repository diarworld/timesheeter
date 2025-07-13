export const AuthConfig = {
    appId: 'be87b37a-8f6c-4af9-8e41-67ab3240bbbe',
    tenantId: 'a1cebcab-e2ce-4650-bb9d-a0302e8cea76',
    cache: {
      cacheLocation: "localStorage",
    },
    appScopes: [
      'openid',
      'offline_access',
      'profile',
      'User.Read',
      'MailboxSettings.Read',
      'Calendars.ReadWrite'
    ]
  };