import { TYandexUser } from 'entities/user/yandex/model/types';

export type TTeam = {
  id: string;
  name: string;
  creatorId: string;
  members: TYandexUser[];
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type TTeamFormManageCreate = {
  name: string;
  members: TYandexUser[];
};

export type TTeamFormManageFields = {
  ldap: string;
  teamId: string;
};

export type TTeamFormManageUpdate = {
  teamId: string;
  name?: string;
  members: TYandexUser[];
};

export type TTeamFormManageDelete = {
  teamId: string;
};

export type TTeamFormManageSelect = {
  teamId: string;
  members: TYandexUser[];
};

export type TTeamFormManageState = {
  teams: TTeam[];
  selectedTeamId: string | null;
};
