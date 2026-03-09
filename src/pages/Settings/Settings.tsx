import { useState, useEffect } from 'react'
import { useChannels } from '../../hooks/useChannels'
import { useAuth } from '../../lib/auth'
import { getAiSettings, saveAiSettings } from '../../lib/ai'
import styles from './Settings.module.css'

export function Settings() {
  const { user, signOut } = useAuth()
  const { channels, connectBot, removeChannel } = useChannels()

  const [botToken, setBotToken] = useState('')
  const [channelUsername, setChannelUsername] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // AI settings
  const [aiProvider, setAiProvider] = useState<'openai' | 'anthropic'>('openai')
  const [aiApiKey, setAiApiKey] = useState('')
  const [showAiKey, setShowAiKey] = useState(false)
  const [aiSaved, setAiSaved] = useState(false)

  useEffect(() => {
    const s = getAiSettings()
    if (s) {
      setAiProvider(s.provider)
      setAiApiKey(s.apiKey)
    }
  }, [])

  const handleConnect = async () => {
    if (!botToken.includes(':')) return setError('Invalid bot token format')
    if (!channelUsername.trim()) return setError('Enter channel username (e.g. @mychannel)')

    setConnecting(true)
    setError('')
    setSuccess('')
    try {
      const channel = await connectBot(botToken, channelUsername.trim())
      setSuccess(`Connected "${channel.title}" ✓`)
      setBotToken('')
      setChannelUsername('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connection failed')
    } finally {
      setConnecting(false)
    }
  }

  const handleSaveAi = () => {
    saveAiSettings(aiProvider, aiApiKey)
    setAiSaved(true)
    setTimeout(() => setAiSaved(false), 2000)
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Settings</h1>
        <p className={styles.subtitle}>Manage your bot, channels, and AI</p>
      </header>

      {/* Connect Channel */}
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardIcon}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 12L11 15L16 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h2 className={styles.cardTitle}>Connect Telegram Channel</h2>
            <p className={styles.cardDesc}>
              1. Create a bot via <a href="https://t.me/BotFather" target="_blank" rel="noopener">@BotFather</a><br />
              2. Add the bot as <strong>admin</strong> to your channel<br />
              3. Paste the token and channel username below
            </p>
          </div>
        </div>

        {error && <div className={styles.errorMsg}>{error}</div>}
        {success && <div className={styles.successMsg}>{success}</div>}

        <div className={styles.connectForm}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Bot Token</label>
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
              >
                {showToken ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Channel Username</label>
            <input
              type="text"
              className={styles.inputFull}
              value={channelUsername}
              onChange={e => setChannelUsername(e.target.value)}
              placeholder="@mychannel"
              spellCheck={false}
            />
          </div>

          <button
            className={styles.connectBtn}
            onClick={handleConnect}
            disabled={connecting || !botToken.includes(':')}
          >
            {connecting ? 'Connecting...' : 'Connect Channel'}
          </button>
        </div>
      </section>

      {/* Channels */}
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
          </div>
        </div>

        {channels.length === 0 ? (
          <div className={styles.emptyChannels}>
            <div className={styles.emptyDot} />
            <span>No channels connected yet</span>
          </div>
        ) : (
          <div className={styles.channelList}>
            {channels.map(ch => (
              <div key={ch.id} className={styles.channelItem}>
                <div className={styles.channelInfo}>
                  <div className={styles.channelAvatar}>
                    {ch.title.charAt(0)}
                  </div>
                  <div>
                    <div className={styles.channelName}>{ch.title}</div>
                    <div className={styles.channelMeta}>
                      {ch.username && `@${ch.username} · `}
                      {ch.member_count?.toLocaleString()} subscribers
                    </div>
                  </div>
                </div>
                <button
                  className={styles.removeBtn}
                  onClick={() => removeChannel(ch.id)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* AI Settings */}
      <section className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={styles.cardIcon}>✦</div>
          <div>
            <h2 className={styles.cardTitle}>AI Drafts</h2>
            <p className={styles.cardDesc}>
              Connect OpenAI or Anthropic to generate post drafts from topics
            </p>
          </div>
        </div>

        <div className={styles.connectForm}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Provider</label>
            <div className={styles.providerToggle}>
              <button
                className={`${styles.providerBtn} ${aiProvider === 'openai' ? styles.providerActive : ''}`}
                onClick={() => setAiProvider('openai')}
              >
                OpenAI
              </button>
              <button
                className={`${styles.providerBtn} ${aiProvider === 'anthropic' ? styles.providerActive : ''}`}
                onClick={() => setAiProvider('anthropic')}
              >
                Anthropic
              </button>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>API Key</label>
            <div className={styles.tokenInput}>
              <input
                type={showAiKey ? 'text' : 'password'}
                className={styles.input}
                value={aiApiKey}
                onChange={e => setAiApiKey(e.target.value)}
                placeholder={aiProvider === 'openai' ? 'sk-...' : 'sk-ant-...'}
                spellCheck={false}
              />
              <button
                className={styles.toggleBtn}
                onClick={() => setShowAiKey(!showAiKey)}
              >
                {showAiKey ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <button
            className={styles.connectBtn}
            onClick={handleSaveAi}
            disabled={!aiApiKey.trim()}
          >
            {aiSaved ? 'Saved ✓' : 'Save AI Settings'}
          </button>
        </div>
      </section>

      {/* Account */}
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
            <span className={styles.fieldValue}>{user?.email || '—'}</span>
          </div>
          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>Plan</span>
            <span className={`${styles.fieldValue} ${styles.planBadge}`}>Free</span>
          </div>
          <div className={styles.fieldRow}>
            <span className={styles.fieldLabel}>Channels</span>
            <span className={styles.fieldValue}>{channels.length}</span>
          </div>
        </div>

        <button className={styles.signOutBtn} onClick={signOut}>
          Sign Out
        </button>
      </section>
    </div>
  )
}
