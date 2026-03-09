import styles from './Calendar.module.css'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function Calendar() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Calendar</h1>
        <div className={styles.nav}>
          <button className={styles.navBtn}>←</button>
          <span className={styles.month}>March 2026</span>
          <button className={styles.navBtn}>→</button>
        </div>
      </div>

      <div className={styles.grid}>
        {DAYS.map(day => (
          <div key={day} className={styles.dayHeader}>{day}</div>
        ))}
        {Array.from({ length: 35 }, (_, i) => {
          const dayNum = i - 1 // offset for March starting on Sunday
          const isCurrentMonth = dayNum >= 0 && dayNum < 31
          return (
            <div
              key={i}
              className={`${styles.cell} ${isCurrentMonth ? '' : styles.otherMonth}`}
            >
              {isCurrentMonth && (
                <span className={styles.dayNum}>{dayNum + 1}</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
