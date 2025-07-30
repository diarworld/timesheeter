export const mockYandexUser = {
  uid: 'mock-user-id',
  email: 'mock@example.com',
  display: 'Mock User',
};

export const yandexUserApi = {
  useGetMyselfYandexQuery: () => ({
    data: mockYandexUser,
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
};
