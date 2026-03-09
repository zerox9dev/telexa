import { useState } from 'react'
import styles from './Settings.module.css'

export function Settings() {
  const [botToken, setBotToken] = useState('')
  const [showToken, setShowToken] = useState(false)

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>Manage your bot and channels</p>
      </header>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 12L11 15L16 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h2 className={styles.cardTitle}>Connect Telegram Bot</h2>
            <p className={styles.cardDesc}>
              Create a bot via <a href="https://t.me/BotFather" target="_blank" rel="noopener">@BotFather</a>, 
              then paste the token. Add the bot as admin to your channel.
            </p>
          </div>
        </div>

        <div className={styles.tokenField}>
          <div className={styles.tokenInput}>
            <input
              type={showToken ? 'text' : 'password'}
              className={styles.input}
              value={botToken}
              onChange={e => setBotToken(e.target.value)}
              placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v"
              spellCheck={false}
            />
            <button
              className={styles.toggleBtn}
              onClick={() => setShowToken(!showToken)}
              title={showToken ? 'Hide' : 'Show'}
            >
              {showToken ? '🙈' : '👁'}
            </button>
          </div>
          <button className={styles.connectBtn} disabled={!botToken.includes(':')}>
            Connect
          </button>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="1.5" />
              <path d="M3 10H21" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
          <div>
            <h2 className={styles.cardTitle}>Your Channels</h2>
            <p className={styles.cardDesc}>Channels managed by your connected bot</p>
          </div>
        </div>

        <div className={styles.emptyChannels}>
          <div className={styles.emptyDot} />
          <span>No channels connected yet</span>
        </div>
      </section>

      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
              <path d="M5 20C5 17.2 8.1 15 12 15C15.9 15 19 17.2 19 20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h2 className={styles.cardTitle}>Account</h2>
          </div>
        </div>

        <div className={styles.fields}>
          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>Email</span>
            <span className={styles.fieldValue}>—</span>
          </div>
          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>Plan</span>
            <span className={`${styles.fieldValue} ${styles.planBadge}`}>Free</span>
          </div>
        </div>
      </section>
    </div>
  )
}
