import { useState } from 'react'
import styles from './Editor.module.css'

export function Editor() {
  const [text, setText] = useState('')
  const [scheduledAt, setScheduledAt] = useState('')

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>New Post</h1>
        <div className={styles.actions}>
          <button className={styles.draft}>Save Draft</button>
          <button className={styles.schedule}>Schedule</button>
        </div>
      </div>

      <div className={styles.editor}>
        <div className={styles.inputSection}>
          <label className={styles.label}>Channel</label>
          <select className={styles.select}>
            <option value="">Select channel...</option>
          </select>
        </div>

        <div className={styles.inputSection}>
          <label className={styles.label}>Message</label>
          <textarea
            className={styles.textarea}
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Write your post..."
            rows={8}
          />
          <span className={styles.charCount}>{text.length} / 4096</span>
        </div>

        <div className={styles.inputSection}>
          <label className={styles.label}>Media</label>
          <div className={styles.mediaUpload}>
            <span>📎 Drop files here or click to upload</span>
          </div>
        </div>

        <div className={styles.row}>
          <div className={styles.inputSection}>
            <label className={styles.label}>Schedule</label>
            <input
              type="datetime-local"
              className={styles.input}
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
            />
          </div>
        </div>
      </div>

      {text && (
        <div className={styles.preview}>
          <h3 className={styles.previewTitle}>Preview</h3>
          <div className={styles.previewBubble}>
            <p className={styles.previewText}>{text}</p>
          </div>
        </div>
      )}
    </div>
  )
}
