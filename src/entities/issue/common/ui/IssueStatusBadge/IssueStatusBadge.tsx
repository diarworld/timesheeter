import { TIssueStatus } from 'entities/issue/common/model/types';
import { Badge, Button } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  ExclamationCircleOutlined,
  QuestionCircleOutlined,
  FileTextOutlined,
  FileDoneOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  RocketOutlined,
  WarningOutlined,
  StarOutlined,
  ExperimentOutlined,
  SolutionOutlined,
} from '@ant-design/icons';

type TAntdColor =
  | 'default'
  | 'primary'
  | 'danger'
  | 'blue'
  | 'purple'
  | 'cyan'
  | 'green'
  | 'magenta'
  | 'pink'
  | 'red'
  | 'orange'
  | 'yellow'
  | 'volcano'
  | 'geekblue'
  | 'lime'
  | 'gold'
  | undefined;

interface IIssueStatusBadgeProps {
  status: TIssueStatus;
}

const STATUS_COLOR_GROUPS: { color: string; keys: string[] }[] = [
  {
    color: 'gold',
    keys: ['open', 'backlog', 'selectedForDev', 'new', 'newGoal', 'todo'],
  },
  {
    color: 'blue',
    keys: [
      'inProgress',
      'testing',
      'firstSupportLine',
      'secondSupportLine',
      'asPlanned',
      'abtest',
      'rollout',
      'deploy',
      'design',
      'codereview',
      'analysis',
      'testinginpreprod',
      'development',
      'demo',
      'research',
      'uat',
      'copywriting',
      'production',
      'analysisDesign',
      'systemAnalysis',
      'functionalTesting',
      'integrationTesting',
      'contractTesting',
      'regressionTesting',
      'testingOnBranch',
      'testingOnDev',
      'testingOnTest',
      'pilot',
      'rework',
      'architectureapproval',
      'guidelinesverification',
      'remodelling',
      'tenderProcess',
      'documentation',
      'qualification',
      'bargaining',
      'approval',
      'formirovaniezadachnarazrabotku',
      'soglasovaniekomitetom',
      'workOnPortal',
      'analysisABtest',
      'stabilization',
      'prestudy',
      'ptrt',
      'build',
      'ft',
      'golive',
      'readyforptrt',
      'linkedandranked',
      'ideja',
      'issledovaniezaversheno',
      'vnedrenie',
    ],
  },
  {
    color: 'cyan',
    keys: [
      'needInfo',
      'tested',
      'inReview',
      'rc',
      'readyForTest',
      'needAcceptance',
      'confirmed',
      'needEstimate',
      'demoToCustomer',
      'documentsPrepared',
      'resultAcceptance',
      'withRisks',
      'readyfordevelopment',
      'readyforreview',
      'readyforanalysis',
      'readyforpreprod',
      'readyForRollout',
      'readyForSystemAnalysis',
      'readyForABtest',
      'readyForDesign',
      'classification',
    ],
  },
  {
    color: 'green',
    keys: [
      'resolved',
      'closed',
      'achieved',
      'estimation',
      'done',
      'published',
      'contractApproved',
      'purchaseByInitiator',
      'currentContract',
      'knownError',
    ],
  },
  {
    color: 'red',
    keys: ['cancelled', 'deleted', 'rejected', 'blocked', 'blockedGoal', 'onHold', 'rollback', 'notAchieved'],
  },
  {
    color: 'orange',
    keys: [
      'rc',
      'readyForTest',
      'readyforreview',
      'readyforpreprod',
      'readyforptrt',
      'readyForRollout',
      'readyForSystemAnalysis',
      'readyForDesign',
      'readyforanalysis',
      'readyfordevelopment',
      'readyForABtest',
    ],
  },
];

const DEFAULT_STATUS_COLOR = 'default';
// Color mapping
export function getStatusColor(status: { key: string }): TAntdColor {
  for (const group of STATUS_COLOR_GROUPS) {
    if (group.keys.includes(status.key)) return group.color as TAntdColor;
  }
  return DEFAULT_STATUS_COLOR;
}

const STATUS_ICON_GROUPS: { icon: React.ReactNode; keys: string[] }[] = [
  {
    icon: <CheckCircleOutlined />,
    keys: [
      'done',
      'closed',
      'achieved',
      'published',
      'contractApproved',
      'purchaseByInitiator',
      'currentContract',
      'knownError',
      'notAchieved',
      'estimation',
    ],
  },
  {
    icon: <LoadingOutlined />,
    keys: [
      'inProgress',
      'testing',
      'firstSupportLine',
      'secondSupportLine',
      'asPlanned',
      'abtest',
      'rollout',
      'deploy',
      'design',
      'codereview',
      'analysis',
      'testinginpreprod',
      'development',
      'demo',
      'research',
      'uat',
      'copywriting',
      'production',
      'analysisDesign',
      'systemAnalysis',
      'functionalTesting',
      'integrationTesting',
      'contractTesting',
      'regressionTesting',
      'testingOnBranch',
      'testingOnDev',
      'testingOnTest',
      'pilot',
      'rework',
      'architectureapproval',
      'guidelinesverification',
      'remodelling',
      'tenderProcess',
      'documentation',
      'qualification',
      'bargaining',
      'approval',
      'formirovaniezadachnarazrabotku',
      'soglasovaniekomitetom',
      'workOnPortal',
      'analysisABtest',
      'stabilization',
      'prestudy',
      'ptrt',
      'build',
      'ft',
      'golive',
      'readyforptrt',
      'linkedandranked',
      'ideja',
      'issledovaniezaversheno',
      'vnedrenie',
    ],
  },
  {
    icon: <CloseCircleOutlined />,
    keys: ['cancelled', 'deleted', 'rejected', 'blocked', 'blockedGoal', 'onHold', 'rollback'],
  },
  {
    icon: <ExclamationCircleOutlined />,
    keys: [
      'rc',
      'readyForTest',
      'readyforreview',
      'readyforpreprod',
      'readyforptrt',
      'readyForRollout',
      'readyForSystemAnalysis',
      'readyForDesign',
      'readyforanalysis',
      'readyfordevelopment',
      'readyForABtest',
    ],
  },
  {
    icon: <FileDoneOutlined />,
    keys: [
      'tested',
      'inReview',
      'needAcceptance',
      'confirmed',
      'needEstimate',
      'demoToCustomer',
      'documentsPrepared',
      'resultAcceptance',
      'withRisks',
      'readyfordevelopment',
      'readyforreview',
      'readyforanalysis',
      'readyforpreprod',
      'readyForRollout',
      'readyForSystemAnalysis',
      'readyForABtest',
      'readyForDesign',
      'classification',
    ],
  },
  {
    icon: <PlayCircleOutlined />,
    keys: ['open', 'backlog', 'selectedForDev', 'new', 'newGoal', 'todo'],
  },
  {
    icon: <PauseCircleOutlined />,
    keys: ['needInfo', 'paused', 'onHold'],
  },
  {
    icon: <RocketOutlined />,
    keys: ['rollout', 'deploy', 'golive', 'published'],
  },
  {
    icon: <WarningOutlined />,
    keys: ['blocked', 'blockedGoal', 'withRisks', 'notAchieved'],
  },
  {
    icon: <StarOutlined />,
    keys: ['achieved', 'confirmed', 'qualification', 'purchaseByInitiator'],
  },
  {
    icon: <ExperimentOutlined />,
    keys: ['abtest', 'analysisABtest', 'testinginpreprod'],
  },
  {
    icon: <SolutionOutlined />,
    keys: [
      'analysis',
      'analysisDesign',
      'systemAnalysis',
      'functionalTesting',
      'integrationTesting',
      'contractTesting',
      'regressionTesting',
    ],
  },
  {
    icon: <FileTextOutlined />,
    keys: [
      'documentation',
      'copywriting',
      'demoToCustomer',
      'documentsPrepared',
      'plan',
      'estimation',
      'classification',
      'formirovaniezadachnarazrabotku',
      'linkedandranked',
      'ideja',
      'prestudy',
      'tenderProcess',
      'build',
      'ft',
      'ptrt',
      'issledovaniezaversheno',
    ],
  },
];

const DEFAULT_STATUS_ICON = <QuestionCircleOutlined />;

export function getStatusIcon(status: { key: string }): React.ReactNode {
  for (const group of STATUS_ICON_GROUPS) {
    if (group.keys.includes(status.key)) return group.icon;
  }
  return DEFAULT_STATUS_ICON;
}

export const IssueStatusBadge = ({ status }: IIssueStatusBadgeProps) => (
  <Badge dot color={getStatusColor(status)}>
    <Button
      icon={getStatusIcon(status)}
      color={getStatusColor(status)}
      variant="filled"
      style={{ cursor: 'default' }}
      aria-label={status.display}
    >
      {status.display}
    </Button>
  </Badge>
);
