// OpenReplay tracker utility with React 19 compatibility
interface ITracker {
  setUserID: (userId: string) => void;
  use: (plugin: unknown) => void;
  start: () => void;
}

let trackerInstance: ITracker | null = null;

export const initializeTracker = async () => {
  // Only initialize in production or if explicitly enabled
  const shouldInitialize = process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_ENABLE_TRACKER === 'true';

  if (!shouldInitialize || typeof window === 'undefined') {
    return null;
  }

  if (trackerInstance) {
    return trackerInstance;
  }

  try {
    let tracker: ITracker;
    let trackerAssist: () => unknown;

    if (process.env.NODE_ENV === 'development') {
      // Use mocks in development
      const { mockTracker, mockTrackerAssist } = await import('../../__mocks__/openreplay');
      tracker = mockTracker as ITracker;
      trackerAssist = mockTrackerAssist;
    } else {
      // Dynamic imports to prevent webpack from processing in development
      const { default: TrackerModule } = await import('@openreplay/tracker');
      const { default: trackerAssistModule } = await import('@openreplay/tracker-assist');

      const projectKey = process.env.COMPANY_OPENREPLAY_KEY;
      const ingestPoint = process.env.COMPANY_OPENREPLAY_URL;

      if (!projectKey || !ingestPoint) {
        console.warn('OpenReplay configuration missing');
        return null;
      }

      tracker = new TrackerModule({
        projectKey,
        ingestPoint,
      }) as ITracker;
      trackerAssist = trackerAssistModule;
    }

    if (tracker && trackerAssist) {
      tracker.use(trackerAssist());
      tracker.start();

      trackerInstance = tracker;
      return tracker;
    }
  } catch (error) {
    console.warn('OpenReplay tracker initialization failed:', error);
  }

  return null;
};

export const getTracker = () => trackerInstance;

export const setUserID = (userId: string) => {
  if (trackerInstance && typeof trackerInstance.setUserID === 'function') {
    trackerInstance.setUserID(userId);
  }
};
