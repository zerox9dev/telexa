import { NavLink, useNavigate } from 'react-router-dom'
import { useChannels } from '../../hooks/useChannels'
import { usePosts } from '../../hooks/usePosts'
import styles from './Sidebar.module.css'

const NAV_ITEMS = [
  { to: '/dashboard', icon: 'grid', label: 'Dashboard' },
  { to: '/editor', icon: 'edit', label: 'New Post' },
  { to: '/autopilot', icon: 'sparkles', label: 'Auto-Pilot' },
  { to: '/settings', icon: 'settings', label: 'Settings' },
]

const ICONS: Record<string, React.ReactNode> = {
  grid: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="2" width="7" height="7" rx="2" fill="currentColor" />
      <rect x="11" y="2" width="7" height="7" rx="2" fill="currentColor" opacity="0.5" />
      <rect x="2" y="11" width="7" height="7" rx="2" fill="currentColor" opacity="0.5" />
      <rect x="11" y="11" width="7" height="7" rx="2" fill="currentColor" opacity="0.3" />
    </svg>
  ),
  calendar: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <rect x="2" y="3" width="16" height="14" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <line x1="2" y1="8" x2="18" y2="8" stroke="currentColor" strokeWidth="1.5" />
      <line x1="6" y1="1.5" x2="6" y2="4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="14" y1="1.5" x2="14" y2="4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  edit: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M13.5 3.5L16.5 6.5L6.5 16.5H3.5V13.5L13.5 3.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  ),
  sparkles: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <path d="M10 2l1.5 4.5L16 8l-4.5 1.5L10 14l-1.5-4.5L4 8l4.5-1.5L10 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  ),
  settings: (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M10 1.5V4M10 16V18.5M1.5 10H4M16 10H18.5M3.4 3.4L5.2 5.2M14.8 14.8L16.6 16.6M16.6 3.4L14.8 5.2M5.2 14.8L3.4 16.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
}

export function Sidebar() {
  const navigate = useNavigate()
  const { channels } = useChannels()
  const { posts } = usePosts()

  const postCount = posts.length
  const limit = 10 // free plan
  const pct = Math.min((postCount / limit) * 100, 100)

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand} onClick={() => navigate('/')}>
        <div className={styles.logoMark}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M3 7.5L14 2L25 7.5V20.5L14 26L3 20.5V7.5Z" fill="#229ED9" />
            <path d="M8 13L12 17L20 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span className={styles.logoName}>Telexa</span>
      </div>

      <button className={styles.newPostBtn} onClick={() => navigate('/editor')}>
        <span className={styles.newPostIcon}>+</span>
        New Post
      </button>

      <nav className={styles.nav}>
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }: { isActive: boolean }) =>
              `${styles.navItem} ${isActive ? styles.active : ''}`
            }
          >
            <span className={styles.navIcon}>{ICONS[item.icon]}</span>
            <span className={styles.navLabel}>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className={styles.channels}>
        <div className={styles.channelsHeader}>
          <span>Channels</span>
          <button className={styles.addChannel} onClick={() => navigate('/settings')}>+</button>
        </div>
        {channels.length === 0 ? (
          <div className={styles.noChannels}>No channels yet</div>
        ) : (
          <div className={styles.channelList}>
            {channels.map(ch => (
              <div key={ch.id} className={styles.channelItem}>
                <div className={styles.channelDot} />
                <span className={styles.channelName}>{ch.title}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <div className={styles.usage}>
          <div className={styles.usageBar}>
            <div className={styles.usageFill} style={{ width: `${pct}%` }} />
          </div>
          <span className={styles.usageText}>{postCount} / {limit} posts</span>
        </div>
        <button className={styles.upgrade}>Upgrade to Pro</button>
      </div>
    </aside>
  )
}
