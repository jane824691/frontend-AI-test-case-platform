'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowRightOutlined, FileTextOutlined, ProfileOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Col, Empty, Row, Space, Spin, Tag, Typography } from 'antd';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';
import type { ProjectWorkspace, RequirementSectionSummary, TestCaseSummary } from '@/lib/contracts';
import { useSessionStore } from '@/stores/session-store';

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
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(null);
  const [sectionCases, setSectionCases] = useState<Record<number, TestCaseSummary[]>>({});
  const [isWorkspaceLoading, setIsWorkspaceLoading] = useState(false);
  const [loadingSectionId, setLoadingSectionId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isSessionLoading || !user) return;

    setIsWorkspaceLoading(true);
    setError(null);
    api.getProjectWorkspace(params.projectId)
      .then((response) => {
        setWorkspace(response.data);
        setSelectedSectionId(response.data.sections[0]?.requirementSectionId ?? null);
        setSectionCases({});
      })
      .catch(() => setError('目前無法取得需求章節與 test case 摘要，請確認後端服務與權限。'))
      .finally(() => setIsWorkspaceLoading(false));
  }, [isSessionLoading, params.projectId, user]);

  useEffect(() => {
    if (!workspace || selectedSectionId === null || sectionCases[selectedSectionId]) return;

    setLoadingSectionId(selectedSectionId);
    setError(null);
    api.listSectionTestCases(workspace.project.projectId, selectedSectionId)
      .then((response) => {
        setSectionCases((current) => ({ ...current, [selectedSectionId]: response.data.items }));
      })
      .catch(() => setError('目前無法取得此需求章節的 test case。'))
      .finally(() => setLoadingSectionId(null));
  }, [sectionCases, selectedSectionId, workspace]);

  const selectedSection = useMemo<RequirementSectionSummary | undefined>(
    () => workspace?.sections.find((section) => section.requirementSectionId === selectedSectionId),
    [selectedSectionId, workspace],
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
                {workspace?.sections.length === 0 && <Empty description="目前沒有需求章節" />}
                {workspace?.sections.map((section) => (
                  <button
                    className={`requirement-item ${section.requirementSectionId === selectedSectionId ? 'active' : ''}`}
                    key={section.requirementSectionId}
                    onClick={() => setSelectedSectionId(section.requirementSectionId)}
                    type="button"
                  >
                    <span className="requirement-item-title">{section.heading}</span>
                    <span className="requirement-item-meta">
                      <Tag color={changeColor(section.statusCode)}>{changeLabel(section.statusCode)}</Tag>
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
                  <Button icon={<ArrowRightOutlined />} href={`/projects/${params.projectId}/test-cases/all`}>
                    查看全部 Test Case
                  </Button>
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
