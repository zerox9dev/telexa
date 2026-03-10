import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChannels } from '../../hooks/useChannels'
import { usePosts } from '../../hooks/usePosts'
import { getAiSettings, generateAutoPilotDrafts } from '../../lib/ai'
import styles from './AutoPilot.module.css'

export function AutoPilot() {
  const navigate = useNavigate()
  const { channels } = useChannels()
  const { createPost } = usePosts()
  const settings = getAiSettings()

  const [channelId, setChannelId] = useState(channels[0]?.id || '')
  const [channelDesc, setChannelDesc] = useState('Канал про веб-розробку, дизайн та AI-інструменти')
  const [tone, setTone] = useState('Професійний але невимушений, без корпоративного жаргону, прямий і лаконічний')
  const [topic, setTopic] = useState('Нові фічі React 19 та як їх використовувати')
  const [language, setLanguage] = useState('Ukrainian')
  const [postCount, setPostCount] = useState(3)
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleGenerate = async () => {
    if (!channelId) return setError('Спочатку оберіть канал')
    if (!channelDesc || !topic) return setError('Заповніть усі поля')

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const channel = channels.find(c => c.id === channelId)
      
      const drafts = await generateAutoPilotDrafts({
        channelName: channel?.title || '',
        channelDescription: channelDesc,
        tone,
        topicPrompt: topic,
        language,
        postCount
      })

      // Save all as drafts
      for (const text of drafts) {
        await createPost({
          channel_id: channelId,
          text,
          status: 'draft'
        })
      }

      setSuccess(`Успішно згенеровано ${drafts.length} чернеток!`)
      setTimeout(() => navigate('/dashboard'), 2000)

    } catch (e) {
      setError(e instanceof Error ? e.message : 'Щось пішло не так')
    } finally {
      setLoading(false)
    }
  }

  if (!settings) {
    return (
      <div className={styles.page}>
        <div className={styles.card}>
          <h2 className={styles.title}>AI Автопілот</h2>
          <p className={styles.subtitle} style={{ marginTop: 12, marginBottom: 16 }}>
            Спочатку налаштуйте AI-провайдера, щоб використовувати Автопілот.
          </p>
          <button className={styles.settingsLink} onClick={() => navigate('/settings')}>
            Перейти до налаштувань →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>
            Автопілот <span className={styles.badge}>Beta</span>
          </h1>
          <p className={styles.subtitle}>Згенеруйте контент на цілий тиждень в один клік.</p>
        </div>
      </header>

      <div className={styles.card}>
        <div className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}
          {success && <div className={styles.success}>{success}</div>}

          <div className={styles.field}>
            <label className={styles.label}>Цільовий канал</label>
            <select className={styles.select} value={channelId} onChange={e => setChannelId(e.target.value)}>
              {channels.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Контекст каналу</label>
            <textarea 
              className={styles.textarea} 
              value={channelDesc}
              onChange={e => setChannelDesc(e.target.value)}
              placeholder="Про що цей канал? Хто аудиторія?"
            />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Тон голосу</label>
              <input 
                className={styles.input}
                value={tone}
                onChange={e => setTone(e.target.value)}
                placeholder="напр. Саркастичний, короткий, технічний"
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Мова</label>
              <select className={styles.select} value={language} onChange={e => setLanguage(e.target.value)}>
                <option>Ukrainian</option>
                <option>English</option>
                <option>Russian</option>
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Про що писати?</label>
            <textarea 
              className={styles.textarea} 
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="напр. 5 постів про сучасну оптимізацію продуктивності фронтенду..."
              style={{ minHeight: 100 }}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Кількість постів для генерації</label>
            <div className={styles.rangeWrap}>
              <input 
                type="range" 
                min="1" max="10" 
                className={styles.rangeInput}
                value={postCount}
                onChange={e => setPostCount(Number(e.target.value))}
              />
              <span className={styles.rangeValue}>{postCount}</span>
            </div>
          </div>

          <button 
            className={styles.generateBtn}
            onClick={handleGenerate}
            disabled={loading || !channelId}
          >
            {loading ? (
              <>
                <div className={styles.spinner} />
                Пишемо чернетки...
              </>
            ) : (
              `Згенерувати ${postCount} чернеток`
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
