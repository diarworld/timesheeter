export type TCondition = {
  field: string;
  operator: string;
  value: string;
  logic?: 'AND' | 'OR';
};

export type TAction = {
  type: string;
  value: string;
};

export type TRule = {
  id: string;
  name: string;
  description: string;
  conditions: TCondition[];
  actions: TAction[];
  shared: boolean;
  teamId: string;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
};
