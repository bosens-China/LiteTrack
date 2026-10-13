import type { ReactNode } from 'react';
import { Card } from 'antd';

/** 页面顶部筛选区：放在白底卡片中，避免 Segmented 等控件与灰色布局背景融为一体 */
export function FilterCard({ children }: { children: ReactNode }) {
  return (
    <Card
      className="section-card"
      styles={{ body: { display: 'grid', gap: 16 } }}
    >
      {children}
    </Card>
  );
}
