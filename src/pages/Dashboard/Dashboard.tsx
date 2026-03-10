import { useNavigate } from 'react-router-dom'
import { useChannels } from '../../hooks/useChannels'
import { usePosts } from '../../hooks/usePosts'
import styles from './Dashboard.module.css'

export function Dashboard() {
  const navigate = useNavigate()
  const { channels } = useChannels()
  const { scheduled, published, posts } = usePosts()

  const totalViews = published.reduce((sum, p) => sum + (p.views || 0), 0)

  const STATS = [
    { label: 'Scheduled', value: String(scheduled.length), icon: '⏳', color: 'blue' },
    { label: 'Published', value: String(published.length), icon: '✓', color: 'green' },
    { label: 'Channels', value: String(channels.length), icon: '📢', color: 'purple' },
    { label: 'Views', value: totalViews.toLocaleString(), icon: '👁', color: 'orange' },
  ]

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
          <button className={styles.viewAll} onClick={() => navigate('/calendar')}>View all</button>
        </div>

        {scheduled.length === 0 ? (
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
        ) : (
          <div className={styles.postList}>
            {scheduled.slice(0, 5).map(post => (
              <div
                key={post.id}
                className={styles.postItem}
                onClick={() => navigate(`/editor/${post.id}`)}
              >
                <div className={styles.postContentWrap}>
                  {post.media_url && (
                    <div className={styles.postThumbnail}>
                      <img src={post.media_url} alt="" className={styles.thumbnailImg} />
                    </div>
                  )}
                  <div className={styles.postPreview}>
                    {post.text.slice(0, 80)}{post.text.length > 80 ? '...' : ''}
                  </div>
                </div>
                <div className={styles.postMeta}>
                  <span className={styles.postStatus}>⏳ Scheduled</span>
                  <span className={styles.postTime}>
                    {post.scheduled_at
                      ? new Date(post.scheduled_at).toLocaleString('en-US', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
                        })
                      : '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {channels.length === 0 && (
        <section className={styles.section}>
          <div className={styles.onboarding}>
            <h3 className={styles.onboardingTitle}>Get started</h3>
            <p className={styles.onboardingDesc}>Connect your Telegram bot to start scheduling posts.</p>
            <button className={styles.emptyAction} onClick={() => navigate('/settings')}>
              Connect Channel →
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
