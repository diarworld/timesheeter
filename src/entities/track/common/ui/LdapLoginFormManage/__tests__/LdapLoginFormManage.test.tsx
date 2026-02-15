import { fireEvent, render, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { track } from 'entities/track/common/model/reducers';
import { LdapLoginFormManage } from 'entities/track/common/ui/LdapLoginFormManage';
import { EnvProvider } from 'shared/lib/EnvContext';
import { mockTracker } from '__mocks__/tracker';

// Mock the EWS API hook
const authenticateEwsMock = jest.fn(() => ({
  unwrap: () => Promise.resolve({ success: true }),
}));
jest.mock('entities/track/common/model/ews-api', () => ({
  useAuthenticateEwsMutation: () => [authenticateEwsMock, { isLoading: false }],
}));

// Mock the message hook
jest.mock('entities/locale/lib/hooks', () => ({
  useMessage: () => (key: string) => key,
}));

// Mock the env variables hook
jest.mock('shared/lib/useEnvVariables', () => ({
  useEnvVariables: () => ({
    envVariables: {
      RESTORE_PASSWORD_URL: 'https://example.com/restore',
    },
    loading: false,
    error: null,
  }),
}));

// Mock Ant Design App
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  App: {
    useApp: () => ({
      message: {
        success: jest.fn(),
        error: jest.fn(),
      },
    }),
  },
}));

// Mock useYandexUser
jest.mock('entities/user/yandex/hooks/use-yandex-user', () => ({
  useYandexUser: () => ({ self: { email: 'test@example.com' } }),
}));

// Mock useFilters
jest.mock('features/filters/lib/useFilters', () => ({
  useFilters: () => ({ userId: undefined, login: undefined }),
}));

// Mock js-cookie
jest.mock('js-cookie', () => ({
  get: jest.fn(() => JSON.stringify({ username: 'test@example.com' })),
  set: jest.fn(),
}));

// Mock encrypt
jest.mock('shared/lib/encrypt', () => ({
  encrypt: jest.fn(() => Promise.resolve('encrypted_token')),
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

const createTestStore = () =>
  configureStore({
    reducer: {
      [track.name]: track.reducer,
    },
  });

const renderWithProvider = (component: React.ReactElement) => {
  const store = createTestStore();
  return render(
    <Provider store={store}>
      <EnvProvider>{component}</EnvProvider>
    </Provider>,
  );
};

describe('LdapLoginFormManage', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue(JSON.stringify({ username: 'test@example.com' }));
    localStorageMock.setItem.mockClear();
  });

  it('should dispatch setHasLdapCredentials when authentication succeeds', async () => {
    const { getByLabelText, container } = renderWithProvider(<LdapLoginFormManage tracker={mockTracker} />);

    const passwordInput = getByLabelText('ldap.auth.password');
    fireEvent.change(passwordInput, { target: { value: 'testpassword' } });
    fireEvent.blur(passwordInput); // trigger validation

    // Find the form element and submit it
    const form = container.querySelector('form');
    if (form) {
      fireEvent.submit(form);
    } else {
      throw new Error('Form element not found');
    }

    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'ldapCredentials',
        JSON.stringify({
          username: 'test@example.com',
          token: 'testpassword',
          type: 'ldap',
        }),
      );
    });
  });
});
