import { TTrackerConfig } from 'entities/tracker/model/types';

// export type TQueue = {
//   id: number | string;
//   key: string;
// };

export type TGetQueuesParams = {
  tracker: TTrackerConfig;
};

export type TGetQueueParams = {
  tracker: TTrackerConfig;
  keys: string[];
};

export type TQueue = {
  self: string;
  id: number;
  key: string;
  version: number;
  name: string;
  lead: ILead;
  assignAuto: boolean;
  defaultType: IDefaultType;
  defaultPriority: IDefaultPriority;
  teamUsers: ITeamUser[];
  denyVoting: boolean;
  denyConductorAutolink: boolean;
  denyTrackerAutolink: boolean;
  useComponentPermissionsIntersection: boolean;
  addSummoneeToIssueAccess: boolean;
  addCommentAuthorToIssueFollowers: boolean;
  workflowActionsStyle: string;
  useLastSignature: boolean;
};

export interface ILead {
  self: string;
  id: string;
  display: string;
  cloudUid: string;
  passportUid: number;
}

export interface IDefaultType {
  self: string;
  id: string;
  key: string;
  display: string;
}

export interface IDefaultPriority {
  self: string;
  id: string;
  key: string;
  display: string;
}

export interface ITeamUser {
  self: string;
  id: string;
  display: string;
  cloudUid: string;
  passportUid: number;
}
