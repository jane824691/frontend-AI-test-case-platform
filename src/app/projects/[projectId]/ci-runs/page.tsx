'use client';

import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Table, Tag, Typography } from 'antd';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';
import type { CiRunSummary } from '@/lib/contracts';

export default function CiRunsPage() {
  const params = useParams<{ projectId: string }>();
  const [runs, setRuns] = useState<CiRunSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { void api.listCiRuns(params.projectId).then((response) => setRuns(response.data.items)).catch(() => setError('Unable to load CI runs.')); }, [params.projectId]);
  return <AppShell title="CI Runs">{error && <Alert type="error" showIcon message={error} />}<Card className="workspace-card" title="GitHub Actions execution history"><Table<CiRunSummary> rowKey="ciRunId" dataSource={runs} pagination={false} locale={{ emptyText: <Empty description="No CI runs have been received." /> }} columns={[
    { title: 'Workflow', dataIndex: 'workflowIdentifier' }, { title: 'Branch', dataIndex: 'branchName' }, { title: 'Commit', dataIndex: 'commitSha', render: (sha: string) => <Typography.Text code>{sha.slice(0, 12)}</Typography.Text> }, { title: 'Conclusion', dataIndex: 'conclusion', render: (value: string | null) => <Tag color={value === 'success' ? 'green' : 'red'}>{value ?? 'pending'}</Tag> }, { title: 'Eligible', dataIndex: 'eligibleForVerification', render: (value: boolean) => <Tag color={value ? 'blue' : 'default'}>{value ? 'yes' : 'no'}</Tag> }, { title: 'Ingestion', dataIndex: 'ingestionStatus' },
  ]} /></Card></AppShell>;
}
