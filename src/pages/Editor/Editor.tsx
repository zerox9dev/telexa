import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChannels } from '../../hooks/useChannels'
import { usePosts } from '../../hooks/usePosts'
import { AiPanel } from '../../components/AiPanel/AiPanel'
import { uploadMedia } from '../../lib/storage'
import styles from './Editor.module.css'

export function Editor() {
  const navigate = useNavigate()
  const { channels } = useChannels()
  const { createPost, sendNow } = usePosts()

  const [channelId, setChannelId] = useState('')
  const [text, setText] = useState('')
  const [mediaUrl, setMediaUrl] = useState<string | undefined>()
  const [scheduledAt, setScheduledAt] = useState('')
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

  const handleSave = async (status: 'draft' | 'scheduled') => {
    if (!text.trim() && !mediaUrl) return setError('Додайте текст або медіа')
    if (status === 'scheduled' && !channelId) return setError('Оберіть канал')
    if (status === 'scheduled' && !scheduledAt) return setError('Оберіть дату та час')

    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await createPost({
        channel_id: channelId || channels[0]?.id || '',
        text: text.trim(),
        media_url: mediaUrl,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        status,
      })
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
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 4.5V8L10.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {saving ? 'Збереження...' : 'Запланувати'}
          </button>
          <button
            className={styles.sendBtn}
            onClick={handleSendNow}
            disabled={saving || sending || uploadingMedia}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M2 3L14 8L2 13V9L10 8L2 7V3Z" fill="currentColor" />
            </svg>
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
              <textarea
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
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M15.5 9.5L9.5 15.5C7.5 17.5 4.5 17.5 2.5 15.5C0.5 13.5 0.5 10.5 2.5 8.5L10.5 0.5C11.9 -0.9 14.1 -0.9 15.5 0.5C16.9 1.9 16.9 4.1 15.5 5.5L8 13C7.2 13.8 5.8 13.8 5 13C4.2 12.2 4.2 10.8 5 10L11 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
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
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M12 4L6 10L12 16" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <div className={styles.tgHeaderInfo}>
              <div className={styles.tgAvatar}>
                {(selectedChannel?.title || 'T').charAt(0)}
              </div>
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
                  <div className={styles.tgText}>{text}</div>
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
