 'use client';
import { PagePanel } from '@/components/page-panel';

export default function TestCasesPage() {
  return <PagePanel title="測試案例" description="管理各章節產生的測試案例草稿。管理員、PM 與 QA 可編輯內容；開發者僅能閱讀核心案例內容。" apiPath="GET /projects/{project_id}/test-cases" />;
}
