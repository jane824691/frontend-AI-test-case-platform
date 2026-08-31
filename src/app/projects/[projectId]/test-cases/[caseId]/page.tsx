 'use client';
import { PagePanel } from '@/components/page-panel';

export default function TestCaseEditorPage() {
  return <PagePanel title="測試案例編輯器" description="在此編輯案例的版本化內容、發布狀態與人工通過／失敗結果資訊。" apiPath="PATCH /projects/{project_id}/test-cases/{test_case_id}" />;
}
