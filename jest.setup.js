require('@testing-library/jest-dom');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');

dayjs.extend(utc);

// Mock window.getComputedStyle to fix JSDOM errors
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    getPropertyValue: () => '',
  }),
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: jest.fn(),
});

// Mock fetch for SSR environments
global.fetch = jest.fn();

// Suppress console warnings for known JSDOM limitations
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Not implemented: window.getComputedStyle') ||
       args[0].includes('In HTML, <tfoot> cannot be a child of <div>') ||
       args[0].includes('validateDOMNesting') ||
       args[0].includes('This will cause a hydration error'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Mock window.matchMedia for Ant Design responsive components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// make sure all tests consistently run in the same time offset in all environments
jest.mock('dayjs', () => {
  const UTC_DEFAULT_OFFSET_HOURS = 3;
  let UTC_OFFSET_HOURS = UTC_DEFAULT_OFFSET_HOURS;

  // for some tests we need to change timezone
  const SET_TEST_UTC_OFFSET_HOURS_PROP_NAME = '__SET_TEST_UTC_OFFSET_HOURS__';
  const RESET_UTC_OFFSET_HOURS_PROP_NAME = '__RESET_DEFAULT_TEST_UTC_OFFSET_HOURS__';

  const setOffset = (hours) => {
    UTC_OFFSET_HOURS = hours;
  };
  const resetOffset = () => {
    UTC_OFFSET_HOURS = UTC_DEFAULT_OFFSET_HOURS;
  };

  const handler = {
    apply(target, _, argumentsList) {
      return target(...argumentsList).utcOffset(UTC_OFFSET_HOURS);
    },
    get(obj, prop, receiver) {
      if (prop === SET_TEST_UTC_OFFSET_HOURS_PROP_NAME) {
        return setOffset;
      }
      if (prop === RESET_UTC_OFFSET_HOURS_PROP_NAME) {
        return resetOffset;
      }
      return Reflect.get(obj, prop, receiver);
    },
  };

  return new Proxy(jest.requireActual('dayjs'), handler);
});
