import { useNavigate } from 'react-router-dom'
import styles from './Dashboard.module.css'

const STATS = [
  { label: 'Scheduled', value: '0', icon: '⏳', color: 'blue' },
  { label: 'Published', value: '0', icon: '✓', color: 'green' },
  { label: 'Channels', value: '0', icon: '📢', color: 'purple' },
  { label: 'Views', value: '0', icon: '👁', color: 'orange' },
]

export function Dashboard() {
  const navigate = useNavigate()

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>Your posting overview</p>
        </div>
      </header>

      <div className={styles.stats}>
        {STATS.map((s, i) => (
          <div
            key={s.label}
            className={`${styles.stat} ${styles[s.color]}`}
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <div className={styles.statTop}>
              <span className={styles.statIcon}>{s.icon}</span>
              <span className={styles.statValue}>{s.value}</span>
            </div>
            <span className={styles.statLabel}>{s.label}</span>
          </div>
        ))}
      </div>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Upcoming Posts</h2>
          <button className={styles.viewAll}>View all</button>
        </div>

        <div className={styles.emptyState}>
          <div className={styles.emptyBubbles}>
            <div className={styles.bubbleOut}>
              <span>Your first scheduled post will appear here</span>
              <span className={styles.bubbleTime}>—:—</span>
            </div>
          </div>
          <button className={styles.emptyAction} onClick={() => navigate('/editor')}>
            Create your first post →
          </button>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Recent Activity</h2>
        </div>
        <div className={styles.timeline}>
          <div className={styles.timelineItem}>
            <div className={styles.timelineDot} />
            <span className={styles.timelineText}>Welcome to Telexa! Connect your first channel to get started.</span>
          </div>
        </div>
      </section>
    </div>
  )
}
