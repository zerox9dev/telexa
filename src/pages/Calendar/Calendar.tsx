import { useMemo, useState } from 'react'
import styles from './Calendar.module.css'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function Calendar() {
  const [date, setDate] = useState(new Date(2026, 2)) // March 2026

  const { cells, month, year } = useMemo(() => {
    const y = date.getFullYear()
    const m = date.getMonth()
    const firstDay = new Date(y, m, 1).getDay()
    const daysInMonth = new Date(y, m + 1, 0).getDate()
    const offset = firstDay === 0 ? 6 : firstDay - 1 // Monday start

    const cells: Array<{ day: number; current: boolean; today: boolean }> = []
    const today = new Date()

    for (let i = 0; i < 42; i++) {
      const dayNum = i - offset + 1
      const current = dayNum >= 1 && dayNum <= daysInMonth
      const isToday = current && dayNum === today.getDate() && m === today.getMonth() && y === today.getFullYear()
      cells.push({ day: current ? dayNum : 0, current, today: isToday })
    }

    return { cells, month: MONTHS[m], year: y }
  }, [date])

  const prev = () => setDate(d => new Date(d.getFullYear(), d.getMonth() - 1))
  const next = () => setDate(d => new Date(d.getFullYear(), d.getMonth() + 1))

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Calendar</h1>
          <p className={styles.subtitle}>Plan your content</p>
        </div>
        <div className={styles.nav}>
          <button className={styles.navBtn} onClick={prev}>
            <svg width="16" height="16" viewBox="0 0 16 16"><path d="M10 4L6 8L10 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
          </button>
          <span className={styles.month}>{month} {year}</span>
          <button className={styles.navBtn} onClick={next}>
            <svg width="16" height="16" viewBox="0 0 16 16"><path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" /></svg>
          </button>
        </div>
      </header>

      <div className={styles.grid}>
        {DAYS.map(d => (
          <div key={d} className={styles.dayHeader}>{d}</div>
        ))}
        {cells.map((c, i) => (
          <div
            key={i}
            className={`${styles.cell} ${c.current ? '' : styles.disabled} ${c.today ? styles.today : ''}`}
          >
            {c.current && <span className={styles.dayNum}>{c.day}</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
