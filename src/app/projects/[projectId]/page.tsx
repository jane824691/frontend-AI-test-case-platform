'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ApartmentOutlined,
  CheckCircleOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  ProfileOutlined,
} from '@ant-design/icons';
import { Alert, Button, Card, Col, Descriptions, Empty, Row, Space, Spin, Statistic, Tag, Tree, Typography } from 'antd';
import type { DataNode } from 'antd/es/tree';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';
import type { ProjectWorkspace, TestCaseDetail, TestCaseSummary } from '@/lib/contracts';
import { useSessionStore } from '@/stores/session-store';

function statusColor(status: string) {
  if (status === 'published') return 'green';
  if (status === 'rejected') return 'red';
  return 'blue';
}

function statusLabel(status: string) {
  if (status === 'published') return '已發布';
  if (status === 'rejected') return '已退回';
  if (status === 'draft') return '草稿';
  return status;
}

function sectionStatusLabel(statusCode: number) {
  if (statusCode === 1) return '新增';
  if (statusCode === 2) return '修改';
  return '未變更';
}

function sectionStatusColor(statusCode: number) {
  if (statusCode === 1) return 'green';
  if (statusCode === 2) return 'orange';
  return 'default';
}

function formatVersion(workspace: ProjectWorkspace) {
  const version = workspace.latestRequirementVersion;
  return version ? `v${version.versionNumber}` : '尚無版本';
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

function buildTreeData(
  workspace: ProjectWorkspace,
  sectionCases: Record<number, TestCaseSummary[]>,
): DataNode[] {
  return [
    {
      key: `project:${workspace.project.projectId}`,
      title: 'Project 文件',
      icon: <FolderOpenOutlined />,
      children: workspace.sections.map((section) => {
        const loadedCases = sectionCases[section.requirementSectionId];
        const recentCases = workspace.recentTestCases.filter(
          (testCase) => testCase.requirementSectionId === section.requirementSectionId,
        );
        const visibleCases = loadedCases ?? recentCases;

        return {
          key: `section:${section.requirementSectionId}`,
          title: `${section.heading}（${section.testCaseCount}）`,
          icon: <FileTextOutlined />,
          children: visibleCases.map((testCase) => ({
            key: `case:${testCase.testCaseId}`,
            title: testCaseTitle(testCase),
            icon: <ProfileOutlined />,
          })),
        };
      }),
    },
  ];
}

export default function ProjectWorkspacePage() {
  const params = useParams<{ projectId: string }>();
  const { user, isLoading: isSessionLoading } = useSessionStore();
  const [workspace, setWorkspace] = useState<ProjectWorkspace | null>(null);
  const [selectedKey, setSelectedKey] = useState(`project:${params.projectId}`);
  const [sectionCases, setSectionCases] = useState<Record<number, TestCaseSummary[]>>({});
  const [caseDetail, setCaseDetail] = useState<TestCaseDetail | null>(null);
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(false);
  const [loadingSectionId, setLoadingSectionId] = useState<number | null>(null);
  const [loadingCaseId, setLoadingCaseId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isSessionLoading || !user) return;

    setIsWorkspaceLoading(true);
    setError(null);
    api.getProjectWorkspace(params.projectId)
      .then((response) => {
        setWorkspace(response.data);
        setSelectedKey(`project:${response.data.project.projectId}`);
        setSectionCases({});
        setCaseDetail(null);
      })
      .catch(() => setError('目前無法取得 project 工作區資料，請確認 project 是否存在，且目前角色有讀取權限。'))
      .finally(() => setIsWorkspaceLoading(false));
  }, [isSessionLoading, params.projectId, user]);

  const selectedSectionId = selectedKey.startsWith('section:') ? Number(selectedKey.replace('section:', '')) : null;
  const selectedCaseId = selectedKey.startsWith('case:') ? Number(selectedKey.replace('case:', '')) : null;

  useEffect(() => {
    if (!workspace || selectedSectionId === null || sectionCases[selectedSectionId]) return;

    setLoadingSectionId(selectedSectionId);
    setError(null);
    api.listSectionTestCases(workspace.project.projectId, selectedSectionId)
      .then((response) => {
        setSectionCases((current) => ({ ...current, [selectedSectionId]: response.data.items }));
      })
      .catch(() => setError('目前無法取得此章節的 test case 清單。'))
      .finally(() => setLoadingSectionId(null));
  }, [sectionCases, selectedSectionId, workspace]);

  useEffect(() => {
    if (!workspace || selectedCaseId === null) return;

    setLoadingCaseId(selectedCaseId);
    setError(null);
    api.getTestCaseDetail(workspace.project.projectId, selectedCaseId)
      .then((response) => setCaseDetail(response.data))
      .catch(() => setError('目前無法取得此 test case 明細。'))
      .finally(() => setLoadingCaseId(null));
  }, [selectedCaseId, workspace]);

  const treeData = useMemo(() => (workspace ? buildTreeData(workspace, sectionCases) : []), [sectionCases, workspace]);
  const selectedSection = selectedSectionId === null
    ? undefined
    : workspace?.sections.find((section) => section.requirementSectionId === selectedSectionId);
  const selectedSectionCases = selectedSection
    ? sectionCases[selectedSection.requirementSectionId]
      ?? workspace?.recentTestCases.filter((testCase) => testCase.requirementSectionId === selectedSection.requirementSectionId)
      ?? []
    : [];

  if (!isSessionLoading && !user) {
    return (
      <AppShell title="Project 工作區">
        <Card className="workspace-card" variant="outlined">
          <Alert type="info" showIcon title="請先在右上角切換測試角色" description="建立 dev session 後，系統會從後端讀取 project workspace。" />
        </Card>
      </AppShell>
    );
  }

  if (error && !workspace) {
    return (
      <AppShell title="Project 工作區">
        <Card className="workspace-card" variant="outlined">
          <Alert type="error" showIcon title="讀取失敗" description={error} />
        </Card>
      </AppShell>
    );
  }

  if (!workspace) {
    return (
      <AppShell title="Project 工作區">
        <Card className="workspace-card" variant="outlined">
          <Spin tip="正在讀取 project workspace..." />
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell title={workspace.project.name}>
      <div className="workspace-layout">
        <Card className="workspace-card tree-card" variant="outlined">
          <Space orientation="vertical" size={16} className="full-width">
            <Space className="section-heading" align="start">
              <span className="heading-icon"><ApartmentOutlined /></span>
              <Space orientation="vertical" size={2}>
                <Typography.Text strong>需求樹</Typography.Text>
                <Typography.Text type="secondary">點章節載入對應 test case，點案例載入完整明細</Typography.Text>
              </Space>
            </Space>
            <Spin spinning={isWorkspaceLoading || loadingSectionId !== null}>
              <Tree
                showIcon
                defaultExpandAll
                selectedKeys={[selectedKey]}
                treeData={treeData}
                onSelect={(keys) => {
                  if (keys[0]) setSelectedKey(String(keys[0]));
                }}
              />
            </Spin>
          </Space>
        </Card>

        <Space orientation="vertical" size={16} className="workspace-detail">
          {error && <Alert type="error" showIcon title="讀取失敗" description={error} />}
          <Row gutter={[12, 12]}>
            <Col xs={12} md={6}><Card className="metric-card" variant="outlined"><Statistic title="章節" value={workspace.project.sectionCount} /></Card></Col>
            <Col xs={12} md={6}><Card className="metric-card" variant="outlined"><Statistic title="Test Case" value={workspace.project.testCaseCount} /></Card></Col>
            <Col xs={12} md={6}><Card className="metric-card" variant="outlined"><Statistic title="草稿" value={workspace.project.draftCount} /></Card></Col>
            <Col xs={12} md={6}><Card className="metric-card" variant="outlined"><Statistic title="已發布" value={workspace.project.publishedCount} /></Card></Col>
          </Row>

          {!selectedSection && selectedCaseId === null && (
            <Card className="workspace-card" variant="outlined">
              <Space orientation="vertical" size={16} className="full-width">
                <Space className="section-heading" align="start">
                  <span className="heading-icon"><FileTextOutlined /></span>
                  <Space orientation="vertical" size={4}>
                    <Typography.Title level={2}>{workspace.project.name}</Typography.Title>
                    <Typography.Paragraph>
                      {workspace.latestRequirementVersion?.changeSummary ?? '此 project 尚未建立需求版本，或目前沒有需求版本摘要。'}
                    </Typography.Paragraph>
                  </Space>
                </Space>
                <Descriptions
                  column={{ xs: 1, md: 2 }}
                  items={[
                    { key: 'version', label: '最新版本', children: formatVersion(workspace) },
                    { key: 'owner', label: '負責人', children: workspace.project.owner?.name ?? '未指定' },
                    { key: 'updatedAt', label: '最後更新', children: formatDate(workspace.project.updatedAt) },
                    { key: 'members', label: '成員', children: `${workspace.project.membersSummary.total} 人` },
                  ]}
                />
                <div className="workspace-list">
                  <Typography.Text strong>需求章節</Typography.Text>
                  {workspace.sections.length === 0 && <Empty description="目前最新需求版本尚無章節資料" />}
                  {workspace.sections.map((section) => (
                    <div className="workspace-list-row" key={section.requirementSectionId}>
                      <div>
                        <Space wrap>
                          {section.heading}
                          <Tag color={sectionStatusColor(section.statusCode)}>{sectionStatusLabel(section.statusCode)}</Tag>
                        </Space>
                        <Typography.Paragraph>
                          {section.headingPath}，已關聯 {section.testCaseCount} 筆 test case。
                        </Typography.Paragraph>
                      </div>
                      <Button type="link" onClick={() => setSelectedKey(`section:${section.requirementSectionId}`)}>
                        查看章節
                      </Button>
                    </div>
                  ))}
                </div>
              </Space>
            </Card>
          )}

          {selectedSection && (
            <Card className="workspace-card" variant="outlined">
              <Space orientation="vertical" size={16} className="full-width">
                <Space className="section-heading" align="start">
                  <span className="heading-icon"><FileTextOutlined /></span>
                  <Space orientation="vertical" size={4}>
                    <Typography.Title level={2}>{selectedSection.heading}</Typography.Title>
                    <Typography.Paragraph>{selectedSection.headingPath}</Typography.Paragraph>
                  </Space>
                </Space>
                <Space wrap>
                  <Tag color={sectionStatusColor(selectedSection.statusCode)}>{sectionStatusLabel(selectedSection.statusCode)}</Tag>
                  <Tag>Test Case {selectedSection.testCaseCount}</Tag>
                  <Tag color="blue">草稿 {selectedSection.draftCount}</Tag>
                  <Tag color="green">已發布 {selectedSection.publishedCount}</Tag>
                  <Tag color="red">退回 {selectedSection.rejectedCount}</Tag>
                </Space>
                <Spin spinning={loadingSectionId === selectedSection.requirementSectionId}>
                  <div className="workspace-list">
                    <Typography.Text strong>此章節延伸出的 Test Case</Typography.Text>
                    {selectedSectionCases.length === 0 && <Empty description="此章節目前沒有 test case" />}
                    {selectedSectionCases.map((testCase) => (
                      <div className="workspace-list-row" key={testCase.testCaseId}>
                        <div>
                          <Space wrap>
                            {testCase.stableCaseCode}
                            <span>{testCaseTitle(testCase)}</span>
                            <Tag color={statusColor(testCase.currentStatus)}>{statusLabel(testCase.currentStatus)}</Tag>
                          </Space>
                          <Typography.Paragraph>
                            優先級：{testCase.latestVersion.priority ?? '未指定'}｜建議層級：{testCase.latestVersion.suggestedTestLevel ?? '未指定'}｜最後更新：{formatDate(testCase.updatedAt)}
                          </Typography.Paragraph>
                        </div>
                        <Button type="link" onClick={() => setSelectedKey(`case:${testCase.testCaseId}`)}>
                          查看案例
                        </Button>
                      </div>
                    ))}
                  </div>
                </Spin>
              </Space>
            </Card>
          )}

          {selectedCaseId !== null && (
            <Card className="workspace-card" variant="outlined">
              <Spin spinning={loadingCaseId === selectedCaseId}>
                {!caseDetail || caseDetail.testCaseId !== selectedCaseId ? (
                  <Empty description="正在載入 test case 明細" />
                ) : (
                  <Space orientation="vertical" size={16} className="full-width">
                    <Space className="section-heading" align="start">
                      <span className="heading-icon"><CheckCircleOutlined /></span>
                      <Space orientation="vertical" size={4}>
                        <Typography.Title level={2}>{testCaseTitle(caseDetail)}</Typography.Title>
                        <Typography.Text type="secondary">
                          來源章節：{caseDetail.sectionKey ?? '尚未關聯章節'}
                        </Typography.Text>
                      </Space>
                    </Space>
                    <Space wrap>
                      <Tag>{caseDetail.stableCaseCode}</Tag>
                      <Tag color={statusColor(caseDetail.currentStatus)}>{statusLabel(caseDetail.currentStatus)}</Tag>
                      <Tag color="gold">優先級 {caseDetail.latestVersion.priority ?? '未指定'}</Tag>
                      <Tag color="purple">{caseDetail.latestVersion.suggestedTestLevel ?? '未指定'}</Tag>
                      {caseDetail.latestVersion.unitTestRecommended && <Tag color="cyan">建議單元測試</Tag>}
                    </Space>
                    <Descriptions
                      column={1}
                      items={[
                        { key: 'description', label: '測試描述', children: caseDetail.latestVersion.description ?? '尚無描述' },
                        { key: 'preconditions', label: '前置條件', children: caseDetail.latestVersion.preconditions ?? '尚無前置條件' },
                        { key: 'expected', label: '預期結果', children: caseDetail.latestVersion.expectedResult ?? '尚無預期結果' },
                        { key: 'reusability', label: '共用性備註', children: caseDetail.latestVersion.reusabilityNote ?? '尚無備註' },
                        { key: 'owner', label: '最後更新者', children: caseDetail.updatedByUserName ?? caseDetail.latestVersion.updatedByUserName ?? '尚無資料' },
                        { key: 'updatedAt', label: '最後更新', children: formatDate(caseDetail.updatedAt ?? caseDetail.latestVersion.updatedAt) },
                      ]}
                    />
                    <Space wrap>
                      <Button href={`/projects/${workspace.project.projectId}/test-cases/${caseDetail.testCaseId}`} type="primary">
                        進入編輯器
                      </Button>
                      <Link href={`/projects/${workspace.project.projectId}/test-cases`}>查看此 Project 所有 Test Case</Link>
                    </Space>
                  </Space>
                )}
              </Spin>
            </Card>
          )}
        </Space>
      </div>
    </AppShell>
  );
}
