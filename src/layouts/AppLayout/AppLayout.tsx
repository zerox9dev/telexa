import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '../../components/Sidebar/Sidebar'
import { FaBars } from 'react-icons/fa'
import styles from './AppLayout.module.css'

export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className={styles.layout}>
      <header className={styles.mobileHeader}>
        <button className={styles.burger} onClick={() => setMenuOpen(true)}>
          <FaBars size={20} />
        </button>
        <span className={styles.mobileTitle}>Telexa</span>
        <div style={{ width: 22 }} />
      </header>

      {menuOpen && <div className={styles.overlay} onClick={() => setMenuOpen(false)} />}

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
