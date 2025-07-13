import { api } from 'shared/api/api';

export interface IEwsCredentials {
  username: string;
  token: string;
  type?: string;
}

export interface IEwsCalendarRequest extends IEwsCredentials {
  start_date: string;
  end_date: string;
}

export interface IEwsAuthResponse {
  success: boolean;
  message?: string;
  userInfo?: {
    displayName: string;
    email: string;
  };
}

export interface IEwsCalendarResponse {
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
    requiredAttendees: string[];
    optionalAttendees: string[];
    participants: number;
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
    authenticateEws: builder.mutation<IEwsAuthResponse, IEwsCredentials>({
      query: (credentials) => ({
        url: '/api/ews/authenticate',
        method: 'POST',
        body: credentials,
      }),
    }),
    getCalendarMeetings: builder.mutation<IEwsCalendarResponse, IEwsCalendarRequest>({
      query: (credentials) => ({
        url: '/api/ews/calendar',
        method: 'POST',
        body: credentials,
      }),
    }),
    testEwsConnection: builder.query<IEwsAuthResponse, IEwsCredentials>({
      query: (credentials) => ({
        url: '/api/ews/test',
        method: 'POST',
        body: credentials,
      }),
    }),
  }),
});

export const { useAuthenticateEwsMutation, useGetCalendarMeetingsMutation, useTestEwsConnectionQuery } = ewsApi;
