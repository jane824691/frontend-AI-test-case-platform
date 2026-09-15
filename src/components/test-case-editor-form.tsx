'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeftOutlined, EditOutlined, PlusOutlined, SaveOutlined, SendOutlined } from '@ant-design/icons';
import { Alert, App, Button, Card, Checkbox, Form, Input, Select, Space, Spin, Tag, Typography } from 'antd';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';
import type { ProjectWorkspace, TestCaseDetail, TestCaseEditorPayload } from '@/lib/contracts';
import { useSessionStore } from '@/stores/session-store';

type EditorMode = 'create' | 'edit';

interface EditorValues {
  requirementSectionId: number | null;
  stableCaseCode?: string;
  title: string;
  description: string;
  preconditions?: string;
  expectedResult: string;
  priority: string;
  suggestedTestLevel: string;
  reusabilityNote?: string;
  unitTestRecommended: boolean;
}

function canEditCase(role?: string) {
  return role === 'admin' || role === 'pm' || role === 'qa';
}

function statusLabel(status: string) {
  return { draft: 'Draft', published: 'Published', rejected: 'Rejected' }[status] ?? status;
}

function toPayload(values: EditorValues): TestCaseEditorPayload {
  return {
    requirementSectionId: values.requirementSectionId ?? null,
    stableCaseCode: values.stableCaseCode?.trim() || undefined,
    title: values.title.trim(),
    description: values.description.trim(),
    preconditions: values.preconditions?.trim() || null,
    expectedResult: values.expectedResult.trim(),
    priority: values.priority,
    suggestedTestLevel: values.suggestedTestLevel,
    reusabilityNote: values.reusabilityNote?.trim() || null,
    unitTestRecommended: values.unitTestRecommended,
  };
}

function buildInitialValues(detail: TestCaseDetail | null): EditorValues {
  return {
    requirementSectionId: detail?.requirementSectionId ?? null,
    stableCaseCode: detail?.stableCaseCode,
    title: detail?.latestVersion.title ?? '',
    description: detail?.latestVersion.description ?? '',
    preconditions: detail?.latestVersion.preconditions ?? '',
    expectedResult: detail?.latestVersion.expectedResult ?? '',
    priority: detail?.latestVersion.priority ?? 'medium',
    suggestedTestLevel: detail?.latestVersion.suggestedTestLevel ?? 'integration',
    reusabilityNote: detail?.latestVersion.reusabilityNote ?? '',
    unitTestRecommended: detail?.latestVersion.unitTestRecommended ?? false,
  };
}

export function TestCaseEditorForm({
  mode,
  projectId,
  caseId,
}: {
  mode: EditorMode;
  projectId: string;
  caseId?: string;
}) {
  const router = useRouter();
  const { message } = App.useApp();
  const { user, isLoading: isSessionLoading } = useSessionStore();
  const [form] = Form.useForm<EditorValues>();
  const [workspace, setWorkspace] = useState<ProjectWorkspace | null>(null);
  const [detail, setDetail] = useState<TestCaseDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editable = canEditCase(user?.projectRole ?? user?.globalRole);
  const pageTitle = mode === 'create' ? '新增測試案例' : '測試案例編輯器';

  useEffect(() => {
    if (isSessionLoading || !user) return;

    setIsLoading(true);
    setError(null);
    const detailRequest = mode === 'edit' && caseId ? api.getTestCaseDetail(projectId, caseId) : Promise.resolve(null);

    Promise.all([api.getProjectWorkspace(projectId), detailRequest])
      .then(([workspaceResponse, detailResponse]) => {
        setWorkspace(workspaceResponse.data);
        const loadedDetail = detailResponse?.data ?? null;
        setDetail(loadedDetail);
        const requestedSectionId = Number(new URLSearchParams(window.location.search).get('sectionId'));
        const firstSectionId = Number.isInteger(requestedSectionId) && requestedSectionId > 0
          ? requestedSectionId
          : workspaceResponse.data.sections[0]?.requirementSectionId ?? null;
        form.setFieldsValue(
          mode === 'create'
            ? {
                requirementSectionId: firstSectionId,
                priority: 'medium',
                suggestedTestLevel: 'integration',
                unitTestRecommended: false,
              }
            : buildInitialValues(loadedDetail),
        );
      })
      .catch(() => setError('無法載入編輯器資料，請確認專案、測試案例或登入權限。'))
      .finally(() => setIsLoading(false));
  }, [caseId, form, isSessionLoading, mode, projectId, user]);

  const sectionOptions = useMemo(
    () => workspace?.sections.map((section) => ({
      label: `${section.heading} (${section.sectionKey})`,
      value: section.requirementSectionId,
    })) ?? [],
    [workspace],
  );

  async function handleSubmit(values: EditorValues) {
    setIsSaving(true);
    setError(null);
    try {
      const payload = toPayload(values);
      const response = mode === 'create'
        ? await api.createTestCase(projectId, payload)
        : await api.updateTestCase(projectId, caseId!, payload);

      if (mode === 'create') {
        await api.publishTestCase(projectId, response.data.testCaseId, 'Manual test case reviewed and published on creation.');
      }

      message.success(mode === 'create' ? '已建立並發布手動測試案例' : '已儲存測試案例');
      router.push(`/projects/${projectId}/test-cases/${response.data.testCaseId}`);
      router.refresh();
    } catch {
      setError('儲存失敗。請確認必填欄位完整，且目前角色具有建立或編輯測試案例的權限。');
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePublish() {
    if (!caseId) return;

    setIsPublishing(true);
    setError(null);
    try {
      const values = await form.validateFields();
      await api.updateTestCase(projectId, caseId, toPayload(values));
      await api.publishTestCase(projectId, caseId, 'Published from editor.');
      message.success('已儲存變更並發布測試案例');
      router.refresh();
    } catch {
      setError('發布失敗。請確認必填欄位完整，且目前角色具有編輯與發布測試案例的權限。');
    } finally {
      setIsPublishing(false);
    }
  }

  if (!isSessionLoading && !user) {
    return (
      <AppShell title={pageTitle}>
        <Card className="workspace-card" variant="outlined">
          <Alert type="info" showIcon title="需要登入" description="請先建立 dev session，再進入測試案例編輯器。" />
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell title={pageTitle}>
      <div className="editor-page">
        <Card className="workspace-card" variant="outlined">
          <Space className="table-toolbar" align="start" wrap>
            <Space className="section-heading" align="start">
              <span className="heading-icon">{mode === 'create' ? <PlusOutlined /> : <EditOutlined />}</span>
              <Space orientation="vertical" size={4}>
                <Typography.Title level={2}>
                  {mode === 'create' ? '手動新增 Test Case' : detail?.latestVersion.title ?? '編輯測試案例'}
                </Typography.Title>
                <Typography.Paragraph>
                  {mode === 'create'
                    ? 'PM 或 QA 手動補上的案例會在儲存後直接發布，作為已審閱的團隊可見案例。'
                    : '新增與編輯共用同一組欄位；AI 產生的草稿仍由 PM/QA 人工確認後才可發布。'}
                </Typography.Paragraph>
              </Space>
            </Space>
            <Space wrap>
              {detail && <Tag color="blue">{statusLabel(detail.currentStatus)}</Tag>}
              <Button icon={<ArrowLeftOutlined />} href={`/projects/${projectId}/test-cases`}>返回列表</Button>
            </Space>
          </Space>
        </Card>

        {error && <Alert type="error" showIcon title="操作未完成" description={error} />}
        {!editable && (
          <Alert
            type="warning"
            showIcon
            title="唯讀模式"
            description="Developer 可以檢視測試案例，但不能新增或編輯核心案例內容。"
          />
        )}

        <Card className="workspace-card" variant="outlined">
          <Spin spinning={isSessionLoading || isLoading}>
            <Form
              form={form}
              layout="vertical"
              disabled={!editable || isSaving}
              onFinish={handleSubmit}
              className="case-editor-form"
            >
              <div className="editor-grid">
                <Form.Item
                  label="需求章節"
                  name="requirementSectionId"
                  rules={[{ required: true, message: '請選擇測試案例對應的需求章節' }]}
                >
                  <Select options={sectionOptions} placeholder="選擇需求章節" />
                </Form.Item>
                <Form.Item label="Stable Case Code" name="stableCaseCode">
                  <Input placeholder="例如 TC-CHECKOUT-001；未填時可由後端產生" />
                </Form.Item>
              </div>

              <Form.Item label="標題" name="title" rules={[{ required: true, message: '請輸入測試案例標題' }]}>
                <Input placeholder="描述此案例要驗證的行為" />
              </Form.Item>

              <Form.Item label="描述" name="description" rules={[{ required: true, message: '請輸入測試案例描述' }]}>
                <Input.TextArea rows={4} placeholder="說明使用者操作、系統情境或要覆蓋的功能點" />
              </Form.Item>

              <Form.Item label="前置條件" name="preconditions">
                <Input.TextArea rows={3} placeholder="例如帳號狀態、資料準備、環境條件" />
              </Form.Item>

              <Form.Item label="預期結果" name="expectedResult" rules={[{ required: true, message: '請輸入預期結果' }]}>
                <Input.TextArea rows={4} placeholder="以可驗證的語句描述成功或失敗判斷" />
              </Form.Item>

              <div className="editor-grid">
                <Form.Item label="建議優先級" name="priority" rules={[{ required: true, message: '請選擇優先級' }]}>
                  <Select
                    options={[
                      { label: 'p1', value: 'high' },
                      { label: 'p2', value: 'medium' },
                      { label: 'p3', value: 'low' },
                    ]}
                  />
                </Form.Item>
                <Form.Item label="建議測試層級" name="suggestedTestLevel" rules={[{ required: true, message: '請選擇測試層級' }]}>
                  <Select
                    options={[
                      { label: 'Unit', value: 'unit' },
                      { label: 'Integration', value: 'integration' },
                      { label: 'E2E', value: 'e2e' },
                    ]}
                  />
                </Form.Item>
              </div>

              <Form.Item label="可重用/共用功能備註" name="reusabilityNote">
                <Input.TextArea rows={3} placeholder="標記適合抽成共用驗證、元件或單元測試的行為" />
              </Form.Item>

              <Form.Item name="unitTestRecommended" valuePropName="checked">
                <Checkbox>建議補上單元測試</Checkbox>
              </Form.Item>

              <Space wrap>
                <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={isSaving}>
                  {mode === 'create' ? '建立並發布' : '儲存變更'}
                </Button>
                {mode === 'edit' && editable && (
                  <Button icon={<SendOutlined />} onClick={handlePublish} loading={isPublishing}>
                    發布
                  </Button>
                )}
              </Space>
            </Form>
          </Spin>
        </Card>
      </div>
    </AppShell>
  );
}
