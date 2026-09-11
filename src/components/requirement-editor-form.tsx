'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileTextOutlined, SendOutlined } from '@ant-design/icons';
import { Alert, App, Button, Card, Form, Input, Space, Spin, Typography } from 'antd';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';
import type { ProjectWorkspace } from '@/lib/contracts';
import { useSessionStore } from '@/stores/session-store';

interface RequirementValues {
  changeSummary?: string;
  markdown: string;
}

function canCreateRequirement(role?: string) {
  return role === 'admin' || role === 'pm';
}

export function RequirementEditorForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { message } = App.useApp();
  const { user, isLoading: isSessionLoading } = useSessionStore();
  const [form] = Form.useForm<RequirementValues>();
  const [workspace, setWorkspace] = useState<ProjectWorkspace | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editable = canCreateRequirement(user?.projectRole ?? user?.globalRole);

  useEffect(() => {
    if (isSessionLoading || !user) return;

    setIsLoading(true);
    setError(null);
    api.getProjectWorkspace(projectId)
      .then((response) => setWorkspace(response.data))
      .catch(() => setError('無法載入需求文件摘要，請確認專案或登入權限。'))
      .finally(() => setIsLoading(false));
  }, [isSessionLoading, projectId, user]);

  async function handleSubmit(values: RequirementValues) {
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await api.uploadMarkdownRequirement(projectId, {
        markdown: values.markdown.trim(),
        changeSummary: values.changeSummary?.trim() || null,
      });
      message.success(`已建立需求版本 v${response.data.versionNumber}`);
      router.push(`/projects/${projectId}/requirements/versions/${response.data.requirementVersionId}/diff`);
      router.refresh();
    } catch {
      setError('新增需求失敗。請確認 Markdown 內容不為空，且目前角色為 PM 或 Admin。');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isSessionLoading && !user) {
    return (
      <AppShell title="新增需求">
        <Card className="workspace-card" variant="outlined">
          <Alert type="info" showIcon title="需要登入" description="請先建立 dev session，再新增需求文件。" />
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell title="新增需求">
      <div className="editor-page">
        <Card className="workspace-card" variant="outlined">
          <Space className="table-toolbar" align="start" wrap>
            <Space className="section-heading" align="start">
              <span className="heading-icon"><FileTextOutlined /></span>
              <Space orientation="vertical" size={4}>
                <Typography.Title level={2}>新增 Markdown 文字需求</Typography.Title>
                <Typography.Paragraph>
                  Phase 1 只接受 Markdown 作為需求來源。送出後會建立新的需求版本，後續串接章節解析與 AI 測試案例草稿生成。
                </Typography.Paragraph>
              </Space>
            </Space>
            <Button href={`/projects/${projectId}/requirements`}>返回需求文件</Button>
          </Space>
        </Card>

        {error && <Alert type="error" showIcon title="操作未完成" description={error} />}
        {!editable && (
          <Alert
            type="warning"
            showIcon
            title="唯讀模式"
            description="只有 Admin 或 PM 可以新增 Markdown 需求；QA 與 Developer 可以檢視需求與分析結果。"
          />
        )}

        <Spin spinning={isSessionLoading || isLoading}>
          <Card className="workspace-card" variant="outlined">
            <Space orientation="vertical" size={4} className="full-width requirement-summary">
              <Typography.Text type="secondary">目前專案</Typography.Text>
              <Typography.Title level={2}>{workspace?.project.name ?? `Project ${projectId}`}</Typography.Title>
              <Typography.Text type="secondary">
                最新版本：{workspace?.latestRequirementVersion ? `v${workspace.latestRequirementVersion.versionNumber}` : '尚未建立'}
              </Typography.Text>
            </Space>

            <Form
              form={form}
              layout="vertical"
              disabled={!editable || isSubmitting}
              onFinish={handleSubmit}
              className="requirement-form"
            >
              <Form.Item label="變更摘要" name="changeSummary">
                <Input placeholder="例如：新增登入失敗處理與權限檢查" />
              </Form.Item>
              <Form.Item
                label="Markdown 需求內容"
                name="markdown"
                rules={[{ required: true, whitespace: true, message: '請輸入 Markdown 需求內容' }]}
              >
                <Input.TextArea
                  rows={18}
                  placeholder={'# 功能名稱\n\n## 使用者情境\n描述 PM 新增的需求內容。\n\n## 驗收條件\n- 條件一\n- 條件二'}
                />
              </Form.Item>
              <Button type="primary" htmlType="submit" icon={<SendOutlined />} loading={isSubmitting}>
                建立需求版本
              </Button>
            </Form>
          </Card>
        </Spin>
      </div>
    </AppShell>
  );
}
