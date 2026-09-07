'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeftOutlined, EditOutlined, FileTextOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Descriptions, Empty, Progress, Space, Spin, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';
import type { ProjectWorkspace, TestCaseDetail, TestCaseSummary } from '@/lib/contracts';
import { useSessionStore } from '@/stores/session-store';

function statusLabel(status: string) {
  return { draft: '草稿', published: '已發布', rejected: '已退回' }[status] ?? status;
}

function statusColor(status: string) {
  return { draft: 'blue', published: 'green', rejected: 'red' }[status] ?? 'default';
}

function resultLabel(result: string | null) {
  if (result === 'pass') return '通過';
  if (result === 'fail') return '失敗';
  if (result === 'hold') return '暫緩';
  return '未測試';
}

function resultColor(result: string | null) {
  if (result === 'pass') return 'green';
  if (result === 'fail') return 'red';
  if (result === 'hold') return 'orange';
  return 'default';
}

function formatDate(value: string | null) {
  if (!value) return '尚無資料';
  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function testCaseTitle(testCase: TestCaseSummary) {
  return testCase.latestVersion.title ?? testCase.stableCaseCode;
}

function buildSectionNameMap(workspace: ProjectWorkspace | null) {
  return new Map(
    workspace?.sections.map((section) => [section.requirementSectionId, section.heading]) ?? [],
  );
}

function buildColumns(projectId: string, sectionNameById: Map<number, string>): ColumnsType<TestCaseDetail> {
  return [
    {
      title: 'Test Case 與版本內容',
      key: 'case',
      width: 460,
      render: (_, testCase) => (
        <Space orientation="vertical" size={8} className="full-width">
          <Space wrap>
            <Typography.Text strong>{testCase.stableCaseCode}</Typography.Text>
            <Tag color="gold">{testCase.latestVersion.priority ?? '未指定'}</Tag>
            <Tag color="purple">{testCase.latestVersion.suggestedTestLevel ?? '未指定'}</Tag>
            {testCase.latestVersion.unitTestRecommended && <Tag color="cyan">建議單元測試</Tag>}
          </Space>
          <Link className="project-link" href={`/projects/${projectId}/test-cases/${testCase.testCaseId}`}>
            {testCaseTitle(testCase)}
          </Link>
          <Descriptions
            className="compact-descriptions"
            column={1}
            size="small"
            items={[
              { key: 'description', label: '測試描述', children: testCase.latestVersion.description ?? '尚無描述' },
              { key: 'preconditions', label: '前置條件', children: testCase.latestVersion.preconditions ?? '尚無前置條件' },
              { key: 'expected', label: '預期結果', children: testCase.latestVersion.expectedResult ?? '尚無預期結果' },
            ]}
          />
        </Space>
      ),
    },
    {
      title: '來源需求',
      key: 'sourceSection',
      width: 220,
      render: (_, testCase) => (
        <Typography.Text>
          {testCase.requirementSectionId ? sectionNameById.get(testCase.requirementSectionId) ?? testCase.sectionKey ?? '尚未關聯需求' : '尚未關聯需求'}
        </Typography.Text>
      ),
    },
    {
      title: '版本',
      key: 'version',
      width: 150,
      render: (_, testCase) => (
        <Space orientation="vertical" size={4}>
          <Tag>目前 v{testCase.latestVersion.revisionNumber ?? '-'}</Tag>
          <Tag color={testCase.publishedVersion.revisionNumber ? 'green' : 'default'}>
            {testCase.publishedVersion.revisionNumber ? `已發布 v${testCase.publishedVersion.revisionNumber}` : '尚未發布'}
          </Tag>
        </Space>
      ),
    },
    {
      title: '發布狀態',
      dataIndex: 'currentStatus',
      key: 'currentStatus',
      width: 120,
      render: (status: string) => <Tag color={statusColor(status)}>{statusLabel(status)}</Tag>,
    },
    {
      title: '人工結果',
      key: 'manualResult',
      width: 150,
      render: (_, testCase) => (
        <Space orientation="vertical" size={4}>
          <Tag color={resultColor(testCase.passFailResult)}>{resultLabel(testCase.passFailResult)}</Tag>
          <Typography.Text type="secondary">{testCase.passFailUpdatedByName ?? '尚無更新者'}</Typography.Text>
        </Space>
      ),
    },
    {
      title: '負責/更新',
      key: 'owner',
      width: 150,
      render: (_, testCase) => (
        <Space orientation="vertical" size={4}>
          <Typography.Text>{testCase.updatedByUserName ?? testCase.latestVersion.updatedByUserName ?? '尚無資料'}</Typography.Text>
          <Typography.Text type="secondary">{formatDate(testCase.updatedAt ?? testCase.latestVersion.updatedAt)}</Typography.Text>
        </Space>
      ),
    },
    {
      title: '',
      key: 'action',
      width: 110,
      render: (_, testCase) => (
        <Button type="text" icon={<EditOutlined />} href={`/projects/${projectId}/test-cases/${testCase.testCaseId}`}>
          編輯
        </Button>
      ),
    },
  ];
}

export default function AllTestCasesPage() {
  const params = useParams<{ projectId: string }>();
  const { user, isLoading: isSessionLoading } = useSessionStore();
  const [workspace, setWorkspace] = useState<ProjectWorkspace | null>(null);
  const [testCases, setTestCases] = useState<TestCaseDetail[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sectionNameById = useMemo(() => buildSectionNameMap(workspace), [workspace]);
  const publishedCount = testCases.filter((testCase) => testCase.currentStatus === 'published').length;
  const completionRate = testCases.length === 0 ? 0 : Math.round((publishedCount / testCases.length) * 100);

  useEffect(() => {
    if (isSessionLoading || !user) return;

    setIsLoading(true);
    setError(null);
    Promise.all([
      api.getProjectWorkspace(params.projectId),
      api.listTestCases(params.projectId),
    ])
      .then(async ([workspaceResponse, listResponse]) => {
        setWorkspace(workspaceResponse.data);
        const details = await Promise.all(
          listResponse.data.items.map((testCase) => api.getTestCaseDetail(params.projectId, testCase.testCaseId)),
        );
        setTestCases(details.map((detail) => detail.data));
      })
      .catch(() => setError('目前無法取得全部 test case 與版本化內容，請確認後端服務與權限。'))
      .finally(() => setIsLoading(false));
  }, [isSessionLoading, params.projectId, user]);

  if (!isSessionLoading && !user) {
    return (
      <AppShell title="全部 Test Case">
        <Card className="workspace-card" variant="outlined">
          <Alert type="info" showIcon title="請先在右上角切換測試角色" description="建立 dev session 後，系統會從後端讀取全部 test case。" />
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell title="全部 Test Case">
      <div className="project-overview">
        <Card className="workspace-card" variant="outlined">
          <Space className="table-toolbar" align="center" wrap>
            <Space className="section-heading" align="start">
              <span className="heading-icon"><FileTextOutlined /></span>
              <Space orientation="vertical" size={4}>
                <Typography.Title level={2}>{workspace?.project.name ?? `Project ${params.projectId}`} 的全部 Test Case</Typography.Title>
                <Typography.Paragraph>
                  這裡保留平鋪總表，直接顯示版本化內容、發布狀態與人工通過/失敗結果。
                </Typography.Paragraph>
              </Space>
            </Space>
            <Button icon={<ArrowLeftOutlined />} href={`/projects/${params.projectId}/test-cases`}>
              回需求分組
            </Button>
          </Space>
        </Card>

        {error && <Alert type="error" showIcon title="讀取失敗" description={error} />}

        <Card className="workspace-card" variant="outlined">
          <Space className="table-toolbar" align="center" wrap>
            <Space orientation="vertical" size={2}>
              <Typography.Text strong>全部案例總表</Typography.Text>
              <Typography.Text type="secondary">資料來源：GET /projects/{'{projectId}'}/test-cases + detail</Typography.Text>
            </Space>
            <div className="case-progress">
              <Typography.Text type="secondary">已發布比例</Typography.Text>
              <Progress percent={completionRate} size="small" />
            </div>
          </Space>
          <Spin spinning={isSessionLoading || isLoading}>
            <Table
              rowKey="testCaseId"
              columns={buildColumns(params.projectId, sectionNameById)}
              dataSource={testCases}
              pagination={false}
              scroll={{ x: 1360 }}
              locale={{ emptyText: <Empty description="目前沒有 test case" /> }}
            />
          </Spin>
        </Card>
      </div>
    </AppShell>
  );
}
