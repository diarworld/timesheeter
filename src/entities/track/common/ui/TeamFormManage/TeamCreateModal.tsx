import React, { useState } from 'react';
import { Modal, Form, Input, Button, Space, Typography } from 'antd';
import { TYandexUser } from 'entities/user/yandex/model/types';
import { TTeamFormManageCreate } from './types';
import { Message } from 'entities/locale/ui/Message';
import { useMessage } from 'entities/locale/lib/hooks';

const { Text } = Typography;

interface ITeamCreateModalProps {
  visible: boolean;
  onCancel: () => void;
  onSubmit: (teamData: TTeamFormManageCreate) => void;
  loading?: boolean;
  initialMembers?: TYandexUser[];
}

export const TeamCreateModal: React.FC<ITeamCreateModalProps> = ({
  visible,
  onCancel,
  onSubmit,
  loading = false,
  initialMembers = [],
}) => {
  const [form] = Form.useForm();
  const messageHook = useMessage();
  const [teamName, setTeamName] = useState('');

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      const teamData: TTeamFormManageCreate = {
        name: values.name,
        members: initialMembers,
      };
      onSubmit(teamData);
      form.resetFields();
      setTeamName('');
    } catch (error) {
      console.error('Form validation failed:', error);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setTeamName('');
    onCancel();
  };

  // Check if team creation is allowed
  const canCreateTeam = teamName.trim();

  return (
    <Modal
      title={messageHook('manage.team.create.empty.title') || 'Create New Empty Team'}
      open={visible}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          <Message id="common.cancel" />
        </Button>,
        <Button key="submit" type="primary" loading={loading} onClick={handleSubmit} disabled={!canCreateTeam}>
          <Message id="manage.team.create" />
        </Button>,
      ]}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label={messageHook('manage.team.name.label') || 'Team Name'}
          rules={[
            { required: true, message: messageHook('manage.team.name.required') || 'Team name is required' },
            { min: 2, message: messageHook('manage.team.name.min') || 'Team name must be at least 2 characters' },
          ]}
        >
          <Input
            placeholder={messageHook('manage.team.name.placeholder') || 'Enter team name'}
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
          />
        </Form.Item>

        <Form.Item label={messageHook('manage.team.members.label') || 'Team Members'}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text type="secondary">
              {messageHook('manage.team.members.creator.info') ||
                'You will be the creator and first member of this team.'}
            </Text>
            <Text type="secondary" italic>
              {messageHook('manage.team.members.add.later') ||
                'You can add more members later using the team management tools.'}
            </Text>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};
