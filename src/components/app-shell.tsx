'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AppstoreOutlined, CheckCircleOutlined, EditOutlined, FileTextOutlined, FolderOpenOutlined, SafetyCertificateOutlined, SettingOutlined } from '@ant-design/icons';
import { Breadcrumb, Layout, Menu, Typography } from 'antd';
import type { ReactNode } from 'react';
import { SessionControls } from './session-controls';

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  const pathname = usePathname();
  const projectId = pathname.match(/^\/projects\/([^/]+)/)?.[1];
  const projectBase = projectId ? `/projects/${projectId}` : '/projects';
  const projectHref = (path: string) => projectId ? `${projectBase}${path}` : '/projects';
  const navigation = [
    { key: '/projects', icon: <FolderOpenOutlined />, label: <Link href="/projects">專案總覽</Link> },
    { key: `${projectBase}/requirements`, icon: <FileTextOutlined />, label: <Link href={projectHref('/requirements')}>需求版本</Link> },
    { key: `${projectBase}/sections`, icon: <AppstoreOutlined />, label: <Link href={projectBase}>章節檢閱</Link> },
    { key: `${projectBase}/test-cases`, icon: <EditOutlined />, label: <Link href={projectHref('/test-cases')}>測試案例</Link> },
    { key: `${projectBase}/approval-queue`, icon: <SafetyCertificateOutlined />, label: <Link href={projectHref('/approval-queue')}>審核佇列</Link> },
    { key: `${projectBase}/published`, icon: <CheckCircleOutlined />, label: <Link href={projectHref('/published')}>已發布案例</Link> },
    { key: '/permissions', icon: <SettingOutlined />, label: <Link href="/permissions">權限設定</Link> },
  ];
  const selectedKey = [...navigation].reverse().find((item) => pathname.startsWith(item.key))?.key ?? '/projects';
  return (
    <Layout className="app-shell">
      <Layout.Sider breakpoint="lg" collapsedWidth="0" width={260} theme="light" style={{ borderRight: '1px solid #e5e5e5', padding: '16px 12px' }}>
        <Link className="app-logo" href="/projects"><span className="app-logo-mark">✦</span>AI 測試案例平台</Link>
        <Menu mode="inline" selectedKeys={[selectedKey]} items={navigation} style={{ marginTop: 26, borderInlineEnd: 0 }} />
      </Layout.Sider>
      <Layout style={{ background: '#f7f7f8' }}>
        <Layout.Header style={{ height: 64, padding: '0 28px', background: 'rgba(255,255,255,.82)', borderBottom: '1px solid #e5e5e5', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Breadcrumb items={[{ title: '工作區' }, { title }]} />
          <SessionControls />
        </Layout.Header>
        <Layout.Content className="content">
          <Typography.Text className="page-kicker">Phase 1 MVP</Typography.Text>
          <Typography.Title level={1} className="page-title">{title}</Typography.Title>
          {children}
        </Layout.Content>
      </Layout>
    </Layout>
  );
}
