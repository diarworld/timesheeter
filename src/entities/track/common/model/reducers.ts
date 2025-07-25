import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  TTrackInputCreate,
  TTrackInputDelete,
  TTeamManageCreate,
  TTeamLdapLogin,
  TTrackStore,
} from 'entities/track/common/model/types';
import { TYandexUser } from 'entities/user/yandex/model/types';

const initialState: TTrackStore = {};

export const track = createSlice({
  initialState,
  name: 'track',
  reducers: {
    setInputCreate: (state, { payload }: PayloadAction<TTrackInputCreate | undefined>) => {
      state.inputCreate = payload;
    },
    setInputDelete: (state, { payload }: PayloadAction<TTrackInputDelete | undefined>) => {
      state.inputDelete = payload;
    },
    setTeamManageCreate: (state, { payload }: PayloadAction<TTeamManageCreate | undefined>) => {
      state.manageCreate = payload;
    },
    setLdapLoginCreate: (state, { payload }: PayloadAction<TTeamLdapLogin | undefined>) => {
      state.ldapLogin = payload;
    },
    setHasLdapCredentials: (state, { payload }: PayloadAction<boolean>) => {
      state.hasLdapCredentials = payload;
    },
    setTeam: (state, { payload }: PayloadAction<TYandexUser[]>) => {
      state.team = payload;
    },
  },
});
