import React, { FC } from 'react';
import './Layout.scss';
import { Message } from 'entities/locale/ui/Message';
import { GithubOutlined } from '@ant-design/icons';
import { Row, Flex, Button } from 'antd';
import { Text } from 'components';


type TProps = {
  head?: React.ReactNode;
  children: React.ReactNode;
};

export const Layout: FC<TProps> = ({ children, head }) => (
  <div className="Layout">
    {head}
    <main className="Layout__Main">{children}</main>
  
  <footer className="Layout__Footer">
      <Flex gap="middle" justify="center" align="center" vertical>
        <Row>
          
          <Text fs={13} fw={700} lh={14} style={{ height: '32px', alignItems: 'center', display: 'flex' }}>
            <Message id="footer.copyright" />
          </Text>
          {/* <a href="https://github.com/diarworld/timesheeter" target="_blank" rel="nofollow noopener noreferrer"> <GithubOutlined /> GitHub</a> */}
          <Button 
          type="link"
          icon={<GithubOutlined />}
          target="_blank"
          href="https://github.com/diarworld/timesheeter"
          // onClick={}
          >GitHub</Button>
        </Row>
      </Flex>
    </footer>
  </div>
);
