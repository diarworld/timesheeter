import { FC, useEffect } from 'react';
import { useMainTracker } from 'entities/tracker/lib/useMainTracker';
import { TrackerWorklog } from 'entities/tracker/ui/common/TrackerWorklog/TrackerWorklog';
import { useUserHasCreatedTrackers } from 'entities/tracker/lib/useUserHasCreatedTrackers';
import { useAppDispatch } from 'shared/lib/hooks';
import { actionSetTrackerToken } from 'entities/tracker/model/actions';
import { PublicClientApplication, EventType } from '@azure/msal-browser';
import { msalConfig } from 'entities/track/common/ui/LdapLoginFormManage/authConfig';
import { MsalProvider } from '@azure/msal-react';

const msalInstance = new PublicClientApplication(msalConfig);

// Default to using the first account if no account is active on page load
if (!msalInstance.getActiveAccount() && msalInstance.getAllAccounts().length > 0) {
  // Account selection logic is app dependent. Adjust as needed for different use cases.
  msalInstance.setActiveAccount(msalInstance.getAllAccounts()[0]);
}

// Listen for sign-in event and set active account
msalInstance.addEventCallback((event) => {
  if (
    event.eventType === EventType.LOGIN_SUCCESS &&
    event.payload &&
    (event.payload as any).account
  ) {
    const account = (event.payload as any).account;
    msalInstance.setActiveAccount(account);
  }
});

export const IndexPage: FC<{ accessToken?: string }> = ({ accessToken }) => {
  const tracker = useMainTracker();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (accessToken && tracker?.id) {
      dispatch(actionSetTrackerToken(accessToken, tracker.id));
    }
  }, [accessToken, tracker?.id, dispatch]);

  // assume that if user created new trackers, we don't need to appear as old UX.
  const unauthorizedErrorShouldAppearAsOrgChange = !useUserHasCreatedTrackers();

  return (
    <MsalProvider instance={msalInstance}>
      <TrackerWorklog
        tracker={tracker}
        unauthorizedErrorShouldAppearAsOrgChange={unauthorizedErrorShouldAppearAsOrgChange}
      />
    </MsalProvider>
  );
};
