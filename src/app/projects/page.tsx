 'use client';
import { PagePanel } from '@/components/page-panel';

export default function ProjectsPage() {
  return <PagePanel title="專案總覽" description="在這裡查看您有權存取的專案，並從專案名稱進入需求與測試案例工作流程。" apiPath="GET /projects" />;
}
