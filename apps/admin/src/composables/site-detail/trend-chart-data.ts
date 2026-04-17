import type { DailyView } from '@/api/stats'

export type TrendRangeValue = '7' | '30' | '90' | '365'

export interface WeeklyMeta {
  start: string
  end: string
}

export function fillMissingData(rawData: DailyView[], days: number): DailyView[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const dataMap = new Map<string, number>()
  rawData.forEach((item) => {
    dataMap.set(item.date, item.count)
  })

  const result: DailyView[] = []

  for (let index = days - 1; index >= 0; index -= 1) {
    const current = new Date(today)
    current.setDate(current.getDate() - index)
    const date = current.toLocaleDateString('sv-SE')

    result.push({
      date,
      count: dataMap.get(date) ?? 0,
    })
  }

  return result
}

export function fillMonthlyData(rawData: DailyView[]): Array<{ label: string; count: number }> {
  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth() + 1

  const startDate = new Date(today)
  startDate.setMonth(startDate.getMonth() - 11)
  startDate.setDate(1)

  const months: Array<{ year: number; month: number; label: string }> = []
  for (let index = 0; index < 12; index += 1) {
    const current = new Date(startDate)
    current.setMonth(current.getMonth() + index)

    const year = current.getFullYear()
    const month = current.getMonth() + 1
    if (year > currentYear || (year === currentYear && month > currentMonth)) {
      break
    }

    months.push({
      year,
      month,
      label: year === currentYear ? `${month}月` : `${year}年${month}月`,
    })
  }

  const monthlyCounts = new Map<string, number>()
  rawData.forEach((item) => {
    const key = item.date.slice(0, 7)
    monthlyCounts.set(key, (monthlyCounts.get(key) ?? 0) + item.count)
  })

  return months.map(({ year, month, label }) => ({
    label,
    count: monthlyCounts.get(`${year}-${month.toString().padStart(2, '0')}`) ?? 0,
  }))
}

export function fillWeeklyData(
  rawData: DailyView[],
): Array<{ label: string; count: number; range: WeeklyMeta }> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - 89)
  const startMonday = getMonday(startDate)

  const endSunday = new Date(getMonday(today))
  endSunday.setDate(endSunday.getDate() + 6)

  const weeks: Array<{ monday: Date; label: string; range: WeeklyMeta }> = []
  const currentMonday = new Date(startMonday)

  while (currentMonday <= endSunday) {
    weeks.push({
      monday: new Date(currentMonday),
      label: getWeekLabel(currentMonday),
      range: getWeekRange(currentMonday),
    })

    currentMonday.setDate(currentMonday.getDate() + 7)
  }

  const weeklyCounts = new Map<string, number>()
  rawData.forEach((item) => {
    const monday = getMonday(new Date(item.date))
    const key = monday.toISOString().slice(0, 10)
    weeklyCounts.set(key, (weeklyCounts.get(key) ?? 0) + item.count)
  })

  return weeks.map((week) => ({
    label: week.label,
    count: weeklyCounts.get(week.monday.toISOString().slice(0, 10)) ?? 0,
    range: week.range,
  }))
}

function getWeekLabel(date: Date): string {
  const month = date.getMonth() + 1
  const day = date.getDate()
  const weekOfMonth = Math.ceil(day / 7)
  return `${month}月第${weekOfMonth}周`
}

function getWeekRange(monday: Date): WeeklyMeta {
  const end = new Date(monday)
  end.setDate(monday.getDate() + 6)

  return {
    start: `${monday.getMonth() + 1}/${monday.getDate()}`,
    end: `${end.getMonth() + 1}/${end.getDate()}`,
  }
}

function getMonday(date: Date): Date {
  const day = date.getDay() || 7
  const monday = new Date(date)
  monday.setDate(date.getDate() - day + 1)
  monday.setHours(0, 0, 0, 0)
  return monday
}
