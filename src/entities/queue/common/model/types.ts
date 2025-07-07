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
  self: string
  id: number
  key: string
  version: number
  name: string
  lead: Lead
  assignAuto: boolean
  defaultType: DefaultType
  defaultPriority: DefaultPriority
  teamUsers: TeamUser[]
  denyVoting: boolean
  denyConductorAutolink: boolean
  denyTrackerAutolink: boolean
  useComponentPermissionsIntersection: boolean
  addSummoneeToIssueAccess: boolean
  addCommentAuthorToIssueFollowers: boolean
  workflowActionsStyle: string
  useLastSignature: boolean
}

export interface Lead {
  self: string
  id: string
  display: string
  cloudUid: string
  passportUid: number
}

export interface DefaultType {
  self: string
  id: string
  key: string
  display: string
}

export interface DefaultPriority {
  self: string
  id: string
  key: string
  display: string
}

export interface TeamUser {
  self: string
  id: string
  display: string
  cloudUid: string
  passportUid: number
}
