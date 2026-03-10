import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChannels } from '../../hooks/useChannels'
import { usePosts } from '../../hooks/usePosts'
import { supabase, isSupabaseConfigured } from '../../lib/supabase'
import { generateAutoPilotDrafts, analyzeChannel } from '../../lib/ai'
import { FaRobot, FaSave, FaMagic, FaPlus, FaTimes, FaSearch } from 'react-icons/fa'
import styles from './AutoPilot.module.css'

interface AgentProfile {
  id?: string
  channel_id: string
  description: string
  audience: string
  tone: string
  topics: string[]
  example_posts: string[]
  language: string
  rules: string
}

const EMPTY_AGENT: Omit<AgentProfile, 'channel_id'> = {
  description: '',
  audience: '',
  tone: '',
  topics: [],
  example_posts: [],
  language: 'Ukrainian',
  rules: '',
}

export function AutoPilot() {
  const navigate = useNavigate()
  const { channels } = useChannels()
  const { createPost } = usePosts()

  const [channelId, setChannelId] = useState('')
  const [agent, setAgent] = useState<AgentProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [tab, setTab] = useState<'setup' | 'generate'>('setup')
  const [postCount, setPostCount] = useState(5)
  const [customTopic, setCustomTopic] = useState('')
  const [newTopic, setNewTopic] = useState('')
  const [newExample, setNewExample] = useState('')
  const [analyzing, setAnalyzing] = useState(false)

  useEffect(() => {
    if (!channelId && channels.length > 0) {
      setChannelId(channels[0].id)
    }
  }, [channels, channelId])

  // Load agent profile for selected channel
  useEffect(() => {
    if (!channelId || !isSupabaseConfigured) return
    setLoading(true)
    ;(supabase as any).from('channel_agents')
      .select('*')
      .eq('channel_id', channelId)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) {
          setAgent(data)
          setTab('generate')
        } else {
          setAgent({ ...EMPTY_AGENT, channel_id: channelId })
          setTab('setup')
        }
        setLoading(false)
      })
  }, [channelId])

  const handleSaveAgent = async () => {
    if (!agent) return
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) throw new Error('Не авторизовані')

      const payload = {
        user_id: user.user.id,
        channel_id: channelId,
        description: agent.description,
        audience: agent.audience,
        tone: agent.tone,
        topics: agent.topics,
        example_posts: agent.example_posts,
        language: agent.language,
        rules: agent.rules,
        updated_at: new Date().toISOString(),
      }

      if (agent.id) {
        await (supabase as any).from('channel_agents').update(payload).eq('id', agent.id)
      } else {
        const { data } = await (supabase as any).from('channel_agents').insert(payload).select().single()
        if (data) setAgent(data)
      }
      setSuccess('Агента збережено ✓')
      setTab('generate')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Помилка збереження')
    } finally {
      setSaving(false)
    }
  }

  const handleGenerate = async () => {
    if (!agent) return
    setGenerating(true)
    setError('')
    setSuccess('')
    try {
      const channel = channels.find(c => c.id === channelId)
      
      const contextPrompt = customTopic
        ? `Focus specifically on: ${customTopic}`
        : `Pick the best topics from: ${agent.topics.join(', ')}`

      const fullDesc = [
        agent.description,
        agent.audience && `Target audience: ${agent.audience}`,
        agent.rules && `Rules to follow: ${agent.rules}`,
        agent.example_posts.length > 0 && `Style reference (write EXACTLY in this style):\n${agent.example_posts.slice(0, 2).join('\n---\n')}`,
      ].filter(Boolean).join('\n\n')

      const drafts = await generateAutoPilotDrafts({
        channelName: channel?.title || '',
        channelDescription: fullDesc,
        tone: agent.tone,
        topicPrompt: contextPrompt,
        language: agent.language,
        postCount
      })

      for (const text of drafts) {
        await createPost({ channel_id: channelId, text, status: 'draft' })
      }

      setSuccess(`${drafts.length} чернеток створено!`)
      setCustomTopic('')
      setTimeout(() => navigate('/dashboard'), 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Помилка генерації')
    } finally {
      setGenerating(false)
    }
  }

  const handleAnalyze = async () => {
    const channel = channels.find(c => c.id === channelId)
    const username = channel?.username
    if (!username) return setError('У каналу немає публічного юзернейму')
    
    setAnalyzing(true)
    setError('')
    try {
      const { profile, postCount } = await analyzeChannel(username)
      setAgent(prev => prev ? {
        ...prev,
        description: profile.description || prev.description,
        audience: profile.audience || prev.audience,
        tone: profile.tone || prev.tone,
        topics: profile.topics?.length ? profile.topics : prev.topics,
        language: profile.language || prev.language,
        rules: profile.rules || prev.rules,
        example_posts: profile.example_posts?.length ? profile.example_posts : prev.example_posts,
      } : prev)
      setSuccess(`Проаналізовано ${postCount} постів з @${username}! Перевірте та збережіть.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не вдалося проаналізувати')
    } finally {
      setAnalyzing(false)
    }
  }

  const addTopic = () => {
    if (!newTopic.trim() || !agent) return
    setAgent({ ...agent, topics: [...agent.topics, newTopic.trim()] })
    setNewTopic('')
  }

  const removeTopic = (idx: number) => {
    if (!agent) return
    setAgent({ ...agent, topics: agent.topics.filter((_, i) => i !== idx) })
  }

  const addExample = () => {
    if (!newExample.trim() || !agent) return
    setAgent({ ...agent, example_posts: [...agent.example_posts, newExample.trim()] })
    setNewExample('')
  }

  const removeExample = (idx: number) => {
    if (!agent) return
    setAgent({ ...agent, example_posts: agent.example_posts.filter((_, i) => i !== idx) })
  }

  if (loading) return <div className={styles.page}><p>Завантаження...</p></div>

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>
            <FaRobot size={22} /> Автопілот
          </h1>
          <p className={styles.subtitle}>Персональний AI-агент для вашого каналу</p>
        </div>
      </header>

      {/* Channel selector */}
      <div className={styles.channelSelect}>
        <select className={styles.select} value={channelId} onChange={e => setChannelId(e.target.value)}>
          {channels.map(c => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === 'setup' ? styles.tabActive : ''}`}
          onClick={() => setTab('setup')}
        >
          Налаштування агента
        </button>
        <button
          className={`${styles.tab} ${tab === 'generate' ? styles.tabActive : ''}`}
          onClick={() => setTab('generate')}
          disabled={!agent?.id}
        >
          Генерація
        </button>
      </div>

      {/* Setup Tab */}
      {tab === 'setup' && agent && (
        <div className={styles.card}>
          <div className={styles.analyzeBar}>
            <p className={styles.analyzeHint}>
              Є пости в каналі? AI проаналізує стиль, тон, рубрики і заповнить профіль автоматично.
            </p>
            <button
              className={styles.analyzeBtn}
              onClick={handleAnalyze}
              disabled={analyzing}
            >
              <FaSearch size={14} />
              {analyzing ? 'Аналізую...' : 'Проаналізувати канал'}
            </button>
          </div>

          <div className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Про що канал?</label>
              <textarea
                className={styles.textarea}
                value={agent.description}
                onChange={e => setAgent({ ...agent, description: e.target.value })}
                placeholder="Канал про веб-розробку, дизайн та AI. Ділюсь досвідом створення продуктів..."
                rows={3}
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Цільова аудиторія</label>
              <input
                className={styles.input}
                value={agent.audience}
                onChange={e => setAgent({ ...agent, audience: e.target.value })}
                placeholder="Junior/Middle розробники, дизайнери, AI-ентузіасти"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Tone of Voice</label>
              <textarea
                className={styles.textarea}
                value={agent.tone}
                onChange={e => setAgent({ ...agent, tone: e.target.value })}
                placeholder="Прямий, без води, трохи іронічний. Як друг який шарить в темі, а не корпоративний блог."
                rows={2}
              />
            </div>

            <div className={styles.row}>
              <div className={styles.field}>
                <label className={styles.label}>Мова</label>
                <select className={styles.select} value={agent.language} onChange={e => setAgent({ ...agent, language: e.target.value })}>
                  <option>Ukrainian</option>
                  <option>English</option>
                  <option>Russian</option>
                </select>
              </div>
            </div>

            {/* Topics */}
            <div className={styles.field}>
              <label className={styles.label}>Рубрики / Теми</label>
              <div className={styles.tags}>
                {agent.topics.map((t, i) => (
                  <span key={i} className={styles.tag}>
                    {t}
                    <button className={styles.tagRemove} onClick={() => removeTopic(i)}><FaTimes size={10} /></button>
                  </span>
                ))}
              </div>
              <div className={styles.addRow}>
                <input
                  className={styles.input}
                  value={newTopic}
                  onChange={e => setNewTopic(e.target.value)}
                  placeholder="напр. Розбори статей"
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTopic())}
                />
                <button className={styles.addBtn} onClick={addTopic}><FaPlus size={12} /></button>
              </div>
            </div>

            {/* Example posts */}
            <div className={styles.field}>
              <label className={styles.label}>Приклади постів (AI буде копіювати стиль)</label>
              {agent.example_posts.map((ex, i) => (
                <div key={i} className={styles.exampleCard}>
                  <p className={styles.exampleText}>{ex.slice(0, 200)}{ex.length > 200 ? '...' : ''}</p>
                  <button className={styles.exampleRemove} onClick={() => removeExample(i)}>
                    <FaTimes size={12} />
                  </button>
                </div>
              ))}
              <textarea
                className={styles.textarea}
                value={newExample}
                onChange={e => setNewExample(e.target.value)}
                placeholder="Вставте приклад поста з вашого каналу..."
                rows={4}
              />
              {newExample.trim() && (
                <button className={styles.addExampleBtn} onClick={addExample}>
                  <FaPlus size={12} /> Додати приклад
                </button>
              )}
            </div>

            {/* Rules */}
            <div className={styles.field}>
              <label className={styles.label}>Правила (що НЕ робити)</label>
              <textarea
                className={styles.textarea}
                value={agent.rules}
                onChange={e => setAgent({ ...agent, rules: e.target.value })}
                placeholder="Не використовувати багато емодзі. Не писати як AI. Не згадувати конкурентів."
                rows={2}
              />
            </div>

            <button className={styles.saveBtn} onClick={handleSaveAgent} disabled={saving || !agent.description}>
              <FaSave size={14} />
              {saving ? 'Збереження...' : 'Зберегти агента'}
            </button>
          </div>
        </div>
      )}

      {/* Generate Tab */}
      {tab === 'generate' && agent && (
        <div className={styles.card}>
          <div className={styles.agentSummary}>
            <div className={styles.agentIcon}><FaRobot size={28} /></div>
            <div>
              <div className={styles.agentName}>Агент для {channels.find(c => c.id === channelId)?.title}</div>
              <div className={styles.agentMeta}>
                {agent.topics.length} рубрик · {agent.example_posts.length} прикладів · {agent.language}
              </div>
            </div>
            <button className={styles.editAgentBtn} onClick={() => setTab('setup')}>Редагувати</button>
          </div>

          <div className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label}>Тема (необов'язково)</label>
              <input
                className={styles.input}
                value={customTopic}
                onChange={e => setCustomTopic(e.target.value)}
                placeholder="Залиште порожнім — агент сам обере з рубрик"
              />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Кількість постів</label>
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
              disabled={generating}
            >
              <FaMagic size={16} />
              {generating ? 'Агент пише...' : `Згенерувати ${postCount} постів`}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
