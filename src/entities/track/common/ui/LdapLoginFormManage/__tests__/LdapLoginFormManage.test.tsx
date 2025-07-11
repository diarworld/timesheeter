import { fireEvent, render, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { track } from 'entities/track/common/model/reducers';
import { LdapLoginFormManage } from '../LdapLoginFormManage';

// Mock the EWS API hook
jest.mock('entities/track/common/model/ews-api', () => ({
  useAuthenticateEwsMutation: () => [
    jest.fn().mockResolvedValue({
      unwrap: () => Promise.resolve({ success: true }),
    }),
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
    localStorageMock.getItem.mockReturnValue('{}');
    localStorageMock.setItem.mockClear();
  });

  it('should dispatch setHasLdapCredentials when authentication succeeds', async () => {
    const { getByText, getByLabelText } = renderWithProvider(<LdapLoginFormManage />);

    const passwordInput = getByLabelText('ldap.auth.password');
    const submitButton = getByText('share.save.action');

    fireEvent.change(passwordInput, { target: { value: 'testpassword' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'ldapCredentials',
        JSON.stringify({
          username: '',
          token: 'testpassword',
          type: 'ldap',
        }),
      );
    });
  });
});
