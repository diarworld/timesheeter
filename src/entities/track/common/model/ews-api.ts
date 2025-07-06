import { api } from 'shared/api/api';

export interface TEwsCredentials {
  username: string;
  token: string;
  type?: string;
}

export interface TEwsCalendarRequest extends TEwsCredentials {
  start_date: string;
  end_date: string;
}

export interface TEwsAuthResponse {
  success: boolean;
  message?: string;
  userInfo?: {
    displayName: string;
    email: string;
  };
}

export interface TEwsCalendarResponse {
  success: boolean;
  meetings: Array<{
    id: string;
    subject: string;
    start: string;
    end: string;
    location: string;
    duration: number;
    isAllDay: boolean;
    isCancelled: boolean;
    organizer?: string;
    body?: string;
    categories: string[];
  }>;
  totalMeetings: number;
  dateRange: {
    start: string;
    end: string;
    start_date: string;
    end_date: string;
  };
}

export const ewsApi = api.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    authenticateEws: builder.mutation<TEwsAuthResponse, TEwsCredentials>({
      query: (credentials) => ({
        url: '/api/ews/authenticate',
        method: 'POST',
        body: credentials,
      }),
    }),
    getCalendarMeetings: builder.mutation<TEwsCalendarResponse, TEwsCalendarRequest>({
      query: (credentials) => ({
        url: '/api/ews/calendar',
        method: 'POST',
        body: credentials,
      }),
    }),
    testEwsConnection: builder.query<TEwsAuthResponse, TEwsCredentials>({
      query: (credentials) => ({
        url: '/api/ews/test',
        method: 'POST',
        body: credentials,
      }),
    }),
  }),
});

export const { useAuthenticateEwsMutation, useGetCalendarMeetingsMutation, useTestEwsConnectionQuery } = ewsApi; 