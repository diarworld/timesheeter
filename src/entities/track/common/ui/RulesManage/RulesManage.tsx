import {
  Button,
  Form,
  Input,
  Flex,
  Select,
  Space,
  Divider,
  Typography,
  message as antdMessage,
  Switch,
  Collapse,
  Popconfirm,
} from 'antd';
import { PlusOutlined, MinusCircleOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useMessage } from 'entities/locale/lib/hooks';
import { FC, useEffect, useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { TTrackerConfig } from 'entities/tracker/model/types';
import { AIIcon } from 'components/Icons/AI';
import { TYandexUser } from 'entities/user/yandex/model/types';
import { useYandexUser } from 'entities/user/yandex/hooks/use-yandex-user';
import { useFilterValues } from 'features/filters/lib/useFilterValues';
import { YandexIssuesSearchConnected } from 'entities/track/yandex/ui/YandexIssuesSearchConnected/YandexIssuesSearchConnected';
import { validateHumanReadableDuration } from 'entities/track/common/lib/validate-human-readable-duration';
import { TTimesheeterRuleCondition, TRule } from './types';

// Move ShareTeamSelect and ShareButton above RulesManage
interface IShareTeamSelectProps {
  userTeams: { id: string; name: string }[];
  selectedShareTeam: string | undefined;
  onChange: (value: string) => void;
  message: (id: string) => string;
}
const ShareTeamSelect: React.FC<IShareTeamSelectProps> = ({ userTeams, selectedShareTeam, onChange, message }) => (
  <Select
    style={{ minWidth: 250, maxWidth: 250, marginRight: 8 }}
    placeholder={message('rules.select.team')}
    options={userTeams.map((team) => ({ value: team.id, label: team.name }))}
    value={selectedShareTeam}
    onChange={onChange}
    size="small"
  />
);

interface IShareButtonProps {
  loading: boolean;
  onClick: () => void;
  disabled?: boolean;
  message: (id: string) => string;
}
const ShareButton: React.FC<IShareButtonProps> = ({ loading, onClick, disabled, message }) => (
  <Button size="small" loading={loading} onClick={onClick} disabled={disabled}>
    {message('rules.share.with.team')}
  </Button>
);

export const RulesManage: FC<{ tracker: TTrackerConfig; isDarkMode: boolean }> = ({ tracker, isDarkMode }) => {
  const message = useMessage();
  const [form] = Form.useForm<TRule>();
  const [rules, setRules] = useState<TRule[]>([]);
  const [editingRule, setEditingRule] = useState<TRule | null>(null);
  const [messageApi, contextHolder] = antdMessage.useMessage();
  const [aiLoading, setAiLoading] = useState(false);
  const [aiForm] = Form.useForm();
  const [sharedRules, setSharedRules] = useState<TRule[]>([]);
  const [shareLoading, setShareLoading] = useState<string | null>(null);
  const [userTeams, setUserTeams] = useState<{ id: string; name: string; members: TYandexUser[] }[]>([]);
  const [teamNameMap, setTeamNameMap] = useState<{ [id: string]: string }>({});
  const { userId, login } = useFilterValues();
  const { self } = useYandexUser(tracker, userId, login);
  const [selectedShareTeam, setSelectedShareTeam] = useState<string | undefined>();

  // Fetch all teams for the user and build teamId -> teamName map
  useEffect(() => {
    const fetchTeams = async () => {
      if (!self) return;
      try {
        const res = await fetch('/api/team', {
          headers: {
            'x-user-id': self?.uid?.toString() || '',
            'x-user-email': self?.email || '',
            'x-user-display': self?.display ? encodeURIComponent(self.display) : '',
          },
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.teams)) {
            setUserTeams(data.teams);
            setTeamNameMap(
              Object.fromEntries((data.teams as { id: string; name: string }[]).map((team) => [team.id, team.name])),
            );
          }
        }
      } catch (e) {
        console.error('Error fetching teams:', e);
      }
    };
    fetchTeams();
  }, [self]);

  // Fetch all shared rules for all teams
  useEffect(() => {
    if (!self) return;
    const fetchRules = async () => {
      try {
        const res = await fetch(`/api/team-rules`, {
          headers: { 'x-user-id': self?.uid?.toString() || '', 'x-user-email': self?.email || '' },
        });
        if (res.ok) {
          const data = await res.json();
          setSharedRules(Array.isArray(data.rules) ? data.rules : []);
        }
      } catch (e) {
        console.error('Error fetching shared rules:', e);
      }
    };
    fetchRules();
  }, [self]);

  // Localized constants must be inside the component
  const CONDITION_FIELDS = [
    { value: 'summary', label: message('rules.field.summary') },
    { value: 'participants', label: message('rules.field.participants') },
    { value: 'duration', label: message('rules.field.duration') },
    { value: 'organizer', label: message('rules.field.organizer') },
  ];

  const CONDITION_OPERATORS = {
    summary: [
      { value: 'contains', label: message('rules.op.contains') },
      { value: 'not_contains', label: message('rules.op.not_contains') },
      { value: 'equals', label: message('rules.op.equals') },
    ],
    participants: [
      { value: 'includes', label: message('rules.op.includes') },
      { value: 'not_includes', label: message('rules.op.not_includes') },
      { value: '>', label: message('rules.op.gt') },
      { value: '<', label: message('rules.op.lt') },
      { value: '=', label: message('rules.op.eq') },
    ],
    duration: [
      { value: '>', label: message('rules.op.gt') },
      { value: '<', label: message('rules.op.lt') },
      { value: '=', label: message('rules.op.eq') },
    ],
    organizer: [
      { value: 'is', label: message('rules.op.is') },
      { value: 'is_not', label: message('rules.op.is_not') },
      { value: 'contains', label: message('rules.op.contains') },
      { value: 'not_contains', label: message('rules.op.not_contains') },
    ],
  } as const;

  const ACTION_TYPES = [
    { value: 'set_task', label: message('rules.action.set_task') },
    { value: 'set_duration', label: message('rules.action.set_duration') },
    { value: 'skip', label: message('rules.action.skip') },
  ];

  const LOGIC_OPTIONS = [
    { value: 'AND', label: 'AND' },
    { value: 'OR', label: 'OR' },
  ];

  const RULES_STORAGE_KEY = 'timesheeterRules';

  // Load rules from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(RULES_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRules(parsed);
        }
      } else {
        // Add default rule if no rules in storage
        const defaultRules = [
          {
            id: uuidv4(),
            name: 'Отпуск',
            description: 'Правило по-умолчанию для отпуска',
            conditions: [{ field: 'summary', operator: 'equals', value: 'Отпуск', logic: 'AND' as const }],
            actions: [{ type: 'set_task', value: 'PM-2' }],
          },
          {
            id: uuidv4(),
            name: 'Обучение',
            description: 'Правило по-умолчанию для прохождения и проведения обучения',
            conditions: [
              { field: 'summary', operator: 'contains', value: 'DE Talks', logic: 'OR' as const },
              { field: 'summary', operator: 'contains', value: 'BI Talks', logic: 'OR' as const },
              { field: 'summary', operator: 'contains', value: 'Meetup', logic: 'OR' as const },
              { field: 'summary', operator: 'contains', value: 'Обучение', logic: 'OR' as const },
              { field: 'summary', operator: 'contains', value: 'Тренинг', logic: 'OR' as const },
              { field: 'summary', operator: 'contains', value: 'Training', logic: 'OR' as const },
              { field: 'summary', operator: 'contains', value: 'Community', logic: 'OR' as const },
              { field: 'summary', operator: 'contains', value: 'Meeting', logic: 'OR' as const },
            ],
            actions: [{ type: 'set_task', value: 'PM-3' }],
          },
          {
            id: uuidv4(),
            name: 'Общие встречи',
            description: 'Правило по-умолчанию для общих встреч',
            conditions: [
              { field: 'participants', operator: '>', value: '100', logic: 'OR' as const },
              {
                field: 'participants',
                operator: 'includes',
                value: `ml.lmtech@${process.env.COMPANY_DOMAIN}`,
                logic: 'OR' as const,
              },
              {
                field: 'participants',
                operator: 'includes',
                value: `ml.all.co@${process.env.COMPANY_DOMAIN}`,
                logic: 'OR' as const,
              },
              {
                field: 'participants',
                operator: 'includes',
                value: `ml.all.dir@${process.env.COMPANY_DOMAIN}`,
                logic: 'OR' as const,
              },
              {
                field: 'participants',
                operator: 'includes',
                value: `allrd@${process.env.COMPANY_DOMAIN}`,
                logic: 'OR' as const,
              },
              {
                field: 'participants',
                operator: 'includes',
                value: `ml.co@${process.env.COMPANY_DOMAIN}`,
                logic: 'OR' as const,
              },
              {
                field: 'participants',
                operator: 'includes',
                value: `ml.com@${process.env.COMPANY_DOMAIN}`,
                logic: 'OR' as const,
              },
              {
                field: 'participants',
                operator: 'includes',
                value: `Products@${process.env.COMPANY_DOMAIN}`,
                logic: 'OR' as const,
              },
              {
                field: 'participants',
                operator: 'includes',
                value: `ml.DevCom-Users@${process.env.COMPANY_DOMAIN}`,
                logic: 'OR' as const,
              },
              { field: 'summary', operator: 'contains', value: 'Coffee talk', logic: 'OR' as const },
              { field: 'summary', operator: 'contains', value: 'Доклады и Докладчики', logic: 'OR' as const },
              { field: 'summary', operator: 'contains', value: 'Domain Review', logic: 'OR' as const },
              { field: 'summary', operator: 'contains', value: 'ТДК', logic: 'OR' as const },
              { field: 'summary', operator: 'contains', value: 'TDK', logic: 'OR' as const },
            ],
            actions: [{ type: 'set_task', value: 'PM-4' }],
          },
          {
            id: uuidv4(),
            name: 'Работа с людьми',
            description: 'Правило по-умолчанию для работы с людьми (собеседования, интервью, БОРДы, Биланы)',
            conditions: [
              { field: 'summary', operator: 'contains', value: 'МежБОРД', logic: 'OR' as const },
              { field: 'summary', operator: 'contains', value: 'БОРД', logic: 'OR' as const },
              { field: 'summary', operator: 'contains', value: 'Билан', logic: 'OR' as const },
              { field: 'summary', operator: 'contains', value: 'МежБилан', logic: 'OR' as const },
              { field: 'summary', operator: 'contains', value: 'Собес', logic: 'OR' as const },
              { field: 'summary', operator: 'contains', value: 'Interview', logic: 'OR' as const },
              { field: 'summary', operator: 'contains', value: 'Интервью', logic: 'OR' as const },
            ],
            actions: [{ type: 'set_task', value: 'PM-11' }],
          },
          {
            id: uuidv4(),
            name: 'Округление',
            description: 'Правило по-умолчанию для округления длительности встречи до 30 мин',
            conditions: [{ field: 'duration', operator: '<', value: '30м', logic: 'AND' as const }],
            actions: [{ type: 'set_duration', value: '30м' }],
          },
          {
            id: uuidv4(),
            name: 'Округление',
            description: 'Правило по-умолчанию для округления длительности встречи до 1 часа',
            conditions: [
              { field: 'duration', operator: '<', value: '1ч', logic: 'AND' as const },
              { field: 'duration', operator: '>', value: '30м', logic: 'AND' as const },
            ],
            actions: [{ type: 'set_duration', value: '1ч' }],
          },
          {
            id: uuidv4(),
            name: 'Пропуск',
            description: 'Правило по-умолчанию для пропуска встреч без участников',
            conditions: [
              { field: 'participants', operator: '<', value: '1', logic: 'AND' as const },
              { field: 'summary', operator: 'not_contains', value: 'Отпуск', logic: 'AND' as const },
            ],
            actions: [{ type: 'skip', value: 'true' }],
          },
        ];
        setRules(defaultRules as TRule[]);
        localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(defaultRules));
      }
    } catch (e) {
      console.error('Error loading default rules:', e);
    }
  }, []);

  // If editing, set form values
  useEffect(() => {
    if (editingRule) {
      form.setFieldsValue(editingRule);
    } else {
      form.resetFields();
    }
  }, [editingRule, form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      // Validation: at least one condition and one action
      if (!values.conditions || values.conditions.length === 0) {
        messageApi.error(message('rules.rule.error.no_conditions'));
        return;
      }
      if (!values.actions || values.actions.length === 0) {
        messageApi.error(message('rules.rule.error.no_actions'));
        return;
      }
      // Validation: only one of each action type
      const actionTypes = values.actions.map((a) => a.type);
      const uniqueActionTypes = new Set(actionTypes);
      if (actionTypes.length !== uniqueActionTypes.size) {
        messageApi.error(message('rules.rule.error.duplicate_action_type'));
        return;
      }
      const rule: TRule = {
        ...values,
        id: editingRule?.id || uuidv4(),
        conditions: values.conditions || [],
        actions: values.actions || [],
        teamId: (editingRule as TRule)?.teamId, // preserve teamId if present
      };

      if (editingRule && sharedRules.some((r) => r.id === editingRule.id)) {
        // Shared rule: update on server
        if (!self) {
          messageApi.error(message('rules.current.user.error'));
          return;
        }
        const res = await fetch('/api/team-rules', {
          method: 'PUT', // or PATCH, depending on your API
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': self?.uid?.toString() || '',
            'x-user-email': self?.email || '',
          },
          body: JSON.stringify({ id: rule.id, teamId: rule.teamId, rule }),
        });
        if (res.ok) {
          const data = await res.json();
          setSharedRules((prev) => prev.map((r) => (r.id === rule.id ? data.rule : r)));
          setEditingRule(null);
          form.resetFields();
          messageApi.success(message('rules.rule.saved', { name: rule.name }));
        } else {
          const err = await res.json();
          messageApi.error(err.error || 'Update failed');
        }
        return;
      }

      let newRules;
      if (editingRule) {
        newRules = rules.map((r) => (r.id === editingRule.id ? rule : r));
      } else {
        newRules = [...rules, rule];
      }
      setRules(newRules);
      localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(newRules));
      setEditingRule(null);
      form.resetFields();
      messageApi.success(message('rules.rule.saved', { name: rule.name }));
    } catch (err) {
      // console.log('Validation error', JSON.stringify(err, null, 2));
    }
  };

  const handleCancel = () => {
    setEditingRule(null);
    form.resetFields();
  };

  const handleEdit = (rule: TRule) => {
    setEditingRule(rule);
  };
  // Merge shared and local rules for display
  const allRules = [
    ...sharedRules,
    ...rules.filter((localRule) => !sharedRules.some((sharedRule) => sharedRule.id === localRule.id)),
  ];

  const handleDelete = async (id: string, teamId?: string) => {
    const ruleName = allRules.find((r) => r.id === id)?.name;
    if (teamId) {
      if (sharedRules.some((r) => r.id === id)) {
        if (!self) return;
        try {
          const res = await fetch('/api/team-rules', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': self?.uid?.toString() || '',
              'x-user-email': self?.email || '',
            },
            body: JSON.stringify({ id, teamId }),
          });
          if (res.ok) {
            setSharedRules((prev) => prev.filter((r) => r.id !== id));
            messageApi.success(message('rules.rule.deleted', { name: ruleName }));
          } else {
            const err = await res.json();
            messageApi.error(err.error || 'Delete failed');
          }
        } catch (e) {
          messageApi.error('Delete failed');
        }
      }
    } else {
      // Local rule: delete from local state
      const newRules = rules.filter((r) => r.id !== id);
      setRules(newRules);
      localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(newRules));
      messageApi.success(message('rules.rule.deleted', { name: ruleName }));
      if (editingRule?.id === id) {
        setEditingRule(null);
        form.resetFields();
      }
    }
  };

  // Add a state to force re-render of operator selects
  const [operatorRerenderKey, setOperatorRerenderKey] = useState(0);

  // Track previous conditions to detect field changes
  const prevConditionsRef = useRef<TTimesheeterRuleCondition[]>([]);

  const handleValuesChange = (changed: Partial<TRule>, all: TRule) => {
    const prevConditions = prevConditionsRef.current;
    const currentConditions = all.conditions || [];

    // Only run if conditions exist and lengths match (not on add/remove)
    if (
      Array.isArray(prevConditions) &&
      Array.isArray(currentConditions) &&
      prevConditions.length === currentConditions.length
    ) {
      for (let i = 0; i < currentConditions.length; i += 1) {
        if (prevConditions[i] && currentConditions[i] && prevConditions[i].field !== currentConditions[i].field) {
          // Reset operator for this condition
          const newConditions = [...currentConditions];
          newConditions[i] = { ...newConditions[i], operator: '' };
          form.setFieldsValue({ conditions: newConditions });
          setOperatorRerenderKey((prev) => prev + 1);
          break;
        }
      }
    }
    // Update ref for next change
    prevConditionsRef.current = Array.isArray(currentConditions)
      ? currentConditions.map((c) => ({ ...(c as TTimesheeterRuleCondition) }))
      : [];
  };

  const handleAiGeneration = async () => {
    const query = aiForm.getFieldValue('ai_generation');
    if (!query) {
      messageApi.error(message('rules.ai.generate.placeholder'));
      return;
    }
    if (query.length > 250) {
      messageApi.error(message('form.invalid.maxlength', { max: 250 }));
      return;
    }
    setAiLoading(true);
    try {
      const displayName = tracker?.username || 'Current User';
      const res = await fetch('/api/ai-generate-rule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          user: displayName,
          orgId: tracker.type === 'yandex' ? tracker.orgId : undefined,
          isCloud: tracker.type === 'yandex' ? tracker.isCloud : undefined,
        }),
      });
      const { rule, error, raw, cost } = await res.json();
      const totalTokens = raw?.metadata?.usage?.total_tokens || 0;
      if (error || !rule) {
        // Try to extract error message from raw.answer if present
        let errorMsg = message('rules.ai.generate.error');
        if (raw?.answer) {
          try {
            const match = raw.answer.match(/```(?:json)?\n?([\s\S]*?)```/i);
            if (match && match[1]) {
              const parsed = JSON.parse(match[1]);
              if (parsed.message) errorMsg = parsed.message;
            }
          } catch (e) {
            console.error('Error parsing AI response:', e);
          }
        } else if (raw?.error) {
          errorMsg = raw.error;
        }
        // messageApi.error(errorMsg);
        messageApi.warning({
          duration: 10,
          content: message('rules.ai.generate.usage', { total_tokens: totalTokens, cost }),
        });
        throw new Error(errorMsg);
      }

      // Defensive: ensure conditions/actions are arrays
      const safeRule = {
        ...rule,
        conditions: Array.isArray(rule.conditions) ? rule.conditions : [],
        actions: Array.isArray(rule.actions) ? rule.actions : [],
      };

      setRules((prev) => [...prev, safeRule]);
      localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify([...rules, safeRule]));
      messageApi.success(message('rules.rule.saved', { name: rule.name }));
      aiForm.resetFields();
      messageApi.warning({
        duration: 10,
        content: message('rules.ai.generate.usage', { total_tokens: totalTokens, cost }),
      });
    } catch (e) {
      messageApi.error({ duration: 10, content: e instanceof Error ? e.message : message('rules.ai.generate.error') });
    } finally {
      setAiLoading(false);
    }
  };

  // Add share handler
  const handleShareWithTeam = async (rule: TRule, teamName: string) => {
    if (!self) {
      messageApi.error(message('rules.current.user.error'));
      return;
    }
    setShareLoading((rule.id as string) || '');
    try {
      let teams = userTeams;
      // If userTeams is empty, create a new team
      if (!teams || teams.length === 0) {
        const teamMembers = JSON.parse(localStorage.getItem('team') || '[]');
        const teamRes = await fetch('/api/team', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': self?.uid?.toString() || '',
            'x-user-email': self?.email || '',
            'x-user-display': self?.display ? encodeURIComponent(self.display) : '',
          },
          body: JSON.stringify({ members: teamMembers }),
        });
        if (!teamRes.ok) {
          const err = await teamRes.json();
          throw new Error(err.error || 'Failed to create team');
        }
        const teamData = await teamRes.json();
        teams = [{ id: teamData.teamId, name: teamData.name || '', members: teamMembers }];
        setUserTeams(teams); // update state so future shares work
      }
      // Now share to all teams
      const results = await Promise.all(
        teams.map(async (team) => {
          // Remove id if present to avoid unique constraint error
          const { id: _id, ...ruleWithoutId } = rule;
          const res = await fetch('/api/team-rules', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': self?.uid?.toString() || '',
              'x-user-email': self?.email || '',
            },
            body: JSON.stringify({ teamId: team.id, rule: ruleWithoutId }),
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Share failed');
          }
          return res.json();
        }),
      );
      // Merge all returned rules into sharedRules
      const newSharedRules = results.map((r) => r.rule).filter(Boolean);
      setSharedRules((prev) => [...prev, ...newSharedRules]);
      messageApi.success(message('rules.rule.shared', { name: rule.name, team: teamName }));
    } catch (e) {
      messageApi.error(e instanceof Error ? e.message : 'Share failed');
    } finally {
      setShareLoading(null);
    }
  };

  return (
    <div>
      {contextHolder}
      {/* TODO Add Ai generation of rules here */}
      <Divider orientation="left">
        {message('menu.rules.title.ai.generate')} <AIIcon style={{ position: 'relative', top: 2, marginLeft: 2 }} />
      </Divider>
      <Form layout="vertical" form={aiForm}>
        <Form.Item name="ai_generation" label={message('rules.ai.generate')}>
          <Input.TextArea maxLength={250} showCount placeholder={message('rules.ai.generate.placeholder')} />
        </Form.Item>
        {/* <AIIcon /> */}
        <Button type="primary" onClick={handleAiGeneration} loading={aiLoading}>
          {message('rules.ai.generate.submit')}
        </Button>
      </Form>
      <Divider orientation="left">{message('menu.rules.title.description')}</Divider>
      <Form
        form={form}
        layout="vertical"
        initialValues={{ conditions: [], actions: [] }}
        style={{ marginBottom: 50 }}
        onValuesChange={handleValuesChange}
      >
        <Form.Item
          name="name"
          label={message('rules.rule.name')}
          rules={[{ required: true, message: message('form.invalid.empty') }]}
        >
          <Input placeholder={message('rules.rule.name')} />
        </Form.Item>
        <Form.Item name="description" label={message('rules.rule.description')}>
          <Input.TextArea placeholder={message('rules.rule.description')} />
        </Form.Item>
        <Divider orientation="left">{message('rules.divider.when')}</Divider>
        <Form.List name="conditions">
          {(fields, { add, remove }) => (
            <>
              {fields.length === 0 && (
                <Button type="dashed" onClick={() => add({ key: uuidv4() })} icon={<PlusOutlined />}>
                  {message('rules.add.condition')}
                </Button>
              )}
              {fields.map((field, idx) => {
                const { key, ...fieldProps } = field;
                return (
                  <Space key={key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                    {idx > 0 && (
                      <Form.Item
                        {...fieldProps}
                        name={[field.name, 'logic']}
                        initialValue="AND"
                        style={{ minWidth: 80, marginRight: 8, marginBottom: 0 }}
                      >
                        <Select options={LOGIC_OPTIONS} style={{ width: 80 }} />
                      </Form.Item>
                    )}
                    <Form.Item
                      {...fieldProps}
                      name={[field.name, 'field']}
                      rules={[{ required: true, message: message('rules.field.required') }]}
                      style={{ minWidth: 180 }}
                    >
                      <Select options={CONDITION_FIELDS} placeholder={message('rules.field.placeholder')} />
                    </Form.Item>
                    <Form.Item
                      {...fieldProps}
                      name={[field.name, 'operator']}
                      rules={[{ required: true, message: message('rules.operator.required') }]}
                      style={{ minWidth: 130 }}
                    >
                      <Select
                        key={`${operatorRerenderKey}-${key}`}
                        options={[
                          ...(CONDITION_OPERATORS[
                            (form.getFieldValue([
                              'conditions',
                              field.name,
                              'field',
                            ]) as keyof typeof CONDITION_OPERATORS) || 'summary'
                          ] || []),
                        ]}
                        placeholder={message('rules.op.placeholder')}
                      />
                    </Form.Item>
                    <Form.Item
                      {...fieldProps}
                      name={[field.name, 'value']}
                      rules={[
                        { required: true, message: message('rules.value.required') },
                        ({ getFieldValue }) => ({
                          validator(_, value) {
                            const fieldVal = getFieldValue(['conditions', field.name, 'field']);
                            const operatorVal = getFieldValue(['conditions', field.name, 'operator']);
                            // If operator is >, <, or =, value must be a positive number
                            if (
                              (operatorVal === '>' || operatorVal === '<' || operatorVal === '=') &&
                              fieldVal === 'participants'
                            ) {
                              if (Number.isNaN(Number(value)) || Number(value) < 0) {
                                return Promise.reject(message('form.invalid.positive_number'));
                              }
                            }
                            // For duration, also check human readable format if not a number
                            if (fieldVal === 'duration' && value) {
                              if (!validateHumanReadableDuration(value)) {
                                return Promise.reject(message('form.invalid.format'));
                              }
                            }
                            return Promise.resolve();
                          },
                        }),
                      ]}
                    >
                      <Input placeholder={message('rules.value')} />
                    </Form.Item>
                    {fields.length > 1 && <MinusCircleOutlined onClick={() => remove(field.name)} />}
                  </Space>
                );
              })}
              {fields.length > 0 && (
                <Form.Item>
                  <Button type="dashed" onClick={() => add({ key: uuidv4() })} icon={<PlusOutlined />}>
                    {message('rules.add.condition')}
                  </Button>
                </Form.Item>
              )}
            </>
          )}
        </Form.List>
        <Divider orientation="left">{message('rules.divider.then')}</Divider>
        <Form.List name="actions">
          {(fields, { add, remove }) => (
            <>
              {fields.length === 0 && (
                <Button type="dashed" onClick={() => add({ key: uuidv4() })} icon={<PlusOutlined />}>
                  {message('rules.add.action')}
                </Button>
              )}
              {fields.map((field) => {
                const { key, ...fieldProps } = field;
                return (
                  <Space key={key} align="baseline" style={{ display: 'flex', marginBottom: 8 }}>
                    <Form.Item
                      {...fieldProps}
                      name={[field.name, 'type']}
                      rules={[{ required: true, message: message('rules.type.required') }]}
                      style={{ minWidth: 210 }}
                    >
                      <Select options={ACTION_TYPES} placeholder={message('rules.action.type')} />
                    </Form.Item>
                    <Form.Item
                      shouldUpdate={(prevValues, curValues) =>
                        prevValues.actions?.[field.name]?.type !== curValues.actions?.[field.name]?.type
                      }
                      noStyle
                    >
                      {() => {
                        const typeVal = form.getFieldValue(['actions', field.name, 'type']);
                        return (
                          <Form.Item
                            {...fieldProps}
                            name={[field.name, 'value']}
                            valuePropName={typeVal === 'skip' ? 'checked' : 'value'}
                            rules={[
                              { required: true, message: message('rules.value.required') },
                              ({ getFieldValue }) => ({
                                validator(_, value) {
                                  const typeValInner = getFieldValue(['actions', field.name, 'type']);
                                  if (typeValInner === 'set_duration' && value) {
                                    if (!validateHumanReadableDuration(value)) {
                                      return Promise.reject(message('form.invalid.format'));
                                    }
                                  }
                                  return Promise.resolve();
                                },
                              }),
                            ]}
                          >
                            {(() => {
                              if (typeVal === 'skip') {
                                return (
                                  <Switch
                                    checkedChildren={<CheckOutlined />}
                                    unCheckedChildren={<CloseOutlined />}
                                    onChange={(checked) =>
                                      form.setFieldsValue({
                                        actions: form
                                          .getFieldValue('actions')
                                          .map((a: { [key: string]: unknown }, i: number) =>
                                            i === field.name ? { ...a, value: checked ? 'true' : 'false' } : a,
                                          ),
                                      })
                                    }
                                  />
                                );
                              }
                              if (typeVal === 'set_task' && tracker.type === 'yandex') {
                                return (
                                  <YandexIssuesSearchConnected
                                    value={form.getFieldValue(['actions', field.name, 'value'])}
                                    onChange={(val) =>
                                      form.setFieldsValue({
                                        actions: form
                                          .getFieldValue('actions')
                                          .map((a: { [key: string]: unknown }, i: number) =>
                                            i === field.name ? { ...a, value: val } : a,
                                          ),
                                      })
                                    }
                                    name={`issueKey-rule-${key}`}
                                    onBlur={() => {}}
                                    onFocus={() => {}}
                                    placeholder={message('rules.value')}
                                    style={{ width: 380 }}
                                    tracker={tracker}
                                  />
                                );
                              }
                              return <Input placeholder={message('rules.value')} />;
                            })()}
                          </Form.Item>
                        );
                      }}
                    </Form.Item>
                    {fields.length > 1 && <MinusCircleOutlined onClick={() => remove(field.name)} />}
                  </Space>
                );
              })}
              {fields.length > 0 && (
                <Form.Item>
                  <Button type="dashed" onClick={() => add({ key: uuidv4() })} icon={<PlusOutlined />}>
                    {message('rules.add.action')}
                  </Button>
                </Form.Item>
              )}
            </>
          )}
        </Form.List>
        <Flex gap="middle" justify="space-evenly" style={{ marginTop: 16 }}>
          <Button type="primary" onClick={handleSave}>
            {message('rules.rule.save')}
          </Button>
          <Button onClick={handleCancel}>{message('rules.rule.cancel')}</Button>
        </Flex>
      </Form>
      <Divider orientation="left">{message('rules.saved_rules')}</Divider>
      {allRules.length === 0 && <Typography.Text type="secondary">{message('rules.no_rules_yet')}</Typography.Text>}
      {allRules.length > 0 && (
        <Collapse
          accordion
          items={[...allRules].map((rule) => ({
            key: rule.id,
            label: (
              <span>
                <Typography.Text strong>{rule.name}</Typography.Text>
                {(rule as TRule).teamId && teamNameMap[(rule as TRule).teamId] && (
                  <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
                    [{teamNameMap[(rule as TRule).teamId]}]
                  </Typography.Text>
                )}
                {rule.description && (
                  <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
                    {rule.description}
                  </Typography.Text>
                )}
              </span>
            ),
            children: (
              <div
                style={{
                  border: sharedRules.some((r) => r.id === rule.id) ? '2px solid #1890ff' : undefined,
                  background: (() => {
                    if (sharedRules.some((r) => r.id === rule.id)) {
                      return isDarkMode ? '#2e2e2e' : '#e6f7ff';
                    }
                    return undefined;
                  })(),
                  borderRadius: 6,
                  padding: 8,
                }}
              >
                <div style={{ margin: '8px 0' }}>
                  <b>{message('rules.divider.when')}:</b>{' '}
                  {(Array.isArray(rule.conditions) ? rule.conditions : [])
                    .map((c, i, arr) => {
                      const condStr = `${c.field} ${c.operator} "${c.value}"`;
                      if (i === 0) return condStr;
                      const prevLogic = arr[i].logic || 'AND';
                      return ` ${prevLogic} ${condStr}`;
                    })
                    .join('')}
                </div>
                <div style={{ margin: '8px 0' }}>
                  <b>{message('rules.divider.then')}:</b>{' '}
                  {(Array.isArray(rule.actions) ? rule.actions : []).map((a) => `${a.type} = ${a.value}`).join(' AND ')}
                </div>
                <Space>
                  {/* Only show share button for personal rules (not already shared) */}
                  {(() => {
                    if (sharedRules.some((r) => r.id === rule.id)) {
                      return null;
                    }
                    let shareControls;
                    if (userTeams.length > 1) {
                      const handleShare = () => {
                        if (selectedShareTeam) handleShareWithTeam(rule, teamNameMap[selectedShareTeam]);
                      };
                      shareControls = (
                        <>
                          <ShareTeamSelect
                            userTeams={userTeams}
                            selectedShareTeam={selectedShareTeam}
                            onChange={setSelectedShareTeam}
                            message={message}
                          />
                          <ShareButton
                            loading={shareLoading === rule.id}
                            onClick={handleShare}
                            disabled={!selectedShareTeam}
                            message={message}
                          />
                        </>
                      );
                    } else {
                      const handleShare = () => handleShareWithTeam(rule, teamNameMap[(rule as TRule).teamId]);
                      shareControls = (
                        <ShareButton loading={shareLoading === rule.id} onClick={handleShare} message={message} />
                      );
                    }
                    return shareControls;
                  })()}
                  <Button size="small" onClick={() => handleEdit(rule)}>
                    {message('rules.rule.edit')}
                  </Button>
                  {sharedRules.some((r) => r.id === rule.id) ? (
                    <Popconfirm
                      title={message('rules.rule.delete.confirm.shared')}
                      description={message('rules.rule.delete.confirm.shared.description')}
                      onConfirm={() => handleDelete(rule.id, (rule as TRule).teamId)}
                      okText={message('share.yes.action')}
                      cancelText={message('share.cancel.action')}
                    >
                      <Button size="small" danger>
                        {message('rules.rule.delete')}
                      </Button>
                    </Popconfirm>
                  ) : (
                    <Button size="small" danger onClick={() => handleDelete(rule.id)}>
                      {message('rules.rule.delete')}
                    </Button>
                  )}
                </Space>
              </div>
            ),
          }))}
        />
      )}
    </div>
  );
};
