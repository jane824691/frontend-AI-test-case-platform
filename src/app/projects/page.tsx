'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRightOutlined, FileTextOutlined, ProjectOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Empty, Space, Spin, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';
import type { ProjectSummary } from '@/lib/contracts';
import { useSessionStore } from '@/stores/session-store';

function formatVersion(project: ProjectSummary) {
  const version = project.latestRequirementVersion;
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

const columns: ColumnsType<ProjectSummary> = [
  {
    title: 'Project',
    dataIndex: 'name',
    key: 'name',
    render: (_, project) => (
      <Space orientation="vertical" size={2}>
        <Link className="project-link" href={`/projects/${project.projectId}`}>{project.name}</Link>
        <Typography.Text type="secondary">
          {project.latestRequirementVersion?.changeSummary ?? '尚未建立需求版本或變更摘要'}
        </Typography.Text>
      </Space>
    ),
  },
  {
    title: '需求版本',
    dataIndex: 'latestVersion',
    key: 'latestVersion',
    width: 120,
    render: (_, project) => <Tag color={project.latestRequirementVersion ? 'green' : 'default'}>{formatVersion(project)}</Tag>,
  },
  {
    title: '測試案例',
    key: 'cases',
    width: 260,
    render: (_, project) => (
      <Space wrap>
        <Tag>{project.testCaseCount} 筆</Tag>
        <Tag color="blue">草稿 {project.draftCount}</Tag>
        <Tag color="green">已發布 {project.publishedCount}</Tag>
        <Tag color="red">退回 {project.rejectedCount}</Tag>
      </Space>
    ),
  },
  {
    title: '負責人',
    dataIndex: 'owner',
    key: 'owner',
    width: 130,
    render: (owner: ProjectSummary['owner']) => owner?.name ?? '未指定',
  },
  {
    title: '最後更新',
    dataIndex: 'updatedAt',
    key: 'updatedAt',
    width: 160,
    render: (updatedAt: string) => formatDate(updatedAt),
  },
  {
    title: '',
    key: 'action',
    width: 132,
    render: (_, project) => (
      <Button type="text" icon={<ArrowRightOutlined />} href={`/projects/${project.projectId}`}>
        進入
      </Button>
    ),
  },
];

export default function ProjectsPage() {
  const { user, isLoading: isSessionLoading } = useSessionStore();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isSessionLoading || !user) return;

    setIsLoading(true);
    setError(null);
    api.listProjects()
      .then((response) => setProjects(response.data.items))
      .catch(() => setError('目前無法取得 project 清單，請確認後端、Redis 與 MySQL 都已啟動。'))
      .finally(() => setIsLoading(false));
  }, [isSessionLoading, user]);

  return (
    <AppShell title="專案總覽">
      <div className="project-overview">
        <Card className="workspace-card" variant="outlined">
          <Space className="section-heading" align="start">
            <span className="heading-icon"><ProjectOutlined /></span>
            <Space orientation="vertical" size={4}>
              <Typography.Title level={2}>以 Project 為入口檢視需求與測試案例</Typography.Title>
              <Typography.Paragraph>
                每列 project 都帶出需求版本、案例狀態與負責人，點進名稱後可看見需求章節與 test case 的上下游關聯。
              </Typography.Paragraph>
            </Space>
          </Space>
        </Card>

        <Card className="workspace-card" variant="outlined">
          <Space className="table-toolbar" align="center" wrap>
            <Space>
              <FileTextOutlined />
              <Typography.Text strong>Project 與 Test Case 關聯總表</Typography.Text>
            </Space>
            <Typography.Text type="secondary">資料來源：GET /projects</Typography.Text>
          </Space>
          {!isSessionLoading && !user && (
            <Alert type="info" showIcon title="請先在右上角切換測試角色" description="建立 dev session 後，系統會從後端讀取您可存取的 project。" />
          )}
          {error && <Alert type="error" showIcon title="讀取失敗" description={error} style={{ marginBottom: 16 }} />}
          <Spin spinning={isSessionLoading || isLoading}>
            <Table
              rowKey="projectId"
              columns={columns}
              dataSource={projects}
              pagination={false}
              scroll={{ x: 920 }}
              locale={{ emptyText: <Empty description={user ? '目前沒有可顯示的 project' : '尚未登入'} /> }}
            />
          </Spin>
        </Card>
      </div>
    </AppShell>
  );
}
