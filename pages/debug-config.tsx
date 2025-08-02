import React, { useEffect, useState } from 'react';
import { Card, Typography, Space, Alert, Button } from 'antd';
import { useRuntimeConfig } from 'shared/lib/useRuntimeConfig';
import { getRuntimeConfig } from 'shared/lib/getRuntimeConfig';

const { Title, Text, Paragraph } = Typography;

interface EnvDebugData {
  envFileContent: string;
  parsedVariables: Record<string, string>;
  processEnv: Record<string, string>;
}

export default function DebugConfig() {
  const runtimeConfig = useRuntimeConfig();
  const directConfig = getRuntimeConfig();
  const [envDebugData, setEnvDebugData] = useState<EnvDebugData | null>(null);
  const [showEnvFile, setShowEnvFile] = useState(false);

  useEffect(() => {
    // Try to fetch environment debug data
    fetch('/api/debug-env')
      .then(response => response.json())
      .then(data => setEnvDebugData(data))
      .catch(() => setEnvDebugData(null));
  }, []);

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <Title level={2}>Runtime Configuration Debug</Title>
      
      <Alert
        message="Environment Variables Debug"
        description="This page shows how environment variables are loaded in your application. Check the browser console for additional logging."
        type="info"
        showIcon
        style={{ marginBottom: '20px' }}
      />
      
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
            <div>
              <Text strong>NEXT_PUBLIC_COMPANY_OPENREPLAY_KEY:</Text> {process.env.NEXT_PUBLIC_COMPANY_OPENREPLAY_KEY || 'undefined'}
            </div>
            <div>
              <Text strong>NEXT_PUBLIC_COMPANY_OPENREPLAY_URL:</Text> {process.env.NEXT_PUBLIC_COMPANY_OPENREPLAY_URL || 'undefined'}
            </div>
            <div>
              <Text strong>NEXT_PUBLIC_COMPANY_POWERBI_URL:</Text> {process.env.NEXT_PUBLIC_COMPANY_POWERBI_URL || 'undefined'}
            </div>
            <div>
              <Text strong>NEXT_PUBLIC_SUPPORT_URL:</Text> {process.env.NEXT_PUBLIC_SUPPORT_URL || 'undefined'}
            </div>
            <div>
              <Text strong>NEXT_PUBLIC_RESTORE_PASSWORD_URL:</Text> {process.env.NEXT_PUBLIC_RESTORE_PASSWORD_URL || 'undefined'}
            </div>
          </Space>
        </Card>

        {envDebugData && (
          <Card title="Server-Side Environment Data" size="small">
            <Space direction="vertical">
              <div>
                <Text strong>From .env file:</Text>
              </div>
              <div>
                <Text strong>COMPANY_OPENREPLAY_KEY:</Text> {envDebugData.parsedVariables.COMPANY_OPENREPLAY_KEY || 'undefined'}
              </div>
              <div>
                <Text strong>COMPANY_OPENREPLAY_URL:</Text> {envDebugData.parsedVariables.COMPANY_OPENREPLAY_URL || 'undefined'}
              </div>
              <div>
                <Text strong>COMPANY_POWERBI_URL:</Text> {envDebugData.parsedVariables.COMPANY_POWERBI_URL || 'undefined'}
              </div>
              <div>
                <Text strong>SUPPORT_URL:</Text> {envDebugData.parsedVariables.SUPPORT_URL || 'undefined'}
              </div>
              <div>
                <Text strong>RESTORE_PASSWORD_URL:</Text> {envDebugData.parsedVariables.RESTORE_PASSWORD_URL || 'undefined'}
              </div>
              <div>
                <Text strong>From process.env:</Text>
              </div>
              <div>
                <Text strong>COMPANY_OPENREPLAY_KEY:</Text> {envDebugData.processEnv.COMPANY_OPENREPLAY_KEY || 'undefined'}
              </div>
              <div>
                <Text strong>COMPANY_OPENREPLAY_URL:</Text> {envDebugData.processEnv.COMPANY_OPENREPLAY_URL || 'undefined'}
              </div>
              <div>
                <Text strong>COMPANY_POWERBI_URL:</Text> {envDebugData.processEnv.COMPANY_POWERBI_URL || 'undefined'}
              </div>
              <div>
                <Text strong>SUPPORT_URL:</Text> {envDebugData.processEnv.SUPPORT_URL || 'undefined'}
              </div>
              <div>
                <Text strong>RESTORE_PASSWORD_URL:</Text> {envDebugData.processEnv.RESTORE_PASSWORD_URL || 'undefined'}
              </div>
            </Space>
          </Card>
        )}

        {envDebugData && (
          <Card 
            title="Generated .env File Content" 
            size="small"
            extra={
              <Button 
                size="small" 
                onClick={() => setShowEnvFile(!showEnvFile)}
              >
                {showEnvFile ? 'Hide' : 'Show'} .env Content
              </Button>
            }
          >
            {showEnvFile && (
              <div style={{ backgroundColor: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
                <pre style={{ margin: 0, fontSize: '12px', whiteSpace: 'pre-wrap' }}>
                  {envDebugData.envFileContent || 'No .env file content available'}
                </pre>
              </div>
            )}
          </Card>
        )}

        <Card title="Next.js Config" size="small">
          <Paragraph>
            <Text code>next.config.js</Text> is configured to use <Text code>env</Text> for these environment variables.
            The <Text code>dotenv</Text> package loads the <Text code>.env</Text> file created by the entrypoint script.
          </Paragraph>
        </Card>
      </Space>
    </div>
  );
} 