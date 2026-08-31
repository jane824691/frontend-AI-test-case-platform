import { ReactNode } from 'react';
import { Card } from 'antd';

export function StubPanel({ children }: { children: ReactNode }) {
  return <Card className="stub-panel" variant="outlined">{children}</Card>;
}
