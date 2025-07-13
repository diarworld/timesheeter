import { Button, Form, Input, Flex, Select, Space, Divider, Typography, message as antdMessage, Switch } from 'antd';
import { PlusOutlined, MinusCircleOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useMessage } from 'entities/locale/lib/hooks';
import React, { FC, useEffect, useState, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { TCondition, TAction, TRule } from './types';
import { validateHumanReadableDuration } from '../../lib/validate-human-readable-duration';
import { YandexIssuesSearchConnected } from 'entities/track/yandex/ui/YandexIssuesSearchConnected/YandexIssuesSearchConnected';
import { TTrackerConfig } from 'entities/tracker/model/types';
import { isYandexTrackerCfg } from 'entities/tracker/model/types';

export const RulesManage: FC<{ tracker: TTrackerConfig }> = ({ tracker }) => {
  const message = useMessage();
  const [form] = Form.useForm<TRule>();
  const [rules, setRules] = useState<TRule[]>([]);
  const [editingRule, setEditingRule] = useState<TRule | null>(null);
  const [messageApi, contextHolder] = antdMessage.useMessage();

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
    ],
    duration: [
      { value: '>', label: message('rules.op.gt') },
      { value: '<', label: message('rules.op.lt') },
      { value: '=', label: message('rules.op.eq') },
    ],
    organizer: [
      { value: 'is', label: message('rules.op.is') },
      { value: 'is_not', label: message('rules.op.is_not') },
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
        const defaultRules = [{
          id: uuidv4(),
          name: 'Отпуск',
          description: 'Правило по-умолчанию для отпуска',
          conditions: [
            { field: 'summary', operator: 'equals', value: 'Отпуск', logic: 'AND' as 'AND' }
          ],
          actions: [
            { type: 'set_task', value: 'PM-2' }
          ]
        },
        {
          id: uuidv4(),
          name: 'Обучение',
          description: 'Правило по-умолчанию для прохождения и проведения обучения',
          conditions: [
            { field: 'summary', operator: 'contains', value: 'DE Talks', logic: 'OR' as 'OR' },
            { field: 'summary', operator: 'contains', value: 'BI Talks', logic: 'OR' as 'OR' },
            { field: 'summary', operator: 'contains', value: 'Meetup', logic: 'OR' as 'OR' },
            { field: 'summary', operator: 'contains', value: 'Обучение', logic: 'OR' as 'OR' },
            { field: 'summary', operator: 'contains', value: 'Тренинг', logic: 'OR' as 'OR' },
            { field: 'summary', operator: 'contains', value: 'Training', logic: 'OR' as 'OR' },
            { field: 'summary', operator: 'contains', value: 'Community', logic: 'OR' as 'OR' },
            { field: 'summary', operator: 'contains', value: 'Meeting', logic: 'OR' as 'OR' },
          ],
          actions: [
            { type: 'set_task', value: 'PM-3' }
          ]
        },
        {
          id: uuidv4(),
          name: 'Общие встречи',
          description: 'Правило по-умолчанию для общих встреч',
          conditions: [
            { field: 'participants', operator: '>', value: '100', logic: 'OR' as 'OR' },
            { field: 'participants', operator: 'includes', value: 'ml.lmtech@lemanapro.ru', logic: 'OR' as 'OR' },
            { field: 'participants', operator: 'includes', value: 'ml.all.co@lemanapro.ru', logic: 'OR' as 'OR' },
            { field: 'participants', operator: 'includes', value: 'ml.all.dir@lemanapro.ru', logic: 'OR' as 'OR' },
            { field: 'participants', operator: 'includes', value: 'allrd@lemanapro.ru', logic: 'OR' as 'OR' },
            { field: 'participants', operator: 'includes', value: 'ml.co@lemanapro.ru', logic: 'OR' as 'OR' },
            { field: 'participants', operator: 'includes', value: 'ml.com@lemanapro.ru', logic: 'OR' as 'OR' },
            { field: 'participants', operator: 'includes', value: 'Products@lemanapro.ru', logic: 'OR' as 'OR' },
            { field: 'participants', operator: 'includes', value: 'ml.DevCom-Users@lemanapro.ru', logic: 'OR' as 'OR' },
            { field: 'summary', operator: 'contains', value: 'Coffee talk', logic: 'OR' as 'OR' },
            { field: 'summary', operator: 'contains', value: 'Доклады и Докладчики', logic: 'OR' as 'OR' },
            { field: 'summary', operator: 'contains', value: 'Domain Review', logic: 'OR' as 'OR' },
            { field: 'summary', operator: 'contains', value: 'ТДК', logic: 'OR' as 'OR' },
            { field: 'summary', operator: 'contains', value: 'TDK', logic: 'OR' as 'OR' }
          ],
          actions: [
            { type: 'set_task', value: 'PM-4' }
          ]
        },
        {
          id: uuidv4(),
          name: 'Работа с людьми',
          description: 'Правило по-умолчанию для работы с людьми (собеседования, интервью, БОРДы, Биланы)',
          conditions: [
            { field: 'summary', operator: 'contains', value: 'МежБОРД', logic: 'OR' as 'OR' },
            { field: 'summary', operator: 'contains', value: 'БОРД', logic: 'OR' as 'OR' },
            { field: 'summary', operator: 'contains', value: 'Билан', logic: 'OR' as 'OR' },
            { field: 'summary', operator: 'contains', value: 'МежБилан', logic: 'OR' as 'OR' },
            { field: 'summary', operator: 'contains', value: 'Собес', logic: 'OR' as 'OR' },
            { field: 'summary', operator: 'contains', value: 'Interview', logic: 'OR' as 'OR' },
            { field: 'summary', operator: 'contains', value: 'Интервью', logic: 'OR' as 'OR' },
          ],
          actions: [
            { type: 'set_task', value: 'PM-11' }
          ]
        },
        {
          id: uuidv4(),
          name: 'Округление',
          description: 'Правило по-умолчанию для округления длительности встречи до 30 мин',
          conditions: [
            { field: 'duration', operator: '<', value: '30м', logic: 'AND' as 'AND' },
          ],
          actions: [
            { type: 'set_duration', value: '30м' }
          ]
        },
        {
          id: uuidv4(),
          name: 'Округление',
          description: 'Правило по-умолчанию для округления длительности встречи до 1 часа',
          conditions: [
            { field: 'duration', operator: '<', value: '1ч', logic: 'AND' as 'AND' },
          ],
          actions: [
            { type: 'set_duration', value: '1ч' }
          ]
        },
        {
          id: uuidv4(),
          name: 'Пропуск',
          description: 'Правило по-умолчанию для пропуска встреч без участников',
          conditions: [
            { field: 'participants', operator: '<', value: '1', logic: 'AND' as 'AND' },
            { field: 'summary', operator: 'not_contains', value: 'Отпуск', logic: 'AND' as 'AND' }
          ],
          actions: [
            { type: 'skip', value: 'true' }
          ]
        },
        ];
        setRules(defaultRules);
        localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(defaultRules));
      }
    } catch {}
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
      const actionTypes = values.actions.map(a => a.type);
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
      };
      let newRules;
      if (editingRule) {
        newRules = rules.map(r => (r.id === editingRule.id ? rule : r));
      } else {
        newRules = [...rules, rule];
      }
      setRules(newRules);
      localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(newRules));
      setEditingRule(null);
      form.resetFields();
      messageApi.success(message('rules.rule.saved', { name: rule.name }));
    } catch (err) {
      console.log('Validation error', JSON.stringify(err, null, 2));
    }
  };

  const handleCancel = () => {
    setEditingRule(null);
    form.resetFields();
  };

  const handleEdit = (rule: TRule) => {
    setEditingRule(rule);
  };

  const handleDelete = (id: string) => {
    const newRules = rules.filter(r => r.id !== id);
    setRules(newRules);
    localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(newRules));
    messageApi.success(message('rules.rule.deleted', { name: rules.find(r => r.id === id)?.name }));
    if (editingRule?.id === id) {
      setEditingRule(null);
      form.resetFields();
    }
  };

  // Add a state to force re-render of operator selects
  const [operatorRerenderKey, setOperatorRerenderKey] = useState(0);

  // Track previous conditions to detect field changes
  const prevConditionsRef = useRef<any[]>([]);

  const handleValuesChange = (changed: any, all: any) => {
    const prevConditions = prevConditionsRef.current;
    const currentConditions = all.conditions || [];

    // Only run if conditions exist and lengths match (not on add/remove)
    if (
      Array.isArray(prevConditions) &&
      Array.isArray(currentConditions) &&
      prevConditions.length === currentConditions.length
    ) {
      for (let i = 0; i < currentConditions.length; i++) {
        if (
          prevConditions[i] &&
          currentConditions[i] &&
          prevConditions[i].field !== currentConditions[i].field
        ) {
          // Reset operator for this condition
          const newConditions = [...currentConditions];
          newConditions[i] = { ...newConditions[i], operator: undefined };
          form.setFieldsValue({ conditions: newConditions });
          setOperatorRerenderKey(prev => prev + 1);
          break;
        }
      }
    }
    // Update ref for next change
    prevConditionsRef.current = currentConditions.map((c: unknown) => ({ ...(c as object) }));
  };

  return (
    <div>
      {contextHolder}
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
                <Button type="dashed" onClick={() => add({ key: uuidv4() })} icon={<PlusOutlined />}>{message('rules.add.condition')}</Button>
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
                        key={operatorRerenderKey + '-' + key}
                        options={
                          [
                            ...(
                              CONDITION_OPERATORS[
                                (form.getFieldValue(['conditions', field.name, 'field']) as keyof typeof CONDITION_OPERATORS) || 'summary'
                              ] || []
                            )
                          ]
                        }
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
                    {fields.length > 1 && (
                      <MinusCircleOutlined onClick={() => remove(field.name)} />
                    )}
                  </Space>
                );
              })}
              {fields.length > 0 && (
                <Form.Item>
                  <Button type="dashed" onClick={() => add({ key: uuidv4() })} icon={<PlusOutlined />}>{message('rules.add.condition')}</Button>
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
                <Button type="dashed" onClick={() => add({ key: uuidv4() })} icon={<PlusOutlined />}>{message('rules.add.action')}</Button>
              )}
              {fields.map((field, idx) => {
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
                                  const typeVal = getFieldValue(['actions', field.name, 'type']);
                                  if (typeVal === 'set_duration' && value) {
                                    if (!validateHumanReadableDuration(value)) {
                                      return Promise.reject(message('form.invalid.format'));
                                    }
                                  }
                                  return Promise.resolve();
                                },
                              }),
                            ]}
                          >
                            {typeVal === 'skip' ? (
                              <Switch
                                checkedChildren={<CheckOutlined />}
                                unCheckedChildren={<CloseOutlined />}
                                onChange={checked =>
                                  form.setFieldsValue({
                                    actions: form.getFieldValue('actions').map((a: any, i: number) =>
                                      i === field.name ? { ...a, value: checked ? 'true' : 'false' } : a
                                    ),
                                  })
                                }
                              />
                            ) : typeVal === 'set_task' && isYandexTrackerCfg(tracker) ? (
                              <YandexIssuesSearchConnected
                                value={form.getFieldValue(['actions', field.name, 'value'])}
                                onChange={val =>
                                  form.setFieldsValue({
                                    actions: form.getFieldValue('actions').map((a: any, i: number) =>
                                      i === field.name ? { ...a, value: val } : a
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
                            ) : (
                              <Input placeholder={message('rules.value')} />
                            )}
                          </Form.Item>
                        );
                      }}
                    </Form.Item>
                    {fields.length > 1 && (
                      <MinusCircleOutlined onClick={() => remove(field.name)} />
                    )}
                  </Space>
                );
              })}
              {fields.length > 0 && (
                <Form.Item>
                  <Button type="dashed" onClick={() => add({ key: uuidv4() })} icon={<PlusOutlined />}>{message('rules.add.action')}</Button>
                </Form.Item>
              )}
            </>
          )}
        </Form.List>
        <Flex gap="middle" justify="space-evenly" style={{ marginTop: 16 }}>
          <Button type="primary" onClick={handleSave}>
            {message('rules.rule.create')}
          </Button>
          <Button onClick={handleCancel}>{message('rules.rule.cancel')}</Button>
        </Flex>
      </Form>
      <Divider orientation="left">{message('rules.saved_rules')}</Divider>
      {rules.length === 0 && <Typography.Text type="secondary">{message('rules.no_rules_yet')}</Typography.Text>}
      {rules.map(rule => (
        <div key={rule.id} style={{ border: '1px solid #eee', borderRadius: 6, padding: 12, marginBottom: 12 }}>
          <Typography.Text strong>{rule.name}</Typography.Text>
          <Typography.Paragraph type="secondary" style={{ margin: 0 }}>{rule.description}</Typography.Paragraph>
          <div style={{ margin: '8px 0' }}>
            <b>{message('rules.divider.when')}:</b> {rule.conditions.map((c, i) => {
              const condStr = `${c.field} ${c.operator} "${c.value}"`;
              if (i === 0) return condStr;
              const prevLogic = rule.conditions[i].logic || 'AND';
              return ` ${prevLogic} ${condStr}`;
            }).join('')}
          </div>
          <div style={{ margin: '8px 0' }}>
            <b>{message('rules.divider.then')}:</b> {rule.actions.map(a => `${a.type} = ${a.value}`).join(' AND ')}
          </div>
          <Space>
            <Button size="small" onClick={() => handleEdit(rule)}>{message('rules.rule.edit')}</Button>
            <Button size="small" danger onClick={() => handleDelete(rule.id)}>{message('rules.rule.delete')}</Button>
          </Space>
        </div>
      ))}
    </div>
  );
};
