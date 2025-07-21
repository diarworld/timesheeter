import { api } from 'shared/api/api';

export interface TUserExtras {
  uid: string; // Comes back as string from API due to BigInt serialization
  department: string | null;
  division: string | null;
  photo: string | null;
}

export interface TUploadPhotoRequest {
  uid: number;
  photo: string; // base64 encoded image
}

export interface TUpdateUserExtrasRequest {
  uid: number;
  department?: string | null;
  division?: string | null;
}

export const userExtrasApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getUserExtras: builder.query<TUserExtras, number>({
      query: (uid) => ({
        url: `/api/user-extras/${uid}`,
        method: 'GET',
      }),
    }),
    uploadPhoto: builder.mutation<{ success: boolean; message: string }, TUploadPhotoRequest>({
      query: (data) => ({
        url: '/api/user-extras/upload-photo',
        method: 'POST',
        body: data,
      }),
    }),
    updateUserExtras: builder.mutation<{ success: boolean; message: string }, TUpdateUserExtrasRequest>({
      query: (data) => ({
        url: '/api/user-extras/update',
        method: 'PUT',
        body: data,
      }),
    }),
  }),
});

export const { useGetUserExtrasQuery, useUploadPhotoMutation, useUpdateUserExtrasMutation } = userExtrasApi; 