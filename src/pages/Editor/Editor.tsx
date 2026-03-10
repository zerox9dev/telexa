import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useChannels } from '../../hooks/useChannels'
import { usePosts } from '../../hooks/usePosts'
import { AiPanel } from '../../components/AiPanel/AiPanel'
import { uploadMedia } from '../../lib/storage'
import { FaBold, FaItalic, FaCode, FaStrikethrough, FaLink, FaPaperclip, FaMagic, FaPaperPlane, FaSave, FaClock, FaChevronLeft, FaTrash } from 'react-icons/fa'
import styles from './Editor.module.css'

export function Editor() {
  const navigate = useNavigate()
  const { id: editId } = useParams<{ id: string }>()
  const { channels } = useChannels()
  const { posts, createPost, updatePost, deletePost, sendNow } = usePosts()

  const [channelId, setChannelId] = useState('')
  const [text, setText] = useState('')
  const [mediaUrl, setMediaUrl] = useState<string | undefined>()
  const [scheduledAt, setScheduledAt] = useState('')
  const [loaded, setLoaded] = useState(false)

  // Load existing post when editing
  useEffect(() => {
    if (editId && posts.length > 0 && !loaded) {
      const post = posts.find(p => p.id === editId)
      if (post) {
        setText(post.text || '')
        setChannelId(post.channel_id || '')
        setMediaUrl(post.media_url || undefined)
        setScheduledAt(post.scheduled_at || '')
        setLoaded(true)
      }
    }
  }, [editId, posts, loaded])
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showAi, setShowAi] = useState(false)

  const now = new Date()
  const timeStr = scheduledAt
    ? new Date(scheduledAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    : now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })

  const selectedChannel = channels.find(c => c.id === channelId)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    // Telegram API limit is 10MB for photos, but since we use localStorage, limit to 5MB
    if (file.size > 5 * 1024 * 1024) {
      setError('Файл занадто великий (макс. 5 МБ)')
      return
    }

    setUploadingMedia(true)
    setError('')
    try {
      const url = await uploadMedia(file)
      setMediaUrl(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка завантаження')
    } finally {
      setUploadingMedia(false)
    }
  }

  const wrapSelection = (tag: string) => {
    const el = document.getElementById('editor-textarea') as HTMLTextAreaElement
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = text.substring(start, end)
    if (!selected) return
    const wrapped = `<${tag}>${selected}</${tag}>`
    const newText = text.substring(0, start) + wrapped + text.substring(end)
    setText(newText)
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(start, start + wrapped.length)
    }, 0)
  }

  const insertLink = () => {
    const el = document.getElementById('editor-textarea') as HTMLTextAreaElement
    if (!el) return
    const start = el.selectionStart
    const end = el.selectionEnd
    const selected = text.substring(start, end)
    const url = prompt('URL:')
    if (!url) return
    const linkText = selected || 'посилання'
    const link = `<a href="${url}">${linkText}</a>`
    const newText = text.substring(0, start) + link + text.substring(end)
    setText(newText)
  }

  const handleSave = async (status: 'draft' | 'scheduled') => {
    if (!text.trim() && !mediaUrl) return setError('Додайте текст або медіа')
    if (status === 'scheduled' && !channelId) return setError('Оберіть канал')
    if (status === 'scheduled' && !scheduledAt) return setError('Оберіть дату та час')

    setSaving(true)
    setError('')
    setSuccess('')
    try {
      if (editId) {
        await updatePost(editId, {
          channel_id: channelId || channels[0]?.id || '',
          text: text.trim(),
          media_url: mediaUrl,
          scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
          status,
        })
      } else {
        await createPost({
          channel_id: channelId || channels[0]?.id || '',
          text: text.trim(),
          media_url: mediaUrl,
          scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
          status,
        })
      }
      navigate('/dashboard')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не вдалося зберегти')
    } finally {
      setSaving(false)
    }
  }

  const handleSendNow = async () => {
    if (!text.trim() && !mediaUrl) return setError('Додайте текст або медіа')
    if (!channelId) return setError('Оберіть канал')

    setSending(true)
    setError('')
    setSuccess('')
    try {
      const post = await createPost({
        channel_id: channelId,
        text: text.trim(),
        media_url: mediaUrl,
        status: 'scheduled',
      })
      await sendNow(post.id)
      setSuccess('Опубліковано в Telegram ✓')
      setTimeout(() => navigate('/dashboard'), 1500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не вдалося надіслати')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Новий пост</h1>
          <p className={styles.subtitle}>Створіть та заплануйте</p>
        </div>
        <div className={styles.actions}>
          {editId && (
            <button className={styles.deleteBtn} onClick={async () => {
              if (!confirm('Видалити цей пост?')) return
              await deletePost(editId)
              navigate('/dashboard')
            }}>
              <FaTrash size={13} /> Видалити
            </button>
          )}
          <button
            className={styles.aiBtn}
            onClick={() => setShowAi(v => !v)}
            data-active={showAi || undefined}
          >
            ✦ AI
          </button>
          <button
            className={styles.draftBtn}
            onClick={() => handleSave('draft')}
            disabled={saving || sending || uploadingMedia}
          >
            Зберегти чернетку
          </button>
          <button
            className={styles.scheduleBtn}
            onClick={() => handleSave('scheduled')}
            disabled={saving || sending || uploadingMedia}
          >
            <FaClock size={13} />
            {saving ? 'Збереження...' : 'Запланувати'}
          </button>
          <button
            className={styles.sendBtn}
            onClick={handleSendNow}
            disabled={saving || sending || uploadingMedia}
          >
            <FaPaperPlane size={13} />
            {sending ? 'Надсилання...' : 'Надіслати зараз'}
          </button>
        </div>
      </header>

      {error && <div className={styles.error}>{error}</div>}
      {success && <div className={styles.success}>{success}</div>}

      {showAi && (
        <AiPanel
          channelName={selectedChannel?.title}
          currentText={text}
          onGenerated={setText}
          onClose={() => setShowAi(false)}
        />
      )}

      <div className={styles.workspace}>
        {/* Left: Editor */}
        <div className={styles.editorPanel}>
          <div className={styles.field}>
            <label className={styles.label}>Канал</label>
            <select
              className={styles.select}
              value={channelId}
              onChange={e => setChannelId(e.target.value)}
            >
              <option value="">Оберіть канал...</option>
              {channels.map(ch => (
                <option key={ch.id} value={ch.id}>
                  {ch.title} {ch.username ? `(@${ch.username})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Повідомлення</label>
            <div className={styles.textareaWrap}>
              {mediaUrl && (
                <div className={styles.mediaPreview}>
                  <img src={mediaUrl} className={styles.mediaImg} alt="Attached" />
                  <button 
                    className={styles.mediaRemoveBtn}
                    onClick={() => setMediaUrl(undefined)}
                    title="Видалити зображення"
                  >×</button>
                </div>
              )}
              <div className={styles.formatBar}>
                <button type="button" className={styles.formatBtn} title="Жирний" onClick={() => wrapSelection('b')}>
                  <FaBold size={13} />
                </button>
                <button type="button" className={styles.formatBtn} title="Курсив" onClick={() => wrapSelection('i')}>
                  <FaItalic size={13} />
                </button>
                <button type="button" className={styles.formatBtn} title="Моноширинний" onClick={() => wrapSelection('code')}>
                  <FaCode size={13} />
                </button>
                <button type="button" className={styles.formatBtn} title="Закреслений" onClick={() => wrapSelection('s')}>
                  <FaStrikethrough size={13} />
                </button>
                <button type="button" className={styles.formatBtn} title="Посилання" onClick={insertLink}>
                  <FaLink size={13} />
                </button>
              </div>
              <textarea
                id="editor-textarea"
                className={styles.textarea}
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Напишіть повідомлення або згенеруйте за допомогою AI..."
                rows={10}
                maxLength={4096}
              />
              <div className={styles.textareaFooter}>
                <label
                  className={uploadingMedia ? styles.attachBtnUploading : styles.attachBtn}
                  title="Прикріпити медіа"
                  style={{ opacity: uploadingMedia ? 0.5 : 1 }}>
                  <input 
                    type="file" 
                    accept="image/*" 
                    className={styles.hiddenInput} 
                    onChange={handleFileChange}
                  />
                  <FaPaperclip size={16} />
                </label>
                <span className={styles.charCount}>
                  {text.length}<span className={styles.charMax}> / 4096</span>
                </span>
              </div>
            </div>
          </div>

          <div className={styles.scheduleRow}>
            <div className={styles.field}>
              <label className={styles.label}>Дата і час</label>
              <input
                type="datetime-local"
                className={styles.input}
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Часовий пояс</label>
              <select className={styles.select} defaultValue={Intl.DateTimeFormat().resolvedOptions().timeZone}>
                <option>{Intl.DateTimeFormat().resolvedOptions().timeZone}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right: TG Preview */}
        <div className={styles.previewPanel}>
          <div className={styles.tgHeader}>
            <button className={styles.tgBack}>
              <FaChevronLeft size={16} color="white" />
            </button>
            <div className={styles.tgHeaderInfo}>
              {selectedChannel?.photo_url ? (
                <img src={selectedChannel.photo_url} className={styles.tgAvatar} alt="" />
              ) : (
                <div className={styles.tgAvatar}>
                  {(selectedChannel?.title || 'T').charAt(0)}
                </div>
              )}
              <div>
                <div className={styles.tgChannelName}>{selectedChannel?.title || 'Назва каналу'}</div>
                <div className={styles.tgSubs}>{selectedChannel?.member_count?.toLocaleString() || '0'} підписників</div>
              </div>
            </div>
          </div>
          <div className={styles.tgChat}>
            {(text || mediaUrl) ? (
              <div className={styles.tgMessage}>
                {mediaUrl && (
                  <img src={mediaUrl} className={styles.tgPhoto} alt="" />
                )}
                {text && (
                  <div className={styles.tgText} dangerouslySetInnerHTML={{ __html: text.replace(/\n/g, '<br/>') }} />
                )}
                <div className={styles.tgFooter}>
                  <span className={styles.tgTime}>{timeStr}</span>
                </div>
              </div>
            ) : (
              <div className={styles.previewEmpty}>
                Почніть писати, щоб побачити прев'ю
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
