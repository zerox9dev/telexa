import { NavLink, useNavigate } from 'react-router-dom'
import { useChannels } from '../../hooks/useChannels'
import { usePosts } from '../../hooks/usePosts'
import { FaThLarge, FaPen, FaRocket, FaCog, FaPlus } from 'react-icons/fa'
import styles from './Sidebar.module.css'

const NAV_ITEMS = [
  { to: '/dashboard', icon: <FaThLarge />, label: 'Огляд' },
  { to: '/editor', icon: <FaPen />, label: 'Новий пост' },
  { to: '/autopilot', icon: <FaRocket />, label: 'Автопілот' },
  { to: '/settings', icon: <FaCog />, label: 'Налаштування' },
]

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate()
  const go = (path: string) => { navigate(path); onNavigate?.() }
  const { channels } = useChannels()
  const { posts } = usePosts()

  const postCount = posts.length
  const limit = 10
  const pct = Math.min((postCount / limit) * 100, 100)

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand} onClick={() => go('/')}>
        <div className={styles.logoMark}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M3 7.5L14 2L25 7.5V20.5L14 26L3 20.5V7.5Z" fill="#55AB67" />
            <path d="M8 13L12 17L20 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <span className={styles.logoName}>Telexa</span>
      </div>

      <button className={styles.newPostBtn} onClick={() => go('/editor')}>
        <FaPlus size={12} />
        Новий пост
      </button>

      <nav className={styles.nav}>
        {NAV_ITEMS.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            className={({ isActive }: { isActive: boolean }) =>
              `${styles.navItem} ${isActive ? styles.active : ''}`
            }
          >
            <span className={styles.navIcon}>{item.icon}</span>
            <span className={styles.navLabel}>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className={styles.channels}>
        <div className={styles.channelsHeader}>
          <span>Канали</span>
          <button className={styles.addChannel} onClick={() => go('/settings')}>
            <FaPlus size={10} />
          </button>
        </div>
        {channels.length === 0 ? (
          <div className={styles.noChannels}>Каналів ще немає</div>
        ) : (
          <div className={styles.channelList}>
            {channels.map(ch => (
              <div key={ch.id} className={styles.channelItem}>
                {ch.photo_url ? (
                  <img src={ch.photo_url} className={styles.channelAvatar} alt="" />
                ) : (
                  <div className={styles.channelDot} />
                )}
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
          <span className={styles.usageText}>{postCount} / {limit} постів</span>
        </div>
        <button className={styles.upgrade}>Перейти на Pro</button>
      </div>
    </aside>
  )
}
