"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, Button, Card, Empty, Spin, Table, Tag, Typography, message } from "antd";
import { SyncOutlined } from "@ant-design/icons";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";
import type { CiRunSummary, CiTestResult } from "@/lib/contracts";
import { useSessionStore } from "@/stores/session-store";

export default function CiRunsPage() {
  const params = useParams<{ projectId: string }>();
  const { user } = useSessionStore();
  const [messageApi, messageContextHolder] = message.useMessage();
  const [runs, setRuns] = useState<CiRunSummary[]>([]);
  const [testResultsByRun, setTestResultsByRun] = useState<Record<number, CiTestResult[] | undefined>>({});
  const [error, setError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [summary, setSummary] = useState<{ scannedRunCount: number; syncedRunCount: number; skippedRunCount: number; failedRunCount: number } | null>(null);
  const role = user?.projectRole ?? user?.globalRole;
  const canSync = role === "admin" || role === "developer";

  const loadRuns = useCallback(async () => {
    try {
      const response = await api.listCiRuns(params.projectId);
      setRuns(response.data.items);
      setTestResultsByRun({});
      setError(null);
    } catch {
      setError("無法載入 CI 執行紀錄。");
    }
  }, [params.projectId]);

  useEffect(() => {
    void loadRuns();
  }, [loadRuns]);

  async function sync() {
    setSyncing(true);
    setError(null);
    try {
      const response = await api.syncCiRuns(params.projectId);
      setSummary(response.data);
      messageApi.success("GitHub CI 結果同步完成");
      await loadRuns();
    } catch {
      setError("同步失敗。請確認 PAT、Workflow ID、Artifact 名稱與後端日誌。");
    } finally {
      setSyncing(false);
    }
  }

  async function loadTestResults(ciRunId: number) {
    if (testResultsByRun[ciRunId] !== undefined) return;
    try {
      const response = await api.listCiTestResults(params.projectId, ciRunId);
      setTestResultsByRun((current) => ({ ...current, [ciRunId]: response.data.items }));
    } catch {
      setError("無法載入此 CI Run 的測試案例結果。");
    }
  }

  function outcomeTag(outcome: CiTestResult["outcome"]) {
    if (outcome === "passed") return <Tag color="green">通過</Tag>;
    if (outcome === "failed" || outcome === "error") return <Tag color="red">未通過</Tag>;
    return <Tag color="gold">略過</Tag>;
  }
  return (
    <AppShell title="CI 執行紀錄">
      {messageContextHolder}
      {error && <Alert className="workspace-card" type="error" showIcon message={error} />}
      <Card
        className="workspace-card"
        title="GitHub Actions 執行紀錄"
        extra={canSync ? <Button type="primary" icon={<SyncOutlined />} loading={syncing} onClick={() => void sync()}>同步 GitHub CI 結果</Button> : null}
      >
        {summary && <Alert className="mb-4" type={summary.failedRunCount > 0 ? "warning" : "success"} showIcon message={`已掃描 ${summary.scannedRunCount} 次；新匯入 ${summary.syncedRunCount} 次；已略過 ${summary.skippedRunCount} 次；失敗 ${summary.failedRunCount} 次。`} />}
        {!canSync && <Alert className="mb-4" type="info" showIcon message="僅 Admin 或 Developer 可手動同步；你仍可閱讀同步結果。" />}
        <Table<CiRunSummary>
          rowKey="ciRunId"
          dataSource={runs.filter((run) => run.ingestionStatus === "ingested")}
          pagination={false}
          locale={{ emptyText: <Empty description="尚未收到可解析的 Jest／JUnit 測試報告。" /> }}
          expandable={{
            onExpand: (expanded, record) => {
              if (expanded) void loadTestResults(record.ciRunId);
            },
            expandedRowRender: (record) => {
              const testResults = testResultsByRun[record.ciRunId];
              if (!testResults) return <Spin size="small" />;
              if (testResults.length === 0) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="此報告沒有含 [TC-...] 前綴的測試案例。" />;
              return (
                <Table<CiTestResult>
                  rowKey="ciTestResultId"
                  size="small"
                  pagination={false}
                  dataSource={testResults}
                  columns={[
                    { title: "Test Case ID", dataIndex: "testIdentifier", render: (value: string) => <Typography.Text code>{value}</Typography.Text> },
                    { title: "案例名稱", dataIndex: "testName" },
                    { title: "結果", dataIndex: "outcome", render: (value: CiTestResult["outcome"]) => outcomeTag(value) },
                    { title: "耗時", dataIndex: "durationMs", render: (value: number | null) => value === null ? "—" : `${value} ms` },
                    { title: "失敗訊息", dataIndex: "failureMessage", render: (value: string | null) => value ? <Typography.Text type="danger">{value}</Typography.Text> : "—" },
                  ]}
                />
              );
            },
          }}
          columns={[
            { title: "工作流程", dataIndex: "workflowIdentifier" },
            { title: "分支", dataIndex: "branchName" },
            {
              title: "Commit",
              dataIndex: "commitSha",
              render: (sha: string) => (
                <Typography.Text code>{sha ? sha.slice(0, 12) : "—"}</Typography.Text>
              ),
            },
            {
              title: "執行結果",
              dataIndex: "conclusion",
              render: (value: string | null) => (
                <Tag color={value === "success" ? "green" : "red"}>
                  {value === "success"
                    ? "成功"
                    : value === "failure"
                      ? "失敗"
                      : "處理中"}
                </Tag>
              ),
            },
            {
              title: "符合驗證範圍",
              dataIndex: "withinVerificationScope",
              render: (value: boolean) => (
                <Tag color={value ? "blue" : "default"}>
                  {value ? "是" : "否"}
                </Tag>
              ),
            },
            { title: "報告匯入狀態", dataIndex: "ingestionStatus", render: (status: string) => <Tag color={status === "ingested" ? "green" : status === "failed" ? "red" : "gold"}>{status === "ingested" ? "已匯入" : status === "failed" ? "匯入失敗" : "等待報告"}</Tag> },
            { title: "錯誤原因", dataIndex: "errorMessage", render: (value: string | null) => value ? <Typography.Text type="danger">{value}</Typography.Text> : "—" },
          ]}
        />
      </Card>
    </AppShell>
  );
}
