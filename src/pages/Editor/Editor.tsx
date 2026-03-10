import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChannels } from '../../hooks/useChannels'
import { usePosts } from '../../hooks/usePosts'
import { AiPanel } from '../../components/AiPanel/AiPanel'
import styles from './Editor.module.css'

export function Editor() {
  const navigate = useNavigate()
  const { channels } = useChannels()
  const { createPost, sendNow } = usePosts()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [channelId, setChannelId] = useState('')
  const [text, setText] = useState('')
  const [mediaUrl, setMediaUrl] = useState<string | undefined>()
  const [mediaUrl, setMediaUrl] = useState<string | null>(null)
  const [scheduledAt, setScheduledAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showAi, setShowAi] = useState(false)

  const now = new Date()
  const timeStr = scheduledAt
    ? new Date(scheduledAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    : now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })

  const selectedChannel = channels.find(c => c.id === channelId)

  // File upload to Base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      return setError('Only images are supported for now')
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit for localStorage
      return setError('Image must be under 5MB')
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      setMediaUrl(e.target?.result as string)
      setError('')
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async (status: 'draft' | 'scheduled') => {
    if (!text.trim() && !mediaUrl) return setError('Add some text or media first')
    if (status === 'scheduled' && !channelId) return setError('Select a channel')
    if (status === 'scheduled' && !scheduledAt) return setError('Pick a date and time')

    setSaving(true)
    setError('')
    setSuccess('')
    try {
      await createPost({
        channel_id: channelId || channels[0]?.id || '',
        media_url: mediaUrl,
        text: text.trim(),
        media_url: mediaUrl || undefined,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        status,
      })
      navigate('/dashboard')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleSendNow = async () => {
    if (!text.trim() && !mediaUrl) return setError('Add some text or media first')
    if (!channelId) return setError('Select a channel')

    setSending(true)
    setError('')
    setSuccess('')
    try {
      const post = await createPost({
        channel_id: channelId,
        media_url: mediaUrl,
        text: text.trim(),
        media_url: mediaUrl || undefined,
        status: 'scheduled',
      })
      await sendNow(post.id)
      setSuccess('Published to Telegram ✓')
      setTimeout(() => navigate('/dashboard'), 1500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>New Post</h1>
          <p className={styles.subtitle}>Compose and schedule</p>
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
            disabled={saving || sending}
          >
            Save Draft
          </button>
          <button
            className={styles.scheduleBtn}
            onClick={() => handleSave('scheduled')}
            disabled={saving || sending}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M8 4.5V8L10.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {saving ? 'Saving...' : 'Schedule'}
          </button>
          <button
            className={styles.sendBtn}
            onClick={handleSendNow}
            disabled={saving || sending}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M2 3L14 8L2 13V9L10 8L2 7V3Z" fill="currentColor" />
            </svg>
            {sending ? 'Sending...' : 'Send Now'}
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
            <label className={styles.label}>Channel</label>
            <select
              className={styles.select}
              value={channelId}
              onChange={e => setChannelId(e.target.value)}
            >
              <option value="">Select channel...</option>
              {channels.map(ch => (
                <option key={ch.id} value={ch.id}>
                  {ch.title} {ch.username ? `(@${ch.username})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Message</label>
            
            <div className={styles.textareaWrap}>
              {mediaUrl <div className={styles.textareaWrap}><div className={styles.textareaWrap}> (
                <div className={styles.mediaPreview} style={{ margin: '14px 14px 0' }}>
                  <img src={mediaUrl} className={styles.mediaImg} alt="Preview" />
                  <button 
                    className={styles.mediaRemoveBtn}
                    onClick={() => setMediaUrl(undefined)}
                    title="Remove image"
                  >×</button>
                </div>
              )}
              {/* Image attachment preview in editor */}
              {mediaUrl && (
                <div className={styles.mediaAttachment}>
                  <img src={mediaUrl} alt="Attached media" className={styles.mediaPreview} />
                  <button className={styles.removeMediaBtn} onClick={() => setMediaUrl(null)}>×</button>
                </div>
              )}

              <textarea
                className={styles.textarea}
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder={mediaUrl ? "Add caption..." : "Write your message or use AI to generate..."}
                rows={10}
                maxLength={4096}
              />
              <div className={styles.textareaFooter}>
                <input 
                  type="file" 
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  style={{ display: 'none' }} 
                />
                <button 
                  className={styles.attachBtn} 
                  title="Attach photo" 
                  onClick={() => fileInputRef.current?.click()}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M15.5 9.5L9.5 15.5C7.5 17.5 4.5 17.5 2.5 15.5C0.5 13.5 0.5 10.5 2.5 8.5L10.5 0.5C11.9 -0.9 14.1 -0.9 15.5 0.5C16.9 1.9 16.9 4.1 15.5 5.5L8 13C7.2 13.8 5.8 13.8 5 13C4.2 12.2 4.2 10.8 5 10L11 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
                <span className={styles.charCount}>
                  {text.length}<span className={styles.charMax}> / {mediaUrl ? '1024' : '4096'}</span>
                </span>
              </div>
            </div>
            {/* Note about caption limit */}
            {mediaUrl && <span className={styles.captionHint}>Image captions are limited to 1024 characters by Telegram</span>}
          </div>

          <div className={styles.scheduleRow}>
            <div className={styles.field}>
              <label className={styles.label}>Date & Time</label>
              <input
                type="datetime-local"
                className={styles.input}
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Timezone</label>
              <select className={styles.select} defaultValue={Intl.DateTimeFormat().resolvedOptions().timeZone}>
                <option>{Intl.DateTimeFormat().resolvedOptions().timeZone}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right: TG Preview */}
        <div className={styles.previewPanel}>
          <div className={styles.previewHeader}>
            <span className={styles.previewLabel}>Preview</span>
            <span className={styles.previewChannel}>
              {selectedChannel?.title || 'Channel Name'}
            </span>
          </div>
          <div className={styles.previewChat}>
            <div className={styles.chatBg}>
              {(text || mediaUrl) ? (
                <div className={styles.message}>
                  <div className={`${styles.messageBody} ${mediaUrl ? styles.messageBodyWithPhoto : ''}`}>
                    {mediaUrl <div className={styles.chatBg}><div className={styles.chatBg}> <img src={mediaUrl} className={styles.messagePhoto} alt="TG Preview" />}
                    {text <div className={styles.chatBg}><div className={styles.chatBg}> <p className={`${styles.messageText} ${mediaUrl ? styles.messageTextWithPhoto : ''}`}>{text}</p>}
                    <span className={`${styles.messageTime} ${mediaUrl ? styles.messageTimeWithPhoto : ''}`}>
                      {timeStr}
                      <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
                        <path d="M1 5L4 8L10 2" stroke="#4FAE4E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M6 5L9 8L15 2" stroke="#4FAE4E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </div>
              {(text || mediaUrl) ? (
                <div className={styles.message}>
                  <div className={styles.messageBody}>
                    {mediaUrl && (
                      <div className={styles.messageImageWrap}>
                        <img src={mediaUrl} alt="Preview" className={styles.messageImage} />
                      </div>
                    )}
                    {text && <p className={styles.messageText}>{text}</p>}
                    <span className={styles.messageTime}>
                      {timeStr}
                      <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
                        <path d="M1 5L4 8L10 2" stroke="#4FAE4E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M6 5L9 8L15 2" stroke="#4FAE4E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </div>
                  <div className={styles.messageViews}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M7 3C4 3 1.5 7 1.5 7C1.5 7 4 11 7 11C10 11 12.5 7 12.5 7C12.5 7 10 3 7 3Z" stroke="currentColor" strokeWidth="1.2" />
                      <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.2" />
                    </svg>
                    0
                  </div>
                </div>
              ) : (
                <div className={styles.previewEmpty}>
                  Start typing or attach an image
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
