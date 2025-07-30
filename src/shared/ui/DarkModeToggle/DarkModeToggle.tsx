import React from 'react';
import { Button } from 'antd';
import { SunOutlined, MoonOutlined } from '@ant-design/icons';

interface IDarkModeToggleProps {
  checked: boolean;
  onChange: () => void;
  size?: number;
}

export const DarkModeToggle: React.FC<IDarkModeToggleProps> = ({ checked, onChange, size = 36 }) => {
  const iconSize = Math.max(16, size * 0.4);

  return (
    <Button
      type="text"
      icon={checked ? <MoonOutlined style={{ fontSize: iconSize }} /> : <SunOutlined style={{ fontSize: iconSize }} />}
      onClick={onChange}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid #d9d9d9',
        backgroundColor: checked ? '#001529' : '#ffffff',
        color: checked ? '#ffffff' : '#000000',
        transition: 'all 0.3s ease',
      }}
    />
  );
};
