'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowRightOutlined, FileTextOutlined, PlusOutlined, ProfileOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Col, Empty, Row, Space, Spin, Tag, Typography } from 'antd';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';
import type { ProjectWorkspace, RequirementSectionSummary, TestCaseSummary } from '@/lib/contracts';
import { useSessionStore } from '@/stores/session-store';

const OTHER_SECTION_ID = -1;

type DisplaySection = RequirementSectionSummary & { isOther?: boolean };

function statusLabel(status: string) {
  return { draft: '草稿', published: '已發布', rejected: '已退回' }[status] ?? status;
}

function statusColor(status: string) {
  return { draft: 'blue', published: 'green', rejected: 'red' }[status] ?? 'default';
}

function changeLabel(statusCode: number) {
  if (statusCode === 1) return '新增';
  if (statusCode === 2) return '修改';
  return '未變更';
}

function changeColor(statusCode: number) {
  if (statusCode === 1) return 'green';
  if (statusCode === 2) return 'orange';
  return 'default';
}

function testCaseTitle(testCase: TestCaseSummary) {
  return testCase.latestVersion.title ?? testCase.stableCaseCode;
}

function canCreateCase(role?: string) {
  return role === 'admin' || role === 'pm' || role === 'qa';
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

export default function TestCasesPage() {
  const params = useParams<{ projectId: string }>();
  const { user, isLoading: isSessionLoading } = useSessionStore();
  const [workspace, setWorkspace] = useState<ProjectWorkspace | null>(null);
  const [projectTestCases, setProjectTestCases] = useState<TestCaseSummary[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [sectionCases, setSectionCases] = useState<Record<number, TestCaseSummary[]>>({});
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(false);
  const [loadingSectionId, setLoadingSectionId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canManuallyCreateCase = canCreateCase(user?.projectRole ?? user?.globalRole);

  useEffect(() => {
    if (isSessionLoading || !user) return;

    setIsWorkspaceLoading(true);
    setError(null);
    Promise.all([
      api.getProjectWorkspace(params.projectId),
      api.listTestCases(params.projectId),
    ])
      .then(([workspaceResponse, testCasesResponse]) => {
        const latestSectionIds = new Set(
          workspaceResponse.data.sections.map((section) => section.requirementSectionId),
        );
        const uncategorizedCases = testCasesResponse.data.items.filter(
          (testCase) => !testCase.requirementSectionId || !latestSectionIds.has(testCase.requirementSectionId),
        );

        setWorkspace(workspaceResponse.data);
        setProjectTestCases(testCasesResponse.data.items);
        setSelectedSectionId(
          workspaceResponse.data.sections[0]?.requirementSectionId
            ?? (uncategorizedCases.length > 0 ? OTHER_SECTION_ID : null),
        );
        setSectionCases(uncategorizedCases.length > 0 ? { [OTHER_SECTION_ID]: uncategorizedCases } : {});
      })
      .catch(() => setError('目前無法取得需求章節與 test case 摘要，請確認後端服務與權限。'))
      .finally(() => setIsWorkspaceLoading(false));
  }, [isSessionLoading, params.projectId, user]);

  useEffect(() => {
    if (!workspace || selectedSectionId === null || selectedSectionId === OTHER_SECTION_ID || sectionCases[selectedSectionId]) return;

    setLoadingSectionId(selectedSectionId);
    setError(null);
    api.listSectionTestCases(workspace.project.projectId, selectedSectionId)
      .then((response) => {
        setSectionCases((current) => ({ ...current, [selectedSectionId]: response.data.items }));
      })
      .catch(() => setError('目前無法取得此需求章節的 test case。'))
      .finally(() => setLoadingSectionId(null));
  }, [sectionCases, selectedSectionId, workspace]);

  const displaySections = useMemo<DisplaySection[]>(() => {
    if (!workspace) return [];

    const sectionCaseCountById = new Map<number, TestCaseSummary[]>();
    for (const testCase of projectTestCases) {
      if (!testCase.requirementSectionId) continue;
      const cases = sectionCaseCountById.get(testCase.requirementSectionId) ?? [];
      cases.push(testCase);
      sectionCaseCountById.set(testCase.requirementSectionId, cases);
    }

    const latestSectionIds = new Set(workspace.sections.map((section) => section.requirementSectionId));
    const mappedSections = workspace.sections.map((section) => {
      const cases = sectionCaseCountById.get(section.requirementSectionId) ?? [];
      return {
        ...section,
        testCaseCount: cases.length,
        draftCount: cases.filter((testCase) => testCase.currentStatus === 'draft').length,
        publishedCount: cases.filter((testCase) => testCase.currentStatus === 'published').length,
        rejectedCount: cases.filter((testCase) => testCase.currentStatus === 'rejected').length,
      };
    });
    const otherCases = projectTestCases.filter(
      (testCase) => !testCase.requirementSectionId || !latestSectionIds.has(testCase.requirementSectionId),
    );

    if (otherCases.length === 0) return mappedSections;
    return [
      ...mappedSections,
      {
        requirementSectionId: OTHER_SECTION_ID,
        sectionKey: 'other',
        heading: '其他',
        headingPath: '未歸類至目前需求標題的 Test Case',
        sectionOrder: mappedSections.length,
        statusCode: 0,
        testCaseCount: otherCases.length,
        draftCount: otherCases.filter((testCase) => testCase.currentStatus === 'draft').length,
        publishedCount: otherCases.filter((testCase) => testCase.currentStatus === 'published').length,
        rejectedCount: otherCases.filter((testCase) => testCase.currentStatus === 'rejected').length,
        isOther: true,
      },
    ];
  }, [projectTestCases, workspace]);

  const selectedSection = useMemo<DisplaySection | undefined>(
    () => displaySections.find((section) => section.requirementSectionId === selectedSectionId),
    [displaySections, selectedSectionId],
  );
  const selectedCases = selectedSectionId === null ? [] : sectionCases[selectedSectionId] ?? [];

  if (!isSessionLoading && !user) {
    return (
      <AppShell title="測試案例">
        <Card className="workspace-card" variant="outlined">
          <Alert type="info" showIcon title="請先在右上角切換測試角色" description="建立 dev session 後，系統會從後端讀取此 project 的 test case。" />
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell title="測試案例">
      <div className="project-overview">
        <Card className="workspace-card" variant="outlined">
          <Space className="section-heading" align="start">
            <span className="heading-icon"><FileTextOutlined /></span>
            <Space orientation="vertical" size={4}>
              <Typography.Title level={2}>以需求章節檢視 Test Case</Typography.Title>
              <Typography.Paragraph>
                左側從後端讀取需求章節，右側只呈現目前選中需求延伸出的 test case，讓案例歸屬更明確。
              </Typography.Paragraph>
            </Space>
          </Space>
        </Card>

        {error && <Alert type="error" showIcon title="讀取失敗" description={error} />}

        <Spin spinning={isSessionLoading || isWorkspaceLoading}>
          <div className="case-master-detail">
            <Card className="workspace-card case-requirement-panel" variant="outlined">
              <Space className="table-toolbar" align="center" wrap>
                <Space>
                  <FileTextOutlined />
                  <Typography.Text strong>需求章節</Typography.Text>
                </Space>
                <Tag>{workspace?.project.testCaseCount ?? 0} cases</Tag>
              </Space>
              <div className="requirement-list">
                {displaySections.length === 0 && <Empty description="目前沒有需求章節" />}
                {displaySections.map((section) => (
                  <button
                    className={`requirement-item ${section.requirementSectionId === selectedSectionId ? 'active' : ''}`}
                    key={section.requirementSectionId}
                    onClick={() => setSelectedSectionId(section.requirementSectionId)}
                    type="button"
                  >
                    <span className="requirement-item-title">{section.heading}</span>
                    <span className="requirement-item-meta">
                      <Tag color={section.isOther ? 'default' : changeColor(section.statusCode)}>
                        {section.isOther ? '未歸類' : changeLabel(section.statusCode)}
                      </Tag>
                      <span>{section.testCaseCount} cases</span>
                    </span>
                  </button>
                ))}
              </div>
            </Card>

            <Card className="workspace-card" variant="outlined">
              <Space orientation="vertical" size={18} className="full-width">
                <Space className="table-toolbar" align="start" wrap>
                  <Space className="section-heading" align="start">
                    <span className="heading-icon"><ProfileOutlined /></span>
                    <Space orientation="vertical" size={4}>
                      <Typography.Title level={2}>{selectedSection?.heading ?? '尚未選擇需求章節'}</Typography.Title>
                      <Typography.Paragraph>{selectedSection?.headingPath ?? '請從左側選擇一個需求章節。'}</Typography.Paragraph>
                    </Space>
                  </Space>
                  <Space orientation="vertical" size={8} className="case-toolbar-actions">
                    <Button icon={<ArrowRightOutlined />} href={`/projects/${params.projectId}/test-cases/all`}>
                      查看全部 Test Case
                    </Button>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      href={`/projects/${params.projectId}/test-cases/new${selectedSectionId ? `?sectionId=${selectedSectionId}` : ''}`}
                      disabled={!canManuallyCreateCase || !selectedSectionId || selectedSectionId === OTHER_SECTION_ID}
                    >
                      手動新增 Test Case
                    </Button>
                  </Space>
                </Space>

                {selectedSection && (
                  <Row gutter={[12, 12]}>
                    <Col xs={24} md={8}>
                      <Card className="metric-card" variant="outlined">
                        <Typography.Text type="secondary">此需求案例</Typography.Text>
                        <Typography.Title level={3}>{selectedSection.testCaseCount}</Typography.Title>
                      </Card>
                    </Col>
                    <Col xs={24} md={8}>
                      <Card className="metric-card" variant="outlined">
                        <Typography.Text type="secondary">已發布</Typography.Text>
                        <Typography.Title level={3}>{selectedSection.publishedCount}</Typography.Title>
                      </Card>
                    </Col>
                    <Col xs={24} md={8}>
                      <Card className="metric-card" variant="outlined">
                        <Typography.Text type="secondary">草稿/退回</Typography.Text>
                        <Typography.Title level={3}>{selectedSection.draftCount + selectedSection.rejectedCount}</Typography.Title>
                      </Card>
                    </Col>
                  </Row>
                )}

                <Spin spinning={loadingSectionId === selectedSectionId}>
                  <div className="workspace-list">
                    <Typography.Text strong>此需求延伸出的 Test Case</Typography.Text>
                    {selectedSection && selectedCases.length === 0 && <Empty description="此需求章節目前沒有 test case" />}
                    {selectedCases.map((testCase) => (
                      <div className="case-card-row" key={testCase.testCaseId}>
                        <div>
                          <Space wrap>
                            <Typography.Text strong>{testCase.stableCaseCode}</Typography.Text>
                            <Tag color={statusColor(testCase.currentStatus)}>{statusLabel(testCase.currentStatus)}</Tag>
                            <Tag color="gold">{testCase.latestVersion.priority ?? '未指定'}</Tag>
                            <Tag color="purple">{testCase.latestVersion.suggestedTestLevel ?? '未指定'}</Tag>
                          </Space>
                          <Link className="case-title-link" href={`/projects/${params.projectId}/test-cases/${testCase.testCaseId}`}>
                            {testCaseTitle(testCase)}
                          </Link>
                          <Typography.Paragraph>
                            目前 v{testCase.latestVersion.revisionNumber ?? '-'}｜發布 v{testCase.publishedVersion.revisionNumber ?? '尚無'}｜最後更新：{formatDate(testCase.updatedAt)}
                          </Typography.Paragraph>
                        </div>
                        <div className="case-owner">
                          <Typography.Text type="secondary">最後更新者</Typography.Text>
                          <Typography.Text>{testCase.updatedByUserName ?? '尚無資料'}</Typography.Text>
                          <Typography.Text type="secondary">{testCase.passFailResult ? `人工結果：${testCase.passFailResult}` : '尚無人工結果'}</Typography.Text>
                        </div>
                      </div>
                    ))}
                  </div>
                </Spin>
              </Space>
            </Card>
          </div>
        </Spin>
      </div>
    </AppShell>
  );
}
