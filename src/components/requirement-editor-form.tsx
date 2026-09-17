'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileTextOutlined, SaveOutlined, SendOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { Alert, App, Button, Card, Form, Input, Space, Spin, Typography } from 'antd';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';
import type { ProjectWorkspace } from '@/lib/contracts';
import { useSessionStore } from '@/stores/session-store';

interface RequirementValues {
  projectName: string;
  changeSummary?: string;
  markdown: string;
}

type SubmitAction = 'save-text' | 'generate-cases';

function canCreateRequirement(role?: string) {
  return role === 'admin' || role === 'pm';
}

export function RequirementEditorForm({
  projectId,
  mode = 'project-version',
}: {
  projectId?: string;
  mode?: 'new-project' | 'project-version';
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const { user, isLoading: isSessionLoading } = useSessionStore();
  const [form] = Form.useForm<RequirementValues>();
  const [workspace, setWorkspace] = useState<ProjectWorkspace | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittingAction, setSubmittingAction] = useState<SubmitAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const submitLockRef = useRef(false);
  const submitActionRef = useRef<SubmitAction>('generate-cases');
  const editable = canCreateRequirement(user?.projectRole ?? user?.globalRole);
  const isNewProject = mode === 'new-project';

  useEffect(() => {
    if (isSessionLoading || !user) return;
    if (isNewProject || !projectId) return;

    setIsLoading(true);
    setError(null);
    api.getProjectWorkspace(projectId)
      .then((response) => {
        setWorkspace(response.data);
        form.setFieldsValue({
          projectName: response.data.project.name,
          changeSummary: response.data.latestRequirementVersion?.changeSummary ?? undefined,
          markdown: response.data.latestRequirementVersion?.rawMarkdown ?? '',
        });
      })
      .catch(() => setError('無法載入需求文件摘要，請確認專案或登入權限。'))
      .finally(() => setIsLoading(false));
  }, [form, isNewProject, isSessionLoading, projectId, user]);

  async function handleSubmit(values: RequirementValues) {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    setIsSubmitting(true);
    setError(null);
    try {
      const payload = {
        projectName: values.projectName.trim(),
        markdown: values.markdown.trim(),
        changeSummary: values.changeSummary?.trim() || null,
      };
      const action = isNewProject ? 'generate-cases' : submitActionRef.current;
      setSubmittingAction(action);
      const response = action === 'save-text'
        ? await api.updateCurrentRequirementText(projectId!, payload)
        : isNewProject
        ? await api.createProjectFromRequirement(payload)
        : await api.uploadMarkdownRequirement(projectId!, payload);
      const generatedCount = response.data.generatedTestCaseCount ?? 0;
      if (action === 'save-text') {
        message.success(`已更新文字需求 v${response.data.versionNumber}，未產生新的測試案例`);
        router.push(`/projects/${response.data.projectId}`);
      } else {
        message.success(`已建立需求版本 v${response.data.versionNumber}，產生 ${generatedCount} 筆測試案例草稿`);
        router.push(`/projects/${response.data.projectId}/test-cases/all`);
      }
      router.refresh();
    } catch {
      setError('儲存需求失敗。請確認專案名稱與 Markdown 內容不為空、後端服務已啟動，且目前角色為 PM 或 Admin。');
    } finally {
      submitLockRef.current = false;
      setSubmittingAction(null);
      setIsSubmitting(false);
    }
  }

  function submitWithAction(action: SubmitAction) {
    submitActionRef.current = action;
    form.submit();
  }

  if (!isSessionLoading && !user) {
    return (
      <AppShell title={isNewProject ? '新增需求專案' : '編輯需求'}>
        <Card className="workspace-card" variant="outlined">
          <Alert type="info" showIcon title="需要登入" description="請先建立 dev session，再儲存需求文件。" />
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell title={isNewProject ? '新增需求專案' : '編輯需求'}>
      <div className="editor-page">
        <Card className="workspace-card" variant="outlined">
          <Space className="table-toolbar" align="start" wrap>
            <Space className="section-heading" align="start">
              <span className="heading-icon"><FileTextOutlined /></span>
              <Space orientation="vertical" size={4}>
                <Typography.Title level={2}>{isNewProject ? '新增需求專案' : '編輯 Markdown 文字需求'}</Typography.Title>
                <Typography.Paragraph>
                  {isNewProject
                    ? '送出後會建立新的 project、儲存第一版需求、切分章節、呼叫 AI 產生 test case draft，最後寫回 DB。'
                    : '可只更新文字需求，也可確認需求版本並重新呼叫 AI 產生 test case draft。'}
                </Typography.Paragraph>
              </Space>
            </Space>
            <Button icon={<ArrowLeftOutlined />} href={isNewProject ? '/projects' : `/projects/${projectId}`}>
              {isNewProject ? '返回專案列表' : '返回需求頁'}
            </Button>
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
              <Typography.Title level={2}>
                {isNewProject ? '尚未建立' : workspace?.project.name ?? `Project ${projectId}`}
              </Typography.Title>
              <Typography.Text type="secondary">
                最新版本：{isNewProject ? '送出後建立 v1' : workspace?.latestRequirementVersion ? `v${workspace.latestRequirementVersion.versionNumber}` : '尚未建立'}
              </Typography.Text>
            </Space>

            <Form
              form={form}
              layout="vertical"
              disabled={!editable || isSubmitting || isLoading}
              onFinish={handleSubmit}
              className="requirement-form"
              initialValues={{
                projectName: '',
                markdown: '',
              }}
            >
              <Form.Item
                label="Project 標題"
                name="projectName"
                rules={[{ required: true, whitespace: true, message: '請輸入 Project 標題' }]}
              >
                <Input placeholder="例如：購物車商品數量計算" />
              </Form.Item>
              <Form.Item label="內容摘要" name="changeSummary">
                <Input placeholder="例如：新增登入輸入驗證規則" />
              </Form.Item>
              <Form.Item
                label="Markdown 需求內容"
                name="markdown"
                rules={[{ required: true, whitespace: true, message: '請輸入 Markdown 需求內容' }]}
              >
                <Input.TextArea placeholder={`例如：##欲作為需求分區的標題\n\n功能名稱新增：\n\n使用者列表搜尋\n\n搜尋結果應顯示：\n\n使用者 ID、使用者姓名、Email、帳號狀態 etc\n\n`} rows={18} />
              </Form.Item>
              <Space wrap>
                {!isNewProject && (
                  <Button
                    icon={<SaveOutlined />}
                    loading={isSubmitting && submittingAction === 'save-text'}
                    onClick={() => submitWithAction('save-text')}
                  >
                    更新文字需求
                  </Button>
                )}
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  loading={isSubmitting && submittingAction === 'generate-cases'}
                  onClick={() => submitWithAction('generate-cases')}
                >
                  {isNewProject ? '建立專案並產生測試案例' : '確認需求版本並產生測試案例'}
                </Button>
              </Space>
            </Form>
          </Card>
        </Spin>
      </div>
    </AppShell>
  );
}
