'use client';

import { InfoCircleOutlined } from '@ant-design/icons';
import { Alert, Descriptions, Typography } from 'antd';
import { useParams } from 'next/navigation';
import type { ReactNode } from 'react';
import { AppShell } from './app-shell';
import { StubPanel } from './stub-panel';

export function PagePanel({ title, description, apiPath, showVersion }: { title: string; description: string; apiPath?: string; showVersion?: boolean }) {
  const params = useParams<{ projectId?: string; caseId?: string; sectionId?: string; versionId?: string }>();
  const identifiers = [
    params.projectId && { key: 'project', label: '專案 ID', children: <code>{params.projectId}</code> },
    params.sectionId && { key: 'section', label: '章節 ID', children: <code>{params.sectionId}</code> },
    params.caseId && { key: 'case', label: '案例 ID', children: <code>{params.caseId}</code> },
    showVersion && params.versionId && { key: 'version', label: '版本 ID', children: <code>{params.versionId}</code> },
  ].filter(Boolean) as { key: string; label: string; children: ReactNode }[];

  return <AppShell title={title}><StubPanel>
    <Typography.Paragraph className="panel-copy">{description}</Typography.Paragraph>
    {identifiers.length > 0 && <Descriptions size="small" column={1} items={identifiers} />}
    {apiPath && <Alert style={{ marginTop: 20 }} type="info" showIcon icon={<InfoCircleOutlined />} title="預計串接 API" description={<code>{apiPath}</code>} />}
  </StubPanel></AppShell>;
}
