'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeftOutlined, DeleteOutlined, EditOutlined, FileTextOutlined, SendOutlined } from '@ant-design/icons';
import { Alert, App, Button, Card, Descriptions, Empty, Progress, Select, Space, Spin, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Key } from 'react';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';
import type { PassFailResult, ProjectWorkspace, TestCaseDetail, TestCaseSummary } from '@/lib/contracts';
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
  if (result === 'hold') return '保留';
  return '未測試';
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

function canManageCases(role?: string) {
  return role === 'admin' || role === 'pm' || role === 'qa';
}

function buildColumns(
  projectId: string,
  sectionNameById: Map<number, string>,
  onResultChange: (testCaseId: number, result: PassFailResult) => void,
  updatingResultIds: Set<number>,
): ColumnsType<TestCaseDetail> {
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
      width: 180,
      render: (_, testCase) => (
        <Space orientation="vertical" size={4}>
          <Select
            aria-label={`${testCaseTitle(testCase)} 的人工結果`}
            className="full-width"
            value={(testCase.passFailResult as PassFailResult | null) ?? undefined}
            placeholder={resultLabel(null)}
            loading={updatingResultIds.has(testCase.testCaseId)}
            disabled={updatingResultIds.has(testCase.testCaseId)}
            onChange={(result: PassFailResult) => onResultChange(testCase.testCaseId, result)}
            options={[
              { value: 'pass', label: <span className="manual-result-option manual-result-option-pass">通過</span> },
              { value: 'fail', label: <span className="manual-result-option manual-result-option-fail">失敗</span> },
              { value: 'hold', label: <span className="manual-result-option manual-result-option-hold">保留</span> },
            ]}
          />
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
  const { message, modal } = App.useApp();
  const { user, isLoading: isSessionLoading } = useSessionStore();
  const [workspace, setWorkspace] = useState<ProjectWorkspace | null>(null);
  const [testCases, setTestCases] = useState<TestCaseDetail[]>([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState<Key[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBulkPublishing, setIsBulkPublishing] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [updatingResultIds, setUpdatingResultIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const sectionNameById = useMemo(() => buildSectionNameMap(workspace), [workspace]);
  const publishedCount = testCases.filter((testCase) => testCase.currentStatus === 'published').length;
  const completionRate = testCases.length === 0 ? 0 : Math.round((publishedCount / testCases.length) * 100);
  const canManage = canManageCases(user?.projectRole ?? user?.globalRole);
  const selectedTestCaseIds = selectedRowKeys.map((key) => Number(key)).filter((key) => Number.isInteger(key));
  const hasSelectedCases = selectedTestCaseIds.length > 0;

  const loadTestCases = useMemo(
    () => async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [workspaceResponse, listResponse] = await Promise.all([
          api.getProjectWorkspace(params.projectId),
          api.listTestCases(params.projectId),
        ]);
        setWorkspace(workspaceResponse.data);
        const details = await Promise.all(
          listResponse.data.items.map((testCase) => api.getTestCaseDetail(params.projectId, testCase.testCaseId)),
        );
        setTestCases(details.map((detail) => detail.data));
        setSelectedRowKeys([]);
      } catch {
        setError('目前無法取得全部 test case 與版本化內容，請確認後端服務與權限。');
      } finally {
        setIsLoading(false);
      }
    },
    [params.projectId],
  );

  useEffect(() => {
    if (isSessionLoading || !user) return;

    void loadTestCases();
  }, [isSessionLoading, loadTestCases, user]);

  async function handleResultChange(testCaseId: number, result: PassFailResult) {
    setUpdatingResultIds((current) => new Set(current).add(testCaseId));
    setError(null);
    try {
      const response = await api.updateTestCaseResult(params.projectId, testCaseId, result);
      setTestCases((current) => current.map((testCase) => (
        testCase.testCaseId === testCaseId ? response.data : testCase
      )));
      message.success('人工結果已更新');
    } catch {
      setError('人工結果更新失敗，請確認目前登入角色仍具有更新權限。');
    } finally {
      setUpdatingResultIds((current) => {
        const next = new Set(current);
        next.delete(testCaseId);
        return next;
      });
    }
  }

  async function handleBulkPublish() {
    if (!hasSelectedCases) return;

    setIsBulkPublishing(true);
    setError(null);
    try {
      await Promise.all(
        selectedTestCaseIds.map((testCaseId) =>
          api.publishTestCase(params.projectId, testCaseId, 'Bulk published from all test cases list.'),
        ),
      );
      message.success(`已發布 ${selectedTestCaseIds.length} 筆測試案例`);
      await loadTestCases();
    } catch {
      setError('確認發佈失敗。請確認目前角色為 Admin、PM 或 QA，且選取的測試案例都有可發布版本。');
    } finally {
      setIsBulkPublishing(false);
    }
  }

  function handleConfirmDelete() {
    if (!hasSelectedCases) return;

    modal.confirm({
      title: '確認是否刪除選擇的用例？',
      content: `將刪除 ${selectedTestCaseIds.length} 筆測試案例與其版本紀錄。此動作無法從畫面復原。`,
      okText: '確定刪除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        setIsBulkDeleting(true);
        setError(null);
        try {
          await Promise.all(selectedTestCaseIds.map((testCaseId) => api.deleteTestCase(params.projectId, testCaseId)));
          message.success(`已刪除 ${selectedTestCaseIds.length} 筆測試案例`);
          await loadTestCases();
        } catch {
          setError('刪除用例失敗。請確認目前角色為 Admin、PM 或 QA，且測試案例仍存在。');
        } finally {
          setIsBulkDeleting(false);
        }
      },
    });
  }

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
            <Button icon={<ArrowLeftOutlined />} href={`/projects/${params.projectId}`}>
              回專案工作區
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
              rowSelection={{
                selectedRowKeys,
                onChange: setSelectedRowKeys,
                preserveSelectedRowKeys: false,
              }}
              columns={buildColumns(params.projectId, sectionNameById, handleResultChange, updatingResultIds)}
              dataSource={testCases}
              pagination={false}
              scroll={{ x: 1360 }}
              locale={{ emptyText: <Empty description="目前沒有 test case" /> }}
            />
          </Spin>
          {canManage && (
            <div className="case-bulk-actions">
              <Typography.Text type="secondary">已選取 {selectedTestCaseIds.length} 筆</Typography.Text>
              <Space wrap>
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  disabled={!hasSelectedCases}
                  loading={isBulkPublishing}
                  onClick={handleBulkPublish}
                >
                  確認發佈
                </Button>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  disabled={!hasSelectedCases}
                  loading={isBulkDeleting}
                  onClick={handleConfirmDelete}
                >
                  刪除用例
                </Button>
              </Space>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
