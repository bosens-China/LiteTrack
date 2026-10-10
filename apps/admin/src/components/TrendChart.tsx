import { useEffect, useRef } from 'react';
import * as echarts from 'echarts/core';
import { LineChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import type { TrendPoint } from '@litetrack/contracts';

echarts.use([
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  CanvasRenderer,
]);
export function TrendChart({ data }: { data: TrendPoint[] }) {
  const element = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!element.current) return;
    const chart = echarts.init(element.current);
    chart.setOption({
      color: ['#008577', '#ce5a86'],
      animation: false,
      tooltip: { trigger: 'axis' },
      legend: { top: 0, right: 12, icon: 'circle', itemWidth: 8 },
      grid: { left: 44, right: 20, top: 44, bottom: 32 },
      xAxis: {
        type: 'category',
        data: data.map((p) => p.date.slice(5)),
        boundaryGap: false,
        axisLine: { lineStyle: { color: '#d7dde1' } },
        axisLabel: { color: '#69757c' },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        splitLine: { lineStyle: { color: '#edf0f2' } },
      },
      series: [
        {
          name: 'PV',
          type: 'line',
          data: data.map((p) => p.pv),
          smooth: false,
          symbolSize: 5,
          lineStyle: { width: 2 },
        },
        {
          name: 'UV',
          type: 'line',
          data: data.map((p) => p.uv),
          smooth: false,
          symbolSize: 5,
          lineStyle: { width: 2 },
        },
      ],
    });
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(element.current);
    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [data]);
  return (
    <div
      ref={element}
      className="trend-chart"
      role="img"
      aria-label="页面浏览量与独立访客趋势"
    />
  );
}
