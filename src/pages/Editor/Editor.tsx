import { useState } from 'react'
import styles from './Editor.module.css'

export function Editor() {
  const [text, setText] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')

  const now = new Date()
  const timeStr = scheduledAt
    ? new Date(scheduledAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    : now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>New Post</h1>
          <p className={styles.subtitle}>Compose and schedule</p>
        </div>
        <div className={styles.actions}>
          <button className={styles.draftBtn}>Save Draft</button>
          <button className={styles.scheduleBtn}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 3L14 8L2 13V9L10 8L2 7V3Z" fill="currentColor" />
            </svg>
            Schedule
          </button>
        </div>
      </header>

      <div className={styles.workspace}>
        {/* Left: Editor */}
        <div className={styles.editorPanel}>
          <div className={styles.field}>
            <label className={styles.label}>Channel</label>
            <select className={styles.select}>
              <option value="">Select channel...</option>
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Message</label>
            <div className={styles.textareaWrap}>
              <textarea
                className={styles.textarea}
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Write your message..."
                rows={10}
              />
              <div className={styles.textareaFooter}>
                <button className={styles.attachBtn} title="Attach media">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M15.5 9.5L9.5 15.5C7.5 17.5 4.5 17.5 2.5 15.5C0.5 13.5 0.5 10.5 2.5 8.5L10.5 0.5C11.9 -0.9 14.1 -0.9 15.5 0.5C16.9 1.9 16.9 4.1 15.5 5.5L8 13C7.2 13.8 5.8 13.8 5 13C4.2 12.2 4.2 10.8 5 10L11 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </button>
                <span className={styles.charCount}>
                  {text.length}<span className={styles.charMax}> / 4096</span>
                </span>
              </div>
            </div>
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
              <select className={styles.select}>
                <option>Auto-detect</option>
              </select>
            </div>
          </div>
        </div>

        {/* Right: TG Preview */}
        <div className={styles.previewPanel}>
          <div className={styles.previewHeader}>
            <span className={styles.previewLabel}>Preview</span>
            <span className={styles.previewChannel}>Channel Name</span>
          </div>
          <div className={styles.previewChat}>
            <div className={styles.chatBg}>
              {text ? (
                <div className={styles.message}>
                  <div className={styles.messageBody}>
                    <p className={styles.messageText}>{text}</p>
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
                  Start typing to see preview
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
