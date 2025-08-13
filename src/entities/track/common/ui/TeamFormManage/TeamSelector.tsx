import React, { useEffect } from 'react';
import { Select, Button, Space, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { TTeam } from './types';
import { Message } from 'entities/locale/ui/Message';
import { useMessage } from 'entities/locale/lib/hooks';

const { Text } = Typography;

interface ITeamSelectorProps {
  teams: TTeam[];
  selectedTeamId: string | null;
  currentUserId: string; // Add current user ID to check creator permissions
  onTeamSelect: (teamId: string) => void;
  onTeamCreate: () => void;
  onTeamDelete: (teamId: string) => void;
  onTeamRename: (team: TTeam) => void; // Add rename handler
}

export const TeamSelector: React.FC<ITeamSelectorProps> = ({
  teams,
  selectedTeamId,
  currentUserId,
  onTeamSelect,
  onTeamCreate,
  onTeamDelete,
  onTeamRename,
}) => {
  const message = useMessage();

  // Set selectedTeamId to first team on initial load if no team is selected
  useEffect(() => {
    if (teams.length > 0 && !selectedTeamId) {
      onTeamSelect(teams[0].id);
    }
  }, [teams, selectedTeamId, onTeamSelect]);

  const teamOptions = teams.map((team) => ({
    value: team.id,
    label: (
      <Space>
        <Text>{team.name}</Text>
        {team.creatorId === currentUserId && (
          <Text type="success" style={{ fontSize: '12px' }}>
            (Own)
          </Text>
        )}
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {team.members.length} members
        </Text>
      </Space>
    ),
    // Add a searchable text field for filtering
    searchText: team.name,
  }));

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <Select
          style={{ flex: 1, minWidth: 450 }}
          placeholder={message('manage.team.select.placeholder') || 'Select a team'}
          value={selectedTeamId}
          onChange={onTeamSelect}
          options={teamOptions}
          showSearch
          filterOption={(input, option) => {
            // Use the searchText field for filtering
            return option?.searchText?.toLowerCase().includes(input.toLowerCase()) || false;
          }}
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={onTeamCreate}>
          <Message id="manage.team.create" />
        </Button>
      </Space>

      {selectedTeamId && (
        <Space>
          {/* Only show delete button for teams where user is creator */}
          {teams.find((t) => t.id === selectedTeamId)?.creatorId === currentUserId && (
            <>
              <Button icon={<EditOutlined />} onClick={() => onTeamRename(teams.find((t) => t.id === selectedTeamId)!)}>
                <Message id="manage.team.rename" />
              </Button>
              <Button danger icon={<DeleteOutlined />} onClick={() => onTeamDelete(selectedTeamId)}>
                <Message id="manage.team.delete" />
              </Button>
            </>
          )}
        </Space>
      )}
    </Space>
  );
};
