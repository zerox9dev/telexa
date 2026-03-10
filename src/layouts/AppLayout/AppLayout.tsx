import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '../../components/Sidebar/Sidebar'
import styles from './AppLayout.module.css'

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className={styles.layout}>
      {/* Mobile header */}
      <header className={styles.mobileHeader}>
        <button className={styles.burger} onClick={() => setMenuOpen(true)}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M3 6H19M3 11H19M3 16H19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
        <span className={styles.mobileTitle}>Telexa</span>
        <div style={{ width: 22 }} />
      </header>

      {/* Overlay */}
      {menuOpen && <div className={styles.overlay} onClick={() => setMenuOpen(false)} />}

      {/* Sidebar */}
      <aside className={`${styles.sidebarWrap} ${menuOpen ? styles.sidebarOpen : ''}`}>
        <Sidebar onNavigate={() => setMenuOpen(false)} />
      </aside>

      <main className={styles.main}>
        <div className={styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
