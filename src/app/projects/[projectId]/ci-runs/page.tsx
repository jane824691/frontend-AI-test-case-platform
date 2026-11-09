"use client";

import { useEffect, useState } from "react";
import { Alert, Card, Empty, Table, Tag, Typography } from "antd";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { api } from "@/lib/api";
import type { CiRunSummary } from "@/lib/contracts";

export default function CiRunsPage() {
  const params = useParams<{ projectId: string }>();
  const [runs, setRuns] = useState<CiRunSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void api
      .listCiRuns(params.projectId)
      .then((response) => setRuns(response.data.items))
      .catch(() => setError("Unable to load CI runs."));
  }, [params.projectId]);
  return (
    <AppShell title="CI 執行紀錄">
      {error && <Alert type="error" showIcon message={error} />}
      <Card className="workspace-card" title="GitHub Actions 執行紀錄">
        <Table<CiRunSummary>
          rowKey="ciRunId"
          dataSource={runs}
          pagination={false}
          locale={{ emptyText: <Empty description="尚未收到 CI 執行紀錄。" /> }}
          columns={[
            { title: "工作流程", dataIndex: "workflowIdentifier" },
            { title: "分支", dataIndex: "branchName" },
            {
              title: "Commit",
              dataIndex: "commitSha",
              render: (sha: string) => (
                <Typography.Text code>{sha.slice(0, 12)}</Typography.Text>
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
              title: "符合驗證規則",
              dataIndex: "eligibleForVerification",
              render: (value: boolean) => (
                <Tag color={value ? "blue" : "default"}>
                  {value ? "是" : "否"}
                </Tag>
              ),
            },
            { title: "JUnit 匯入狀態", dataIndex: "ingestionStatus" },
          ]}
        />
      </Card>
    </AppShell>
  );
}
