import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: '專案工作區 | AI 測試案例平台',
  description: 'AI 輔助測試案例管理平台的專案工作區',
};

export default function ProjectsLayout({ children }: { children: ReactNode }) {
  return children;
}
