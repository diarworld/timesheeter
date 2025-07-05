import { Button, Row, Space } from 'antd';
import { Message } from 'entities/locale/ui/Message';
import { DeleteOutlined } from '@ant-design/icons';
import Cookies from 'js-cookie';

const handleClearCookies = () => {
    const allCookies = Cookies.get(); 
    for (const cookieName in allCookies) {
        Cookies.remove(cookieName);
    }
    window.location.reload();
};

export const UserLoadFail = () => (
<>  <Row>
    <div style={{ padding: '4px 15px' }}>
    <Message id="user.fetch.error" />
    </div>
    </Row>
    <Button
      type="link"
      icon={<DeleteOutlined />}
      onClick={handleClearCookies}
    >
      <span>
        <Message id="user.clear.cookies" />
      </span>
    </Button>
</>
)