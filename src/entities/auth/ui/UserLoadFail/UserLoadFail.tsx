import { Button, Row } from 'antd';
import { Message } from 'entities/locale/ui/Message';
import { DeleteOutlined } from '@ant-design/icons';
import Cookies from 'js-cookie';

function getAllUpperDomains(hostname: string) {
  const parts = hostname.split('.');
  const domains = [];
  for (let i = 0; i < parts.length - 1; i += 1) {
    domains.push(`.${parts.slice(i).join('.')}`);
  }
  return domains;
}

function deleteAllCookiesForAllDomains() {
  const currentDomain = window.location.hostname;
  const allDomains = getAllUpperDomains(currentDomain);
  const allCookies = Cookies.get();
  Object.keys(allCookies).forEach((cookieName) => {
    Cookies.remove(cookieName, { path: '/' });
    allDomains.forEach((domain) => {
      Cookies.remove(cookieName, { path: '/', domain });
    });
  });
}

const handleClearCookies = () => {
  deleteAllCookiesForAllDomains();
  window.location.reload();
};

export const UserLoadFail = () => (
  <>
    {' '}
    <Row>
      <div style={{ padding: '4px 15px' }}>
        <Message id="user.fetch.error" />
      </div>
    </Row>
    <Button type="link" icon={<DeleteOutlined />} onClick={handleClearCookies}>
      <span>
        <Message id="user.clear.cookies" />
      </span>
    </Button>
  </>
);
