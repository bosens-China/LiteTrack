import { useEffect, useRef } from 'react';
import { theme } from 'antd';
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
export function TrendChart({
  data,
  aggregate = false,
}: {
  data: TrendPoint[];
  aggregate?: boolean;
}) {
  const { token } = theme.useToken();
  const element = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!element.current) return;
    const chart = echarts.init(element.current);
    chart.setOption({
      color: [token.colorPrimary, token.purple, token.cyan],
      aria: { enabled: true },
      animation: false,
      tooltip: { trigger: 'axis' },
      legend: {
        top: 0,
        right: 12,
        itemWidth: 16,
        textStyle: { color: token.colorText },
      },
      grid: { left: 44, right: 20, top: 44, bottom: 32 },
      xAxis: {
        type: 'category',
        data: data.map((p) => p.date.slice(5)),
        boundaryGap: false,
        axisLine: { lineStyle: { color: token.colorBorder } },
        axisLabel: { color: token.colorTextSecondary },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { color: token.colorTextSecondary },
        splitLine: { lineStyle: { color: token.colorBorderSecondary } },
      },
      // UV 与访问次数经常相等，访问次数用虚线叠在上层，重合时两条线仍可分辨
      series: [
        {
          name: 'PV',
          type: 'line',
          data: data.map((p) => p.pv),
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { width: 2 },
        },
        {
          name: aggregate ? '项目 UV 合计' : 'UV',
          type: 'line',
          data: data.map((p) => p.uv),
          symbol: 'emptyCircle',
          symbolSize: 8,
          lineStyle: { width: 3 },
        },
        {
          name: '访问次数',
          type: 'line',
          data: data.map((p) => p.visits),
          symbol: 'diamond',
          symbolSize: 6,
          lineStyle: { width: 2, type: 'dashed' },
        },
      ],
    });
    const observer = new ResizeObserver(() => chart.resize());
    observer.observe(element.current);
    return () => {
      observer.disconnect();
      chart.dispose();
    };
  }, [
    data,
    aggregate,
    token.colorPrimary,
    token.purple,
    token.cyan,
    token.colorText,
    token.colorTextSecondary,
    token.colorBorder,
    token.colorBorderSecondary,
  ]);
  return (
    <div
      ref={element}
      className="trend-chart"
      role="img"
      aria-label={
        aggregate
          ? '页面浏览量、项目访客合计与访问次数趋势'
          : '页面浏览量、独立访客与访问次数趋势'
      }
    />
  );
}
