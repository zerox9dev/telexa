import { useMemo, useState } from 'react'
import type { Post } from '../../lib/database.types'
import styles from './ActivityHeatmap.module.css'

interface Props {
  posts: Post[]
  weeks?: number
}

const DAYS = ['', 'Пн', '', 'Ср', '', 'Пт', '']
const MONTHS_UA = ['Січ', 'Лют', 'Бер', 'Кві', 'Тра', 'Чер', 'Лип', 'Сер', 'Вер', 'Жов', 'Лис', 'Гру']

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function ActivityHeatmap({ posts, weeks = 26 }: Props) {
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null)

  const { grid, months } = useMemo(() => {
    // Count posts per day
    const counts: Record<string, number> = {}
    for (const p of posts) {
      if (p.status !== 'published' && p.status !== 'scheduled') continue
      const date = p.published_at || p.scheduled_at || p.created_at
      if (!date) continue
      const key = dateKey(new Date(date))
      counts[key] = (counts[key] || 0) + 1
    }

    // Build grid: each column = 1 week (7 days, Mon-Sun)
    const today = new Date()
    const todayDay = today.getDay() // 0=Sun
    const todayDowMon = todayDay === 0 ? 6 : todayDay - 1 // 0=Mon

    // Start from (weeks) weeks ago, aligned to Monday
    const startDate = new Date(today)
    startDate.setDate(startDate.getDate() - (weeks * 7) - todayDowMon)

    const columns: { date: Date; count: number; key: string }[][] = []
    const monthLabels: { label: string; col: number }[] = []
    let lastMonth = -1

    const totalDays = weeks * 7 + todayDowMon + 1
    let col: { date: Date; count: number; key: string }[] = []

    for (let i = 0; i < totalDays; i++) {
      const d = new Date(startDate)
      d.setDate(startDate.getDate() + i)
      const key = dateKey(d)
      const dow = d.getDay() === 0 ? 6 : d.getDay() - 1 // Mon=0

      if (dow === 0 && col.length > 0) {
        columns.push(col)
        col = []
      }

      if (d.getMonth() !== lastMonth) {
        lastMonth = d.getMonth()
        monthLabels.push({ label: MONTHS_UA[d.getMonth()], col: columns.length })
      }

      col.push({ date: d, count: counts[key] || 0, key })
    }
    if (col.length > 0) columns.push(col)

    return { grid: columns, months: monthLabels }
  }, [posts, weeks])

  const maxCount = Math.max(1, ...grid.flat().map(c => c.count))

  function getLevel(count: number): number {
    if (count === 0) return 0
    const ratio = count / maxCount
    if (ratio <= 0.25) return 1
    if (ratio <= 0.5) return 2
    if (ratio <= 0.75) return 3
    return 4
  }

  // Calculate month label positions
  const monthPositions = months.map((m, i) => {
    const nextCol = i < months.length - 1 ? months[i + 1].col : grid.length
    const width = (nextCol - m.col) * 16 // 13px cell + 3px gap
    return { ...m, width }
  })

  return (
    <div className={styles.wrap}>
      <div className={styles.months}>
        {monthPositions.map((m, i) => (
          <span key={i} className={styles.monthLabel} style={{ width: m.width, minWidth: m.width }}>
            {m.width > 30 ? m.label : ''}
          </span>
        ))}
      </div>

      <div className={styles.body}>
        <div className={styles.days}>
          {DAYS.map((d, i) => (
            <span key={i} className={styles.dayLabel}>{d}</span>
          ))}
        </div>

        <div className={styles.grid}>
          {grid.map((week, wi) => (
            <div key={wi} className={styles.column}>
              {week.map(cell => (
                <div
                  key={cell.key}
                  className={`${styles.cell} ${styles[`level${getLevel(cell.count)}`]}`}
                  onMouseEnter={e => {
                    const r = (e.target as HTMLElement).getBoundingClientRect()
                    const d = cell.date
                    const label = `${d.getDate()} ${MONTHS_UA[d.getMonth()]}: ${cell.count} ${cell.count === 1 ? 'пост' : 'постів'}`
                    setTooltip({ text: label, x: r.left + 6, y: r.top - 30 })
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.legend}>
        <span>Менше</span>
        {[0, 1, 2, 3, 4].map(l => (
          <div key={l} className={`${styles.legendCell} ${styles[`level${l}`]}`} />
        ))}
        <span>Більше</span>
      </div>

      {tooltip && (
        <div className={styles.tooltip} style={{ left: tooltip.x, top: tooltip.y }}>
          {tooltip.text}
        </div>
      )}
    </div>
  )
}
