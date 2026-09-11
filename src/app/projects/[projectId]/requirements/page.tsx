'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FileTextOutlined, PlusOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Descriptions, Empty, Space, Spin, Tag, Typography } from 'antd';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';
import type { ProjectWorkspace } from '@/lib/contracts';
import { useSessionStore } from '@/stores/session-store';

function canCreateRequirement(role?: string) {
  return role === 'admin' || role === 'pm';
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

function sectionStatusLabel(statusCode: number) {
  return statusCode === 1 ? '已變更' : '未變更';
}

function sectionStatusColor(statusCode: number) {
  return statusCode === 1 ? 'green' : 'default';
}

export default function RequirementsPage() {
  const params = useParams<{ projectId: string }>();
  const { user, isLoading: isSessionLoading } = useSessionStore();
  const [workspace, setWorkspace] = useState<ProjectWorkspace | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canCreate = canCreateRequirement(user?.projectRole ?? user?.globalRole);

  useEffect(() => {
    if (isSessionLoading || !user) return;

    setIsLoading(true);
    setError(null);
    api.getProjectWorkspace(params.projectId)
      .then((response) => setWorkspace(response.data))
      .catch(() => setError('無法載入需求文件資料，請確認專案或登入權限。'))
      .finally(() => setIsLoading(false));
  }, [isSessionLoading, params.projectId, user]);

  if (!isSessionLoading && !user) {
    return (
      <AppShell title="需求文件">
        <Card className="workspace-card" variant="outlined">
          <Alert type="info" showIcon title="需要登入" description="請先建立 dev session，再檢視需求文件。" />
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell title="需求文件">
      <div className="project-overview">
        <Card className="workspace-card" variant="outlined">
          <Space className="table-toolbar" align="start" wrap>
            <Space className="section-heading" align="start">
              <span className="heading-icon"><FileTextOutlined /></span>
              <Space orientation="vertical" size={4}>
                <Typography.Title level={2}>Markdown 需求版本</Typography.Title>
                <Typography.Paragraph>
                  PM 或 Admin 可以在這裡新增 Markdown 文字需求；每次送出都會建立新的需求版本，供後續章節分析與 AI 產生 test case draft。
                </Typography.Paragraph>
              </Space>
            </Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              href={`/projects/${params.projectId}/requirements/new`}
              disabled={!canCreate}
            >
              新增需求
            </Button>
          </Space>
        </Card>

        {error && <Alert type="error" showIcon title="載入失敗" description={error} />}
        {!canCreate && user && (
          <Alert
            type="warning"
            showIcon
            title="目前角色不可新增需求"
            description="Phase 1 的 Markdown 需求新增由 PM 或 Admin 執行；QA 與 Developer 可以檢視需求與分析結果。"
          />
        )}

        <Spin spinning={isSessionLoading || isLoading}>
          <Card className="workspace-card" variant="outlined">
            {workspace ? (
              <Space orientation="vertical" size={18} className="full-width">
                <Descriptions
                  column={{ xs: 1, md: 2 }}
                  items={[
                    { key: 'project', label: 'Project', children: workspace.project.name },
                    {
                      key: 'version',
                      label: '最新版本',
                      children: workspace.latestRequirementVersion
                        ? `v${workspace.latestRequirementVersion.versionNumber}`
                        : '尚未建立',
                    },
                    {
                      key: 'summary',
                      label: '變更摘要',
                      children: workspace.latestRequirementVersion?.changeSummary ?? '尚無摘要',
                    },
                    {
                      key: 'updatedAt',
                      label: '更新時間',
                      children: formatDate(workspace.latestRequirementVersion?.updatedAt ?? workspace.project.updatedAt),
                    },
                  ]}
                />

                <div className="workspace-list">
                  <Typography.Text strong>最新版本章節</Typography.Text>
                  {workspace.sections.length === 0 && <Empty description="尚未有可分析的 Markdown 需求章節" />}
                  {workspace.sections.map((section) => (
                    <div className="workspace-list-row" key={section.requirementSectionId}>
                      <div>
                        <Space wrap>
                          <Typography.Text strong>{section.heading}</Typography.Text>
                          <Tag color={sectionStatusColor(section.statusCode)}>{sectionStatusLabel(section.statusCode)}</Tag>
                          <Tag>{section.testCaseCount} cases</Tag>
                        </Space>
                        <Typography.Paragraph>{section.headingPath}</Typography.Paragraph>
                      </div>
                      <Link href={`/projects/${params.projectId}/sections/${section.requirementSectionId}`}>
                        查看章節
                      </Link>
                    </div>
                  ))}
                </div>
              </Space>
            ) : (
              <Empty description="尚未載入需求文件資料" />
            )}
          </Card>
        </Spin>
      </div>
    </AppShell>
  );
}
