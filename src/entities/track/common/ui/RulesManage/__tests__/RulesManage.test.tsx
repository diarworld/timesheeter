import { fireEvent, render, waitFor, act, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { track } from 'entities/track/common/model/reducers';
import { RulesManage } from '../RulesManage';

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

// Mock fetch to silence SSR warning
beforeAll(() => {
  global.fetch = jest.fn(() => Promise.resolve({ json: () => Promise.resolve({}) })) as any;
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

describe('RulesManage', () => {
  beforeEach(() => {
    localStorageMock.getItem.mockReturnValue('{}');
    localStorageMock.setItem.mockClear();
  });

  it('should add a new rule and save it to localStorage', async () => {
    const mockTracker = {
      id: 'mock-id',
      type: 'ldap',
      name: 'Mock LDAP',
      config: {},
    } as unknown as any;

    const { getByText, getByPlaceholderText, getAllByRole, findByText } = renderWithProvider(
      <RulesManage tracker={mockTracker} />,
    );

    // Fill in the rule name
    await act(async () => {
      fireEvent.change(getByPlaceholderText('rules.rule.name'), { target: { value: 'Test Rule' } });
    });
    // Fill in the description (in case it's required)
    await act(async () => {
      fireEvent.change(getByPlaceholderText('rules.rule.description'), { target: { value: 'Test Description' } });
    });

    // Add a condition
    await act(async () => {
      fireEvent.click(getByText((c) => c === 'rules.add.condition'));
    });
    // Use combobox roles for selects
    const selects = getAllByRole('combobox');
    // Field select
    await act(async () => {
      fireEvent.mouseDown(selects[0]);
    });
    const summaryOption = document.body.querySelector('.ant-select-item-option');
    if (!summaryOption) throw new Error('Summary option not found');
    await act(async () => {
      fireEvent.click(summaryOption);
      fireEvent.blur(selects[0]);
    });

    // Wait for the operator select to be re-rendered
    await waitFor(() => {
      const tempSelects = document.querySelectorAll('input[role=combobox]');
      if (tempSelects.length < 2) throw new Error('Operator select not rendered');
    });

    // Re-query the selects to get the updated operator select
    const operatorSelects = document.querySelectorAll('input[role=combobox]');

    // Open the operator select
    await act(async () => {
      fireEvent.mouseDown(operatorSelects[1]);
    });

    // Wait for operator options to appear
    await waitFor(() => {
      const operatorOptions = Array.from(document.body.querySelectorAll('.ant-select-item-option')).filter(
        (el) =>
          el.textContent &&
          (el.textContent.toLowerCase().includes('contain') ||
            el.textContent.toLowerCase().includes('equal') ||
            el.textContent.toLowerCase().includes('not')),
      );
      if (operatorOptions.length === 0) {
        // console.log(
        //   'Available operator options:',
        //   Array.from(document.body.querySelectorAll('.ant-select-item-option')).map((el) => el.textContent),
        // );
        throw new Error('Operator options not found');
      }
    });
    const operatorOptions = Array.from(document.body.querySelectorAll('.ant-select-item-option')).filter(
      (el) =>
        el.textContent &&
        (el.textContent.toLowerCase().includes('contain') ||
          el.textContent.toLowerCase().includes('equal') ||
          el.textContent.toLowerCase().includes('not')),
    );
    if (operatorOptions.length === 0) throw new Error('Operator options not found');
    await act(async () => {
      fireEvent.click(operatorOptions[0]);
      fireEvent.blur(operatorSelects[1]);
    });
    // Value input for condition
    const valueInputs = document.querySelectorAll('input[placeholder="rules.value"]');
    await act(async () => {
      fireEvent.change(valueInputs[0], { target: { value: 'Test Value' } });
    });

    // Add an action
    await act(async () => {
      fireEvent.click(getByText((c) => c === 'rules.add.action'));
    });
    // Action type select
    const actionSelects = getAllByRole('combobox');
    await act(async () => {
      fireEvent.mouseDown(actionSelects[2]);
    });
    const setTaskOption = within(document.body).getByText((content) => content === 'rules.action.set_task');
    await act(async () => {
      fireEvent.click(setTaskOption);
    });
    // Value input for action
    const updatedValueInputs = document.querySelectorAll('input[placeholder="rules.value"]');
    await act(async () => {
      fireEvent.change(updatedValueInputs[1], { target: { value: 'Test Action Value' } });
      fireEvent.blur(updatedValueInputs[1]);
    });

    // Save the rule
    await act(async () => {
      fireEvent.click(getByText((c) => c === 'rules.rule.create'));
    });

    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith('timesheeterRules', expect.stringContaining('Test Rule'));
    });
  });
});
