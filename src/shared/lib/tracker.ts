// OpenReplay tracker utility with React 19 compatibility

interface ITracker {
  setUserID: (userId: string) => void;
  use: (plugin: unknown) => void;
  start: () => void;
}

let trackerInstance: ITracker | null = null;
let initializationPromise: Promise<ITracker | null> | null = null;
let hasInitializationFailed = false;

export const initializeTracker = async (envVariables?: {
  COMPANY_OPENREPLAY_KEY?: string;
  COMPANY_OPENREPLAY_URL?: string;
}) => {
  // Only initialize in production or if explicitly enabled
  const shouldInitialize = process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_ENABLE_TRACKER === 'true';

  if (!shouldInitialize || typeof window === 'undefined') {
    return null;
  }

  // If already initialized, return the instance
  if (trackerInstance) {
    return trackerInstance;
  }

  // If initialization has previously failed, don't retry
  if (hasInitializationFailed) {
    return null;
  }

  // If initialization is in progress, wait for it to complete
  if (initializationPromise) {
    return initializationPromise;
  }

  // Start initialization process
  initializationPromise = (async () => {
    try {
      let tracker: ITracker;
      let trackerAssist: () => unknown;

      // Dynamic imports to prevent webpack from processing in development
      const { default: TrackerModule } = await import('@openreplay/tracker');
      const { default: trackerAssistModule } = await import('@openreplay/tracker-assist');

      // Get environment variables from parameters or fetch from API
      let projectKey: string | undefined;
      let ingestPoint: string | undefined;

      if (envVariables) {
        // Use provided environment variables
        projectKey = envVariables.COMPANY_OPENREPLAY_KEY;
        ingestPoint = envVariables.COMPANY_OPENREPLAY_URL;
      } else {
        // Fallback: fetch from API (for backward compatibility)
        try {
          const response = await fetch('/api/get-env');
          if (response.ok) {
            const data = await response.json();
            projectKey = data.variables.COMPANY_OPENREPLAY_KEY;
            ingestPoint = data.variables.COMPANY_OPENREPLAY_URL;
          }
        } catch (error) {
          console.error('Failed to fetch environment variables for tracker:', error);
        }
      }

      if (!projectKey || !ingestPoint) {
        console.warn('OpenReplay configuration missing');
        hasInitializationFailed = true;
        return null;
      }

      tracker = new TrackerModule({
        projectKey,
        ingestPoint,
        __DISABLE_SECURE_MODE: process.env.NODE_ENV === 'development',
      }) as ITracker;
      trackerAssist = trackerAssistModule;

      if (tracker && trackerAssist) {
        tracker.use(trackerAssist());
        tracker.start();

        trackerInstance = tracker;
        return tracker;
      }
    } catch (error) {
      console.warn('OpenReplay tracker initialization failed:', error);
      hasInitializationFailed = true;
    } finally {
      // Clear the promise so future calls can retry if needed
      initializationPromise = null;
    }

    return null;
  })();

  return initializationPromise;
};

export const getTracker = () => trackerInstance;

export const setUserID = (userId: string) => {
  if (trackerInstance && typeof trackerInstance.setUserID === 'function') {
    trackerInstance.setUserID(userId);
  }
};
