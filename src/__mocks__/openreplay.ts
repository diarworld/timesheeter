// Mock OpenReplay modules for development
export const mockTracker = {
  setUserID: () => {},
  start: () => {},
  use: () => {},
};

export const mockTrackerAssist = () => ({});

// Default exports for dynamic imports
export default mockTracker;
