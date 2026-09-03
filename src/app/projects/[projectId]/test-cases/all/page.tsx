'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeftOutlined, EditOutlined, FileTextOutlined } from '@ant-design/icons';
import { Button, Card, Descriptions, Progress, Space, Table, Tag, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { AppShell } from '@/components/app-shell';

type MockCaseStatus = 'draft' | 'published' | 'rejected';
type MockPassFailResult = 'pass' | 'fail' | 'hold' | 'untested';

interface MockTestCase {
  id: string;
  code: string;
  title: string;
  sourceSection: string;
  status: MockCaseStatus;
  priority: 'P0' | 'P1' | 'P2';
  level: 'unit' | 'integration' | 'e2e';
  currentRevision: number;
  publishedRevision: number | null;
  description: string;
  preconditions: string;
  expectedResult: string;
  passFailResult: MockPassFailResult;
  resultUpdatedBy: string | null;
  owner: string;
  updatedAt: string;
}

const mockTestCases: MockTestCase[] = [
  {
    id: '101',
    code: 'TC-MD-001',
    title: '成功上傳 Markdown 並建立需求版本',
    sourceSection: 'Markdown 需求上傳與版本保存',
    status: 'published',
    priority: 'P0',
    level: 'integration',
    currentRevision: 3,
    publishedRevision: 3,
    description: 'PM 上傳合法 Markdown 後，系統建立新的 Requirement Version 並解析章節。',
    preconditions: '使用者為 PM；project 已存在；上傳檔案副檔名為 .md。',
    expectedResult: '版本列表出現新版本，章節檢閱頁可看到解析後的 heading 與 section order。',
    passFailResult: 'pass',
    resultUpdatedBy: 'Dev Ken',
    owner: 'QA Mia',
    updatedAt: '2026-09-03 10:20',
  },
  {
    id: '102',
    code: 'TC-MD-002',
    title: '拒絕非 Markdown 格式檔案',
    sourceSection: 'Markdown 需求上傳與版本保存',
    status: 'draft',
    priority: 'P1',
    level: 'unit',
    currentRevision: 1,
    publishedRevision: null,
    description: '使用者上傳 Word、PDF 或空檔案時，系統應阻止建立有效需求版本。',
    preconditions: '使用者為 PM；目前停留在需求版本頁；準備非 Markdown 檔案。',
    expectedResult: '系統顯示格式錯誤，不建立 Requirement Version，也不觸發章節解析。',
    passFailResult: 'untested',
    resultUpdatedBy: null,
    owner: 'PM Janet',
    updatedAt: '2026-09-03 10:34',
  },
  {
    id: '103',
    code: 'TC-RG-001',
    title: '僅重新生成已修改章節的 AI 草稿',
    sourceSection: '變更章節的局部重新生成',
    status: 'draft',
    priority: 'P0',
    level: 'e2e',
    currentRevision: 2,
    publishedRevision: null,
    description: '需求文件更新後，使用者只能針對 changed section 重新生成 AI draft。',
    preconditions: 'project 已有 v1 與 v2 需求版本；其中一個 section 被標記為 modified。',
    expectedResult: '只有修改章節產生新草稿，未變更章節維持既有 test case 內容。',
    passFailResult: 'hold',
    resultUpdatedBy: 'QA Mia',
    owner: 'QA Mia',
    updatedAt: '2026-09-03 11:12',
  },
  {
    id: '104',
    code: 'TC-REVIEW-001',
    title: 'QA 編輯 AI 草稿後保留最新更新者',
    sourceSection: 'QA Review 與案例編修',
    status: 'published',
    priority: 'P1',
    level: 'integration',
    currentRevision: 4,
    publishedRevision: 4,
    description: 'QA 可編修 AI draft 的 title、steps、expected result，並留下最新更新者。',
    preconditions: '使用者為 QA；case 狀態為 Draft；case 有 AI 產生的初始版本。',
    expectedResult: '儲存後建立新 revision，latest updater 顯示 QA，發布後團隊可見。',
    passFailResult: 'pass',
    resultUpdatedBy: 'Dev Lee',
    owner: 'QA Mia',
    updatedAt: '2026-09-03 13:45',
  },
  {
    id: '105',
    code: 'TC-PUB-001',
    title: 'PM 將案例退回 Draft 後可再次編修',
    sourceSection: '發布狀態與權限規則',
    status: 'rejected',
    priority: 'P2',
    level: 'e2e',
    currentRevision: 2,
    publishedRevision: 1,
    description: 'PM 可將 Published 案例退回 Draft，保留 stable case code 與歷史版本脈絡。',
    preconditions: '使用者為 PM；case 已發布；目前存在 published revision。',
    expectedResult: '案例狀態變為 Draft 或退回狀態，後續仍可接續編修並再次發布。',
    passFailResult: 'fail',
    resultUpdatedBy: 'Developer User',
    owner: 'PM Janet',
    updatedAt: '2026-09-02 17:08',
  },
];

function statusLabel(status: MockCaseStatus) {
  return { draft: '草稿', published: '已發布', rejected: '已退回' }[status];
}

function statusColor(status: MockCaseStatus) {
  return { draft: 'blue', published: 'green', rejected: 'red' }[status];
}

function resultLabel(result: MockPassFailResult) {
  return { pass: '通過', fail: '失敗', hold: '暫緩', untested: '未測試' }[result];
}

function resultColor(result: MockPassFailResult) {
  return { pass: 'green', fail: 'red', hold: 'orange', untested: 'default' }[result];
}

function buildColumns(projectId: string): ColumnsType<MockTestCase> {
  return [
    {
      title: 'Test Case 與版本內容',
      key: 'case',
      width: 460,
      render: (_, testCase) => (
        <Space orientation="vertical" size={8} className="full-width">
          <Space wrap>
            <Typography.Text strong>{testCase.code}</Typography.Text>
            <Tag color="gold">{testCase.priority}</Tag>
            <Tag color="purple">{testCase.level}</Tag>
          </Space>
          <Link className="project-link" href={`/projects/${projectId}/test-cases/${testCase.id}`}>{testCase.title}</Link>
          <Descriptions
            className="compact-descriptions"
            column={1}
            size="small"
            items={[
              { key: 'description', label: '測試描述', children: testCase.description },
              { key: 'preconditions', label: '前置條件', children: testCase.preconditions },
              { key: 'expected', label: '預期結果', children: testCase.expectedResult },
            ]}
          />
        </Space>
      ),
    },
    {
      title: '來源需求',
      dataIndex: 'sourceSection',
      key: 'sourceSection',
      width: 220,
    },
    {
      title: '版本',
      key: 'version',
      width: 150,
      render: (_, testCase) => (
        <Space orientation="vertical" size={4}>
          <Tag>目前 v{testCase.currentRevision}</Tag>
          <Tag color={testCase.publishedRevision ? 'green' : 'default'}>
            {testCase.publishedRevision ? `已發布 v${testCase.publishedRevision}` : '尚未發布'}
          </Tag>
        </Space>
      ),
    },
    {
      title: '發布狀態',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: MockCaseStatus) => <Tag color={statusColor(status)}>{statusLabel(status)}</Tag>,
    },
    {
      title: '人工結果',
      key: 'manualResult',
      width: 150,
      render: (_, testCase) => (
        <Space orientation="vertical" size={4}>
          <Tag color={resultColor(testCase.passFailResult)}>{resultLabel(testCase.passFailResult)}</Tag>
          <Typography.Text type="secondary">{testCase.resultUpdatedBy ?? '尚無更新者'}</Typography.Text>
        </Space>
      ),
    },
    {
      title: '負責/更新',
      key: 'owner',
      width: 150,
      render: (_, testCase) => (
        <Space orientation="vertical" size={4}>
          <Typography.Text>{testCase.owner}</Typography.Text>
          <Typography.Text type="secondary">{testCase.updatedAt}</Typography.Text>
        </Space>
      ),
    },
    {
      title: '',
      key: 'action',
      width: 110,
      render: (_, testCase) => (
        <Button type="text" icon={<EditOutlined />} href={`/projects/${projectId}/test-cases/${testCase.id}`}>
          編輯
        </Button>
      ),
    },
  ];
}

export default function AllTestCasesPage() {
  const params = useParams<{ projectId: string }>();
  const publishedCount = mockTestCases.filter((testCase) => testCase.status === 'published').length;
  const completionRate = Math.round((publishedCount / mockTestCases.length) * 100);

  return (
    <AppShell title="全部 Test Case">
      <div className="project-overview">
        <Card className="workspace-card" variant="outlined">
          <Space className="table-toolbar" align="center" wrap>
            <Space className="section-heading" align="start">
              <span className="heading-icon"><FileTextOutlined /></span>
              <Space orientation="vertical" size={4}>
                <Typography.Title level={2}>Project {params.projectId} 的全部 Test Case</Typography.Title>
                <Typography.Paragraph>
                  這裡保留平鋪總表，直接顯示版本化內容、發布狀態與人工通過/失敗結果。
                </Typography.Paragraph>
              </Space>
            </Space>
            <Button icon={<ArrowLeftOutlined />} href={`/projects/${params.projectId}/test-cases`}>
              回需求分組
            </Button>
          </Space>
        </Card>

        <Card className="workspace-card" variant="outlined">
          <Space className="table-toolbar" align="center" wrap>
            <Space orientation="vertical" size={2}>
              <Typography.Text strong>全部案例總表</Typography.Text>
              <Typography.Text type="secondary">展示用 mock data，後續可改接 GET /projects/{'{projectId}'}/test-cases</Typography.Text>
            </Space>
            <div className="case-progress">
              <Typography.Text type="secondary">已發布比例</Typography.Text>
              <Progress percent={completionRate} size="small" />
            </div>
          </Space>
          <Table
            rowKey="id"
            columns={buildColumns(params.projectId)}
            dataSource={mockTestCases}
            pagination={false}
            scroll={{ x: 1360 }}
          />
        </Card>
      </div>
    </AppShell>
  );
}
