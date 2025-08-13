import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  TTrackInputCreate,
  TTrackInputDelete,
  TTeamManageCreate,
  TTeamLdapLogin,
  TTrackStore,
  TTeam,
} from 'entities/track/common/model/types';
import { TYandexUser } from 'entities/user/yandex/model/types';

const initialState: TTrackStore = {
  teams: [],
  selectedTeamId: null,
  team: [],
};

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
    setTeams: (state, { payload }: PayloadAction<TTeam[]>) => {
      state.teams = payload;
    },
    addTeam: (state, { payload }: PayloadAction<TTeam>) => {
      if (!state.teams) {
        state.teams = [];
      }
      state.teams.push(payload);
    },
    updateTeam: (state, { payload }: PayloadAction<{ teamId: string; updates: Partial<TTeam> }>) => {
      if (state.teams) {
        const teamIndex = state.teams.findIndex(team => team.id === payload.teamId);
        if (teamIndex !== -1) {
          state.teams[teamIndex] = { ...state.teams[teamIndex], ...payload.updates };
        }
      }
    },
    removeTeam: (state, { payload }: PayloadAction<string>) => {
      if (state.teams) {
        state.teams = state.teams.filter(team => team.id !== payload);
      }
      if (state.selectedTeamId === payload) {
        state.selectedTeamId = null;
      }
    },
    setSelectedTeamId: (state, { payload }: PayloadAction<string | null>) => {
      state.selectedTeamId = payload;
    },
  },
});
