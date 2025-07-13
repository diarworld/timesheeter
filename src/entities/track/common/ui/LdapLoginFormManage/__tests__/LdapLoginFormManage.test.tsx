import { fireEvent, render, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { track } from 'entities/track/common/model/reducers';
import { LdapLoginFormManage } from '../LdapLoginFormManage';

// Mock the EWS API hook
const authenticateEwsMock = jest.fn(() => ({
  unwrap: () => Promise.resolve({ success: true }),
}));
jest.mock('entities/track/common/model/ews-api', () => ({
  useAuthenticateEwsMutation: () => [
    authenticateEwsMock,
    { isLoading: false },
  ],
}));

// Mock the message hook
jest.mock('entities/locale/lib/hooks', () => ({
  useMessage: () => (key: string) => key,
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
  return render(<Provider store={store}>{component}</Provider>);
};

describe('LdapLoginFormManage', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue(
      JSON.stringify({ username: 'test@example.com' })
    );
    localStorageMock.setItem.mockClear();
  });

  it('should dispatch setHasLdapCredentials when authentication succeeds', async () => {
    const { getByText, getByLabelText, container } = renderWithProvider(<LdapLoginFormManage />);

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
