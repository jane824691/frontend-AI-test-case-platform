"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Card, Form, Input, InputNumber, message, Spin } from "antd";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";
import { useSessionStore } from "@/stores/session-store";

export default function CiSettingsPage() {
  const params = useParams<{ projectId: string }>();
  const { user } = useSessionStore();
  const [form] = Form.useForm();
  const [messageApi, messageContextHolder] = message.useMessage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const role = user?.projectRole ?? user?.globalRole;
  const canManage = role === "admin" || role === "developer";
  useEffect(() => {
    void api
      .getCiSettings(params.projectId)
      .then((response) => {
        if (response.data) {
          form.setFieldsValue(response.data);
        }
      })
      .catch(() => setError("Unable to load CI settings."))
      .finally(() => setLoading(false));
  }, [form, params.projectId]);
  return (
    <AppShell title="Project CI 設定">
      {messageContextHolder}
      <Card className="workspace-card" title="GitHub Actions 驗證設定">
        <Spin spinning={loading}>
          {error && <Alert type="error" showIcon message={error} />}
          {!canManage && <Alert className="mb-4" type="info" showIcon message="僅 Admin 或 Developer 可修改 CI 設定。" />}
          <Form
            form={form}
            layout="vertical"
            disabled={!canManage}
            onFinish={(values) =>
              api
                .updateCiSettings(params.projectId, values)
                .then(() => {
                  setError(null);
                  messageApi.success("儲存成功");
                })
                .catch(() => setError("無法儲存 CI 設定。請確認必填欄位與後端加密金鑰。"))
            }
          >
            <Form.Item
              name="workflowId"
              label="GitHub Actions Workflow ID"
              rules={[{ required: true }]}
            >
              <InputNumber className="full-width" />
            </Form.Item>
            <Form.Item
              name="repositoryOwner"
              label="Repository 擁有者"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="repositoryName"
              label="Repository 名稱"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="defaultBranch"
              label="預設分支"
              initialValue="main"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="workflowDisplayName"
              label="GitHub Actions 工作流程顯示名稱"
              extra="填入顯示名稱，例如 frontend-unit-tests；實際同步會以 Workflow ID 查詢。"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="junitArtifactName"
              label="測試報告 Artifact 名稱"
              extra="GitHub Actions 上傳單一 Jest JSON 或 JUnit XML 報告時使用的 artifact 名稱。"
              initialValue="ai-test-platform-junit"
            >
              <Input />
            </Form.Item>
            <Alert className="mb-4" type="info" showIcon message="PAT 僅由後端環境變數 GITHUB_ACTIONS_PAT 提供，不會透過本頁面或 API 儲存、更新或讀取。" />
            <Button type="primary" htmlType="submit">
              儲存 CI 設定
            </Button>
          </Form>
        </Spin>
      </Card>
    </AppShell>
  );
}
