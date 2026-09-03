'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowRightOutlined, FileTextOutlined, ProfileOutlined } from '@ant-design/icons';
import { Button, Card, Col, Row, Space, Tag, Typography } from 'antd';
import { AppShell } from '@/components/app-shell';

type MockCaseStatus = 'draft' | 'published' | 'rejected';

interface MockTestCase {
  id: string;
  code: string;
  title: string;
  focus: string;
  status: MockCaseStatus;
  priority: 'P0' | 'P1' | 'P2';
  level: 'unit' | 'integration' | 'e2e';
  owner: string;
  updatedAt: string;
}

interface MockRequirementGroup {
  id: string;
  title: string;
  summary: string;
  changeType: '新增' | '修改' | '未變更';
  testCases: MockTestCase[];
}

const requirementGroups: MockRequirementGroup[] = [
  {
    id: 'markdown-upload',
    title: 'Markdown 需求上傳與版本保存',
    summary: 'PM 上傳 Markdown 後建立 Requirement Version，系統保留歷史版本並解析章節。',
    changeType: '修改',
    testCases: [
      {
        id: '101',
        code: 'TC-MD-001',
        title: '成功上傳 Markdown 並建立需求版本',
        focus: '確認 PM 上傳合法 Markdown 後，系統會建立 requirement version 並解析章節。',
        status: 'published',
        priority: 'P0',
        level: 'integration',
        owner: 'QA Mia',
        updatedAt: '2026-09-03 10:20',
      },
      {
        id: '102',
        code: 'TC-MD-002',
        title: '拒絕非 Markdown 格式檔案',
        focus: '確認 Word、PDF 或空檔案不會被存成有效需求版本。',
        status: 'draft',
        priority: 'P1',
        level: 'unit',
        owner: 'PM Janet',
        updatedAt: '2026-09-03 10:34',
      },
    ],
  },
  {
    id: 'partial-regeneration',
    title: '變更章節的局部重新生成',
    summary: '需求文件更新後，只針對變更章節提供重新生成，不覆蓋未變更章節的案例。',
    changeType: '新增',
    testCases: [
      {
        id: '103',
        code: 'TC-RG-001',
        title: '僅重新生成已修改章節的 AI 草稿',
        focus: '確認需求文件更新後，未變更章節不會被整批覆蓋。',
        status: 'draft',
        priority: 'P0',
        level: 'e2e',
        owner: 'QA Mia',
        updatedAt: '2026-09-03 11:12',
      },
    ],
  },
  {
    id: 'review-workflow',
    title: 'QA Review 與案例編修',
    summary: 'QA 可調整 AI 產生的草稿內容，PM 也能接續編修並發布。',
    changeType: '未變更',
    testCases: [
      {
        id: '104',
        code: 'TC-REVIEW-001',
        title: 'QA 編輯 AI 草稿後保留最新更新者',
        focus: '確認 QA 修改 title、steps、expected result 後，系統記錄 QA 身分。',
        status: 'published',
        priority: 'P1',
        level: 'integration',
        owner: 'QA Mia',
        updatedAt: '2026-09-03 13:45',
      },
    ],
  },
  {
    id: 'publish-policy',
    title: '發布狀態與權限規則',
    summary: 'Published 是團隊可見的正式案例；PM 與 Admin 可將案例退回 Draft。',
    changeType: '修改',
    testCases: [
      {
        id: '105',
        code: 'TC-PUB-001',
        title: 'PM 將案例退回 Draft 後可再次編修',
        focus: '確認 Published 案例被 PM 退回後，仍保留案例主體與版本脈絡。',
        status: 'rejected',
        priority: 'P2',
        level: 'e2e',
        owner: 'PM Janet',
        updatedAt: '2026-09-02 17:08',
      },
    ],
  },
];

function statusLabel(status: MockCaseStatus) {
  return { draft: '草稿', published: '已發布', rejected: '已退回' }[status];
}

function statusColor(status: MockCaseStatus) {
  return { draft: 'blue', published: 'green', rejected: 'red' }[status];
}

function changeColor(changeType: MockRequirementGroup['changeType']) {
  return { 新增: 'green', 修改: 'orange', 未變更: 'default' }[changeType];
}

export default function TestCasesPage() {
  const params = useParams<{ projectId: string }>();
  const [selectedRequirementId, setSelectedRequirementId] = useState(requirementGroups[0].id);
  const selectedRequirement = useMemo(
    () => requirementGroups.find((group) => group.id === selectedRequirementId) ?? requirementGroups[0],
    [selectedRequirementId],
  );
  const totalCaseCount = requirementGroups.reduce((sum, group) => sum + group.testCases.length, 0);

  return (
    <AppShell title="測試案例">
      <div className="project-overview">
        <Card className="workspace-card" variant="outlined">
          <Space className="section-heading" align="start">
            <span className="heading-icon"><FileTextOutlined /></span>
            <Space orientation="vertical" size={4}>
              <Typography.Title level={2}>以需求章節檢視 Test Case</Typography.Title>
              <Typography.Paragraph>
                這頁先用假資料示範主從式瀏覽：左側選需求，右側只呈現該需求延伸出的 test case，讓案例歸屬更明確。
              </Typography.Paragraph>
            </Space>
          </Space>
        </Card>

        <div className="case-master-detail">
          <Card className="workspace-card case-requirement-panel" variant="outlined">
            <Space className="table-toolbar" align="center" wrap>
              <Space>
                <FileTextOutlined />
                <Typography.Text strong>需求章節</Typography.Text>
              </Space>
              <Tag>{totalCaseCount} cases</Tag>
            </Space>
            <div className="requirement-list">
              {requirementGroups.map((group) => (
                <button
                  className={`requirement-item ${group.id === selectedRequirement.id ? 'active' : ''}`}
                  key={group.id}
                  onClick={() => setSelectedRequirementId(group.id)}
                  type="button"
                >
                  <span className="requirement-item-title">{group.title}</span>
                  <span className="requirement-item-meta">
                    <Tag color={changeColor(group.changeType)}>{group.changeType}</Tag>
                    <span>{group.testCases.length} cases</span>
                  </span>
                </button>
              ))}
            </div>
          </Card>

          <Card className="workspace-card" variant="outlined">
            <Space orientation="vertical" size={18} className="full-width">
              <Space className="table-toolbar" align="start" wrap>
                <Space className="section-heading" align="start">
                  <span className="heading-icon"><ProfileOutlined /></span>
                  <Space orientation="vertical" size={4}>
                    <Typography.Title level={2}>{selectedRequirement.title}</Typography.Title>
                    <Typography.Paragraph>{selectedRequirement.summary}</Typography.Paragraph>
                  </Space>
                </Space>
                <Button icon={<ArrowRightOutlined />} href={`/projects/${params.projectId}/test-cases/all`}>
                  查看全部 Test Case
                </Button>
              </Space>

              <Row gutter={[12, 12]}>
                <Col xs={24} md={8}>
                  <Card className="metric-card" variant="outlined">
                    <Typography.Text type="secondary">此需求案例</Typography.Text>
                    <Typography.Title level={3}>{selectedRequirement.testCases.length}</Typography.Title>
                  </Card>
                </Col>
                <Col xs={24} md={8}>
                  <Card className="metric-card" variant="outlined">
                    <Typography.Text type="secondary">已發布</Typography.Text>
                    <Typography.Title level={3}>
                      {selectedRequirement.testCases.filter((testCase) => testCase.status === 'published').length}
                    </Typography.Title>
                  </Card>
                </Col>
                <Col xs={24} md={8}>
                  <Card className="metric-card" variant="outlined">
                    <Typography.Text type="secondary">草稿/退回</Typography.Text>
                    <Typography.Title level={3}>
                      {selectedRequirement.testCases.filter((testCase) => testCase.status !== 'published').length}
                    </Typography.Title>
                  </Card>
                </Col>
              </Row>

              <div className="workspace-list">
                <Typography.Text strong>此需求延伸出的 Test Case</Typography.Text>
                {selectedRequirement.testCases.map((testCase) => (
                  <div className="case-card-row" key={testCase.id}>
                    <div>
                      <Space wrap>
                        <Typography.Text strong>{testCase.code}</Typography.Text>
                        <Tag color={statusColor(testCase.status)}>{statusLabel(testCase.status)}</Tag>
                        <Tag color="gold">{testCase.priority}</Tag>
                        <Tag color="purple">{testCase.level}</Tag>
                      </Space>
                      <Link className="case-title-link" href={`/projects/${params.projectId}/test-cases/${testCase.id}`}>
                        {testCase.title}
                      </Link>
                      <Typography.Paragraph>{testCase.focus}</Typography.Paragraph>
                    </div>
                    <div className="case-owner">
                      <Typography.Text type="secondary">負責人</Typography.Text>
                      <Typography.Text>{testCase.owner}</Typography.Text>
                      <Typography.Text type="secondary">{testCase.updatedAt}</Typography.Text>
                    </div>
                  </div>
                ))}
              </div>
            </Space>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
