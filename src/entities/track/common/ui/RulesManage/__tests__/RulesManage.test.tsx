import { fireEvent, render, waitFor, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { track } from 'entities/track/common/model/reducers';
import { RulesManage } from 'entities/track/common/ui/RulesManage';
import { api } from 'shared/api/api';
import { mockTracker } from '__mocks__/tracker';

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    query: {},
    push: jest.fn(),
    replace: jest.fn(),
    pathname: '/',
    asPath: '/',
  }),
}));

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

// Mock the Yandex user API
jest.mock('entities/user/yandex/model/yandex-api', () => ({
  yandexUserApi: {
    useGetMyselfYandexQuery: () => ({
      data: {
        uid: 'mock-user-id',
        email: 'mock@example.com',
        display: 'Mock User',
      },
      isLoading: false,
      error: null,
    }),
    useGetYandexUserByIdQuery: () => ({
      data: null,
      isLoading: false,
      error: null,
    }),
    useGetYandexUserByLoginQuery: () => ({
      data: null,
      isLoading: false,
      error: null,
    }),
  },
}));

// Mock the Yandex issue API
jest.mock('entities/issue/yandex/model/yandex-api', () => ({
  yandexIssueApi: {
    useGetYandexIssuesQuery: () => ({
      currentData: [],
      isFetching: false,
      error: null,
    }),
    useGetYandexIssueQuery: () => ({
      currentData: null,
      isFetching: false,
      error: null,
    }),
  },
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

// Mock fetch to silence SSR warning
beforeAll(() => {
  global.fetch = jest.fn(() =>
    Promise.resolve({ json: () => Promise.resolve({}) } as unknown as Response),
  ) as typeof fetch;
});

const createTestStore = () =>
  configureStore({
    reducer: {
      [track.name]: track.reducer,
      [api.reducerPath]: api.reducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(api.middleware),
  });

const renderWithProvider = (component: React.ReactElement) => {
  const store = createTestStore();
  return render(<Provider store={store}>{component}</Provider>);
};

describe('RulesManage', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue('{}');
    localStorageMock.setItem.mockClear();
  });

  it('should render the component without crashing', () => {
    const { container } = renderWithProvider(<RulesManage tracker={mockTracker} isDarkMode={false} />);

    expect(container).toBeInTheDocument();
  });

  it('should load default rules when localStorage is empty', async () => {
    // Mock empty localStorage
    localStorageMock.getItem.mockReturnValue(null);

    const { getByText } = renderWithProvider(<RulesManage tracker={mockTracker} isDarkMode={false} />);

    // Wait for default rules to be loaded
    await waitFor(() => {
      expect(getByText('Отпуск')).toBeInTheDocument();
      expect(getByText('Обучение')).toBeInTheDocument();
    });

    // Verify that default rules were saved to localStorage
    expect(localStorageMock.setItem).toHaveBeenCalledWith('timesheeterRules', expect.stringContaining('Отпуск'));
  });

  it('should delete a default rule', async () => {
    // Mock empty localStorage to trigger default rules
    localStorageMock.getItem.mockReturnValue(null);

    const { getByText } = renderWithProvider(<RulesManage tracker={mockTracker} isDarkMode={false} />);

    // Wait for default rules to be loaded
    await waitFor(() => {
      expect(getByText('Отпуск')).toBeInTheDocument();
    });

    // Click on the rule name to expand the collapse
    fireEvent.click(getByText('Отпуск'));

    // Wait for the collapse to expand and buttons to be visible
    await waitFor(() => {
      const deleteButtons = document.querySelectorAll('button[class*="ant-btn-danger"]');
      expect(deleteButtons.length).toBeGreaterThan(0);
    });

    // Find and click the delete button for the first rule
    const deleteButtons = document.querySelectorAll('button[class*="ant-btn-danger"]');
    const deleteButton = deleteButtons[0];

    expect(deleteButton).toBeInTheDocument();

    fireEvent.click(deleteButton);

    // Verify that localStorage was updated (the rule was deleted)
    expect(localStorageMock.setItem).toHaveBeenCalled();
  });

  it('should edit a default rule', async () => {
    // Mock empty localStorage to trigger default rules
    localStorageMock.getItem.mockReturnValue(null);

    const { getByText, getByPlaceholderText } = renderWithProvider(
      <RulesManage tracker={mockTracker} isDarkMode={false} />,
    );

    // Wait for default rules to be loaded
    await waitFor(() => {
      expect(getByText('Отпуск')).toBeInTheDocument();
    });

    // Click on the rule name to expand the collapse
    fireEvent.click(getByText('Отпуск'));

    // Wait for the collapse to expand and buttons to be visible
    await waitFor(() => {
      const allButtons = document.querySelectorAll('button');
      const editButton = Array.from(allButtons).find(
        (button) => button.textContent?.includes('rules.rule.edit') && !button.className.includes('ant-btn-danger'),
      );
      expect(editButton).toBeInTheDocument();
    });

    // Find and click the edit button for the first rule (not the delete button)
    const allButtons = document.querySelectorAll('button');
    const editButton = Array.from(allButtons).find(
      (button) => button.textContent?.includes('rules.rule.edit') && !button.className.includes('ant-btn-danger'),
    );

    expect(editButton).toBeInTheDocument();

    fireEvent.click(editButton!);

    // Verify the form is populated with the rule data
    await waitFor(() => {
      const nameInput = getByPlaceholderText('rules.rule.name') as HTMLInputElement;
      expect(nameInput.value).toBe('Отпуск');
    });

    // Change the rule name
    fireEvent.change(getByPlaceholderText('rules.rule.name'), { target: { value: 'Updated Vacation Rule' } });

    // Save the updated rule
    fireEvent.click(getByText('rules.rule.save'));

    // Verify the updated rule was saved to localStorage
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'timesheeterRules',
        expect.stringContaining('Updated Vacation Rule'),
      );
    });
  });

  it('should cancel editing a rule', async () => {
    // Mock empty localStorage to trigger default rules
    localStorageMock.getItem.mockReturnValue(null);

    const { getByText, getByPlaceholderText } = renderWithProvider(
      <RulesManage tracker={mockTracker} isDarkMode={false} />,
    );

    // Wait for default rules to be loaded
    await waitFor(() => {
      expect(getByText('Отпуск')).toBeInTheDocument();
    });

    // Click on the rule name to expand the collapse
    await act(async () => {
      fireEvent.click(getByText('Отпуск'));
    });

    // Wait for the collapse to expand and buttons to be visible
    await waitFor(() => {
      const allButtons = document.querySelectorAll('button');
      const editButton = Array.from(allButtons).find(
        (button) => button.textContent?.includes('rules.rule.edit') && !button.className.includes('ant-btn-danger'),
      );
      expect(editButton).toBeInTheDocument();
    });

    // Find and click the edit button for the first rule (not the delete button)
    const allButtons = document.querySelectorAll('button');
    const editButton = Array.from(allButtons).find(
      (button) => button.textContent?.includes('rules.rule.edit') && !button.className.includes('ant-btn-danger'),
    );

    expect(editButton).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(editButton!);
    });

    // Verify the form is populated with the rule data
    await waitFor(() => {
      const nameInput = getByPlaceholderText('rules.rule.name') as HTMLInputElement;
      expect(nameInput.value).toBe('Отпуск');
    });

    // Change the rule name
    await act(async () => {
      fireEvent.change(getByPlaceholderText('rules.rule.name'), { target: { value: 'Changed But Will Cancel' } });
    });

    // Click cancel
    await act(async () => {
      fireEvent.click(getByText('rules.rule.cancel'));
    });

    // Verify the form is reset
    await waitFor(() => {
      const nameInput = getByPlaceholderText('rules.rule.name') as HTMLInputElement;
      expect(nameInput.value).toBe('');
    });
  });
});
