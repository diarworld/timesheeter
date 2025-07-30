export const useAuthenticateEwsMutation = () => [
  jest.fn().mockResolvedValue({
    unwrap: () => Promise.resolve({ success: true }),
  }),
  { isLoading: false },
];
