import { useState } from 'react'
import styles from './Settings.module.css'

export function Settings() {
  const [botToken, setBotToken] = useState('')

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Settings</h1>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Connect Telegram Bot</h2>
        <p className={styles.sectionDesc}>
          Create a bot via @BotFather, then paste the token here.
          Add the bot as admin to your channel.
        </p>
        <div className={styles.tokenRow}>
          <input
            type="password"
            className={styles.input}
            value={botToken}
            onChange={e => setBotToken(e.target.value)}
            placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
          />
          <button className={styles.connect}>Connect</button>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Your Channels</h2>
        <div className={styles.empty}>
          <p>No channels connected</p>
          <p className={styles.emptyHint}>Connect a bot to see your channels</p>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Account</h2>
        <div className={styles.accountInfo}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Email</span>
            <span className={styles.fieldValue}>—</span>
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Plan</span>
            <span className={styles.fieldValue}>Free</span>
          </div>
        </div>
      </div>
    </div>
  )
}
