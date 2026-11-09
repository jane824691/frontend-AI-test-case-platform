"use client";

import { useEffect, useState } from "react";
import { Alert, Button, Card, Form, Input, InputNumber, Spin } from "antd";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";

export default function CiSettingsPage() {
  const params = useParams<{ projectId: string }>();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void api
      .getCiSettings(params.projectId)
      .then((response) => {
        if (response.data) form.setFieldsValue(response.data);
      })
      .catch(() => setError("Unable to load CI settings."))
      .finally(() => setLoading(false));
  }, [form, params.projectId]);
  return (
    <AppShell title="Project CI 設定">
      <Card className="workspace-card" title="GitHub Actions 驗證設定">
        <Spin spinning={loading}>
          {error && <Alert type="error" showIcon message={error} />}
          <Form
            form={form}
            layout="vertical"
            onFinish={(values) =>
              api
                .updateCiSettings(params.projectId, values)
                .catch(() => setError("無法儲存 CI 設定。"))
            }
          >
            <Form.Item
              name="githubInstallationId"
              label="GitHub App 安裝 ID"
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
              name="workflowIdentifier"
              label="GitHub Actions 工作流程檔名"
              extra="填入 workflow 檔名，例如 frontend-unit-tests.yml；這不是 JUnit 或 coverage 報告檔。"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="junitArtifactName"
              label="JUnit 報告 Artifact 名稱"
              extra="GitHub Actions 上傳 JUnit XML 時使用的 artifact 名稱，例如 ai-test-platform-junit。"
              initialValue="ai-test-platform-junit"
            >
              <Input />
            </Form.Item>
            <Button type="primary" htmlType="submit">
              儲存 CI 設定
            </Button>
          </Form>
        </Spin>
      </Card>
    </AppShell>
  );
}
