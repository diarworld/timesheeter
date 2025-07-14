import { api } from 'shared/api/api';

// accessToken must be a Microsoft Graph access token (JWT) from msal-browser, not a password or other token
export interface IGraphCalendarRequest {
  accessToken: string; // Microsoft Graph access token (JWT) from msal-browser
  startDateTime: string;
  endDateTime: string;
}

export interface IGraphCalendarResponse {
  value: Array<any>; // Microsoft Graph event objects
}

export const graphApi = api.injectEndpoints({
  overrideExisting: true,
  endpoints: (builder) => ({
    getCalendarEvents: builder.mutation<IGraphCalendarResponse, IGraphCalendarRequest>({
      query: (body) => ({
        url: '/api/ews/calendar',
        method: 'POST',
        body,
      }),
    }),
  }),
});

export const { useGetCalendarEventsMutation } = graphApi;
