import { TYandexUser } from 'entities/user/yandex/model/types';

export type TTeam = {
  id: string;
  name: string;
  creatorId: string;
  members: TYandexUser[];
};

export type TTeamFormManageCreate = {
  team: string;
  members: TYandexUser[];
};

export type TTeamFormManageFields = {
  ldap: string;
  team: string;
};

export type TTeamFormManageUpdate = {
  team: string;
  members: TYandexUser[];
};

export type TTeamFormManageDelete = {
  team: string;
};
