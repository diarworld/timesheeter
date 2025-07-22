import React, { FC } from 'react';
import './Layout.scss';
import { Message } from 'entities/locale/ui/Message';
import { GithubOutlined, QuestionCircleOutlined, WechatWorkOutlined } from '@ant-design/icons';
import { Flex, Button } from 'antd';
import { Text } from 'components';
import clsx from 'clsx';

type TProps = {
  head?: React.ReactNode;
  children: React.ReactNode;
  isDarkMode: boolean;
};

export const Layout: FC<TProps> = ({ children, head, isDarkMode }) => (
  <div className="Layout">
    {head}
    <main className="Layout__Main">{children}</main>

    <footer
      className={clsx('Layout__Footer', { Layout__Footer_dark: isDarkMode }, { Layout__Footer_light: !isDarkMode })}
    >
      <Flex gap="small" justify="center" align="center">
        <Text fs={13} fw={700} lh={14} style={{ alignItems: 'center', display: 'flex' }}>
          <Message id="footer.copyright" values={{ year: new Date().getFullYear() }} />
        </Text>
        <Button
          type="link"
          icon={<GithubOutlined />}
          target="_blank"
          href="https://github.com/diarworld/timesheeter"
          style={{ padding: 0 }}
        >
          GitHub
        </Button>
        <Button
          type="link"
          icon={<QuestionCircleOutlined />}
          target="_blank"
          href="https://diarworld.github.io/timesheeter/user_doc"
          style={{ padding: 0 }}
        >
          Docs
        </Button>
        <Button
          type="link"
          icon={<WechatWorkOutlined />}
          target="_blank"
          href={process.env.SUPPORT_URL}
          style={{ padding: 0 }}
        >
          Support
        </Button>
      </Flex>
    </footer>
  </div>
);
