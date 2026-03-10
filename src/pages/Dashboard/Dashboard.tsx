import { useNavigate } from 'react-router-dom'
import { useChannels } from '../../hooks/useChannels'
import { usePosts } from '../../hooks/usePosts'
import { ActivityHeatmap } from '../../components/ActivityHeatmap/ActivityHeatmap'
import styles from './Dashboard.module.css'

export function Dashboard() {
  const navigate = useNavigate()
  const { channels } = useChannels()
  const { posts, scheduled, published } = usePosts()

  const totalViews = published.reduce((sum, p) => sum + (p.views || 0), 0)

  const STATS = [
    { label: 'Заплановані', value: String(scheduled.length), icon: '⏳', color: 'blue' },
    { label: 'Опубліковані', value: String(published.length), icon: '✓', color: 'green' },
    { label: 'Канали', value: String(channels.length), icon: '📢', color: 'purple' },
    { label: 'Перегляди', value: totalViews.toLocaleString(), icon: '👁', color: 'orange' },
  ]

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Огляд</h1>
          <p className={styles.subtitle}>Ваш огляд публікацій</p>
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
          <h2 className={styles.sectionTitle}>Активність</h2>
        </div>
        <ActivityHeatmap posts={posts} />
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Найближчі пости</h2>
        </div>

        {scheduled.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyBubbles}>
              <div className={styles.bubbleOut}>
                <span>Ваш перший запланований пост з'явиться тут</span>
                <span className={styles.bubbleTime}>—:—</span>
              </div>
            </div>
            <button className={styles.emptyAction} onClick={() => navigate('/editor')}>
              Створити перший пост →
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
                  <span className={styles.postStatus}>⏳ Заплановано</span>
                  <span className={styles.postTime}>
                    {post.scheduled_at
                      ? new Date(post.scheduled_at).toLocaleString('uk-UA', {
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

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Опубліковані</h2>
        </div>

        {published.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyBubbles}>
              <div className={styles.bubbleOut}>
                <span>Опубліковані пости з'являться тут</span>
                <span className={styles.bubbleTime}>—:—</span>
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.postList}>
            {published.slice(0, 10).map(post => (
              <div key={post.id} className={styles.postItem}>
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
                  {post.views != null && post.views > 0 && (
                    <span className={styles.postViews}>👁 {post.views.toLocaleString()}</span>
                  )}
                  <span className={`${styles.postStatus} ${styles.statusPublished}`}>✓ Опубліковано</span>
                  <span className={styles.postTime}>
                    {post.published_at
                      ? new Date(post.published_at).toLocaleString('uk-UA', {
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
            <h3 className={styles.onboardingTitle}>Почніть тут</h3>
            <p className={styles.onboardingDesc}>Підключіть свого Telegram-бота, щоб почати планувати пости.</p>
            <button className={styles.emptyAction} onClick={() => navigate('/settings')}>
              Підключити канал →
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
