'use client';

import { useEffect, useState } from 'react';
import { Avatar, Button, Dropdown, Space, Typography } from 'antd';
import { DownOutlined, UserOutlined } from '@ant-design/icons';
import { api } from '@/lib/api';
import type { Role } from '@/lib/contracts';
import { useSessionStore } from '@/stores/session-store';

const roles: Role[] = ['admin', 'pm', 'qa', 'developer'];
const roleLabels: Record<Role, string> = { admin: '管理員', pm: 'PM', qa: 'QA', developer: '開發者' };

export function SessionControls() {
  const { user, isLoading, setUser, setLoading } = useSessionStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getSession()
      .then((response) => setUser(response.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [setLoading, setUser]);

  async function switchRole(role: Role) {
    setError(null);
    try {
      const response = await api.createDevSession(role);
      setUser(response.data.user);
    } catch {
      setError('目前無法連線至後端，請確認後端服務已在3003埠啟動。');
    }
  }

  return (
    <div className="session-controls">
      {error && <span className="error-text">{error}</span>}
      <Dropdown menu={{ items: roles.map((role) => ({ key: role, label: `切換為${roleLabels[role]}`, onClick: () => void switchRole(role) })) }}>
        <Button type="text" aria-label="切換測試角色">
          <Space><Avatar size="small" icon={<UserOutlined />} /><Typography.Text className="session-user">{isLoading ? '正在確認登入狀態…' : user ? `${user.name}（${roleLabels[user.projectRole]}）` : '尚未登入'}</Typography.Text><DownOutlined /></Space>
        </Button>
      </Dropdown>
    </div>
  );
}
