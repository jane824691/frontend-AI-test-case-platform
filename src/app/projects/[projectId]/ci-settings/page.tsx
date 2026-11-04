'use client';

import { useEffect, useState } from 'react';
import { Alert, Button, Card, Form, Input, InputNumber, Spin } from 'antd';
import { useParams } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { api } from '@/lib/api';

export default function CiSettingsPage() {
  const params = useParams<{ projectId: string }>();
  const [form] = Form.useForm(); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { void api.getCiSettings(params.projectId).then((response) => { if (response.data) form.setFieldsValue(response.data); }).catch(() => setError('Unable to load CI settings.')).finally(() => setLoading(false)); }, [form, params.projectId]);
  return <AppShell title="Project CI settings"><Card className="workspace-card" title="GitHub Actions verification"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} />}<Form form={form} layout="vertical" onFinish={(values) => api.updateCiSettings(params.projectId, values).catch(() => setError('Unable to save CI settings.'))}>
    <Form.Item name="githubInstallationId" label="GitHub App installation ID" rules={[{ required: true }]}><InputNumber className="full-width" /></Form.Item><Form.Item name="repositoryOwner" label="Repository owner" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="repositoryName" label="Repository name" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="defaultBranch" label="Default branch" initialValue="main" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="workflowIdentifier" label="Workflow name" rules={[{ required: true }]}><Input /></Form.Item><Form.Item name="junitArtifactName" label="JUnit artifact name" initialValue="ai-test-platform-junit"><Input /></Form.Item><Button type="primary" htmlType="submit">Save CI settings</Button>
  </Form></Spin></Card></AppShell>;
}
