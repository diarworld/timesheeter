import React from 'react';
import { Card, Typography, Space, Divider } from 'antd';
import { useRuntimeConfig } from 'shared/lib/useRuntimeConfig';
import { getRuntimeConfig } from 'shared/lib/getRuntimeConfig';

const { Title, Text, Paragraph } = Typography;

export default function DebugConfig() {
  const runtimeConfig = useRuntimeConfig();
  const directConfig = getRuntimeConfig();

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <Title level={2}>Runtime Configuration Debug</Title>
      
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card title="Via useRuntimeConfig Hook" size="small">
          <Space direction="vertical">
            <div>
              <Text strong>OpenReplay Key:</Text> {runtimeConfig.openReplayKey || 'undefined'}
            </div>
            <div>
              <Text strong>OpenReplay URL:</Text> {runtimeConfig.openReplayUrl || 'undefined'}
            </div>
            <div>
              <Text strong>PowerBI URL:</Text> {runtimeConfig.powerBiUrl || 'undefined'}
            </div>
            <div>
              <Text strong>Support URL:</Text> {runtimeConfig.supportUrl || 'undefined'}
            </div>
            <div>
              <Text strong>Restore Password URL:</Text> {runtimeConfig.restorePasswordUrl || 'undefined'}
            </div>
          </Space>
        </Card>

        <Card title="Via getRuntimeConfig Function" size="small">
          <Space direction="vertical">
            <div>
              <Text strong>OpenReplay Key:</Text> {directConfig.COMPANY_OPENREPLAY_KEY || 'undefined'}
            </div>
            <div>
              <Text strong>OpenReplay URL:</Text> {directConfig.COMPANY_OPENREPLAY_URL || 'undefined'}
            </div>
            <div>
              <Text strong>PowerBI URL:</Text> {directConfig.COMPANY_POWERBI_URL || 'undefined'}
            </div>
            <div>
              <Text strong>Support URL:</Text> {directConfig.SUPPORT_URL || 'undefined'}
            </div>
            <div>
              <Text strong>Restore Password URL:</Text> {directConfig.RESTORE_PASSWORD_URL || 'undefined'}
            </div>
          </Space>
        </Card>

        <Card title="Environment Variables (process.env)" size="small">
          <Space direction="vertical">
            <div>
              <Text strong>NODE_ENV:</Text> {process.env.NODE_ENV}
            </div>
            <div>
              <Text strong>COMPANY_OPENREPLAY_KEY:</Text> {process.env.COMPANY_OPENREPLAY_KEY || 'undefined'}
            </div>
            <div>
              <Text strong>COMPANY_OPENREPLAY_URL:</Text> {process.env.COMPANY_OPENREPLAY_URL || 'undefined'}
            </div>
            <div>
              <Text strong>COMPANY_POWERBI_URL:</Text> {process.env.COMPANY_POWERBI_URL || 'undefined'}
            </div>
            <div>
              <Text strong>SUPPORT_URL:</Text> {process.env.SUPPORT_URL || 'undefined'}
            </div>
            <div>
              <Text strong>RESTORE_PASSWORD_URL:</Text> {process.env.RESTORE_PASSWORD_URL || 'undefined'}
            </div>
          </Space>
        </Card>

        <Card title="Next.js Config" size="small">
          <Paragraph>
            <Text code>next.config.js</Text> is configured to use <Text code>publicRuntimeConfig</Text> for these environment variables.
          </Paragraph>
        </Card>
      </Space>
    </div>
  );
} 