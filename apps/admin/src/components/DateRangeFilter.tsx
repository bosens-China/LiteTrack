import { App, DatePicker, Segmented, Typography } from 'antd';
import { useSearchParams } from 'react-router';
import dayjs from 'dayjs';
import { rangeSchema } from '@litetrack/contracts';

const today = () =>
  dayjs(new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10));
export function useDateRange() {
  const [params] = useSearchParams();
  const parsed = rangeSchema.safeParse({
    start: params.get('start'),
    end: params.get('end'),
  });
  return parsed.success
    ? parsed.data
    : {
        start: today().subtract(6, 'day').format('YYYY-MM-DD'),
        end: today().format('YYYY-MM-DD'),
      };
}
export function DateRangeFilter() {
  const { message } = App.useApp();
  const [params, setParams] = useSearchParams();
  const range = useDateRange();
  const setRange = (start: string, end: string, mode: string) => {
    if (!rangeSchema.safeParse({ start, end }).success) {
      void message.warning('日期范围不能超过 366 天');
      return;
    }
    const update = new URLSearchParams(params);
    update.set('start', start);
    update.set('end', end);
    update.set('mode', mode);
    update.delete('page');
    setParams(update);
  };
  return (
    <div className="date-toolbar">
      <Segmented
        value={params.get('mode') || (params.has('start') ? 'custom' : '7')}
        options={[
          { label: '今日', value: '1' },
          { label: '近 7 天', value: '7' },
          { label: '近 30 天', value: '30' },
          { label: '自定义', value: 'custom' },
        ]}
        onChange={(mode) =>
          mode === 'custom'
            ? setRange(range.start, range.end, mode)
            : setRange(
                today()
                  .subtract(Number(mode) - 1, 'day')
                  .format('YYYY-MM-DD'),
                today().format('YYYY-MM-DD'),
                String(mode),
              )
        }
      />
      <DatePicker.RangePicker
        allowClear={false}
        value={[dayjs(range.start), dayjs(range.end)]}
        disabledDate={(date) => date.isAfter(today(), 'day')}
        onChange={(dates) => {
          if (dates?.[0] && dates[1])
            setRange(
              dates[0].format('YYYY-MM-DD'),
              dates[1].format('YYYY-MM-DD'),
              'custom',
            );
        }}
      />
      <Typography.Text type="secondary">Asia/Shanghai</Typography.Text>
    </div>
  );
}
