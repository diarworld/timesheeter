import { track } from 'entities/track/common/model/reducers';
import { TTrackStore } from 'entities/track/common/model/types';
import { TAppState } from 'shared/lib/types';

const selectTrack = (state: TAppState): TTrackStore => state[track.name] as TTrackStore;

export const selectTrackInputCreate = (state: TAppState) => selectTrack(state).inputCreate;
export const selectTrackInputDelete = (state: TAppState) => selectTrack(state).inputDelete;
export const selectTeamManageCreate = (state: TAppState) => selectTrack(state).manageCreate;
export const selectLdapLoginManage = (state: TAppState) => selectTrack(state).ldapLogin;
export const selectHasLdapCredentials = (state: TAppState) => selectTrack(state).hasLdapCredentials;
export const selectTeam = (state: TAppState) => selectTrack(state).team;
