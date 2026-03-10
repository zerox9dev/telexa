import { useState } from 'react'
import { generatePost, improvePost } from '../../lib/ai'
import styles from './AiPanel.module.css'

type Tone = 'casual' | 'professional' | 'educational' | 'provocative'

interface AiPanelProps {
  channelName?: string
  currentText: string
  onGenerated: (text: string) => void
  onClose: () => void
}

export function AiPanel({ channelName, currentText, onGenerated, onClose }: AiPanelProps) {
  const [topic, setTopic] = useState('')
  const [tone, setTone] = useState<Tone>('casual')
  const [language, setLanguage] = useState('Ukrainian')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const hasText = currentText.trim().length > 0

  const handleGenerate = async () => {
    if (!topic.trim()) return
    setLoading(true)
    setError('')
    try {
      const text = await generatePost({
        topic: topic.trim(),
        channelName,
        tone,
        language,
      })
      onGenerated(text)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Помилка генерації')
    } finally {
      setLoading(false)
    }
  }

  const handleImprove = async (instruction: string) => {
    if (!currentText.trim()) return
    setLoading(true)
    setError('')
    try {
      const text = await improvePost(currentText, instruction)
      onGenerated(text)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Помилка')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleGenerate()
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.sparkle}>✦</span>
          <span className={styles.headerTitle}>AI-чернетка</span>
          <span className={styles.badge}>GPT</span>
        </div>
        <button className={styles.closeBtn} onClick={onClose}>×</button>
      </div>

      <div className={styles.body}>
        <div className={styles.topicRow}>
          <input
            className={styles.topicInput}
            value={topic}
            onChange={e => setTopic(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Тема: напр. React Server Components..."
            disabled={loading}
          />
          <button
            className={styles.generateBtn}
            onClick={handleGenerate}
            disabled={loading || !topic.trim()}
          >
            Згенерувати
          </button>
        </div>

        <div className={styles.options}>
          {(['casual', 'professional', 'educational', 'provocative'] as Tone[]).map(t => (
            <button
              key={t}
              className={`${styles.optionBtn} ${tone === t ? styles.optionActive : ''}`}
              onClick={() => setTone(t)}
            >
              {t}
            </button>
          ))}
          <span style={{ width: 1, background: 'var(--border-light)' }} />
          {['Ukrainian', 'English', 'Russian'].map(l => (
            <button
              key={l}
              className={`${styles.optionBtn} ${language === l ? styles.optionActive : ''}`}
              onClick={() => setLanguage(l)}
            >
              {l}
            </button>
          ))}
        </div>

        {hasText && (
          <div className={styles.improveRow}>
            <button className={styles.improveBtn} onClick={() => handleImprove('Make it shorter and punchier')} disabled={loading}>
              ✂ Коротше
            </button>
            <button className={styles.improveBtn} onClick={() => handleImprove('Expand with more details and examples')} disabled={loading}>
              ↔ Розширити
            </button>
            <button className={styles.improveBtn} onClick={() => handleImprove('Make the hook stronger, more engaging first line')} disabled={loading}>
              🎯 Кращий хук
            </button>
            <button className={styles.improveBtn} onClick={() => handleImprove('Add a compelling call to action at the end')} disabled={loading}>
              💬 Додати CTA
            </button>
          </div>
        )}

        {loading && (
          <div className={styles.loading}>
            <div className={styles.spinner} />
            Генерація...
          </div>
        )}

        {error && <div className={styles.error}>{error}</div>}
      </div>
    </div>
  )
}
