 'use client';
import { PagePanel } from '@/components/page-panel';

export default function PermissionsPage() {
  return <PagePanel title="權限設定" description="此頁面供管理員管理專案權限；PM 僅可閱讀，QA 與開發者無法存取。實際授權仍由後端執行。" />;
}
