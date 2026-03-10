import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePosts } from '../../hooks/usePosts'
import { useChannels } from '../../hooks/useChannels'
import styles from './Calendar.module.css'

export function Calendar() {
  const navigate = useNavigate()
  const { posts } = usePosts()
  const { channels } = useChannels()

  // Current month state
  const [currentDate, setCurrentDate] = useState(new Date())

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Nav helpers
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1))
  const today = () => setCurrentDate(new Date())

  // Calendar grid math
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const startingBlanks = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1 // Start on Monday

  const days = []
  for (let i = 0; i < startingBlanks; i++) days.push(null)
  for (let i = 1; i <= daysInMonth; i++) days.push(i)

  // Group posts by YYYY-MM-DD
  const postsByDate: Record<string, typeof posts> = {}
  posts.forEach(post => {
    const d = new Date(post.scheduled_at || post.created_at)
    // Adjust to local timezone string YYYY-MM-DD
    const dateStr = d.toLocaleDateString('en-CA') // YYYY-MM-DD format
    if (!postsByDate[dateStr]) postsByDate[dateStr] = []
    postsByDate[dateStr].push(post)
  })

  const getChannelColor = (channelId: string) => {
    const idx = channels.findIndex(c => c.id === channelId)
    const colors = ['var(--tg-blue)', 'var(--tg-purple)', 'var(--tg-orange)', 'var(--tg-green)']
    return colors[Math.max(0, idx % colors.length)]
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title}>Calendar</h1>
          <p className={styles.subtitle}>
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className={styles.actions}>
          <button className={styles.todayBtn} onClick={today}>Today</button>
          <div className={styles.navGroup}>
            <button className={styles.navBtn} onClick={prevMonth}>←</button>
            <button className={styles.navBtn} onClick={nextMonth}>→</button>
          </div>
          <button className={styles.newPostBtn} onClick={() => navigate('/editor')}>
            New Post
          </button>
        </div>
      </header>

      <div className={styles.calendarCard}>
        <div className={styles.weekdays}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
            <div key={d} className={styles.weekday}>{d}</div>
          ))}
        </div>
        
        <div className={styles.grid}>
          {days.map((day, idx) => {
            if (!day) return <div key={`blank-${idx}`} className={styles.emptyCell} />

            // Build YYYY-MM-DD for this cell
            const cellDate = new Date(year, month, day)
            const dateStr = cellDate.toLocaleDateString('en-CA')
            const dayPosts = postsByDate[dateStr] || []
            
            const isToday = new Date().toDateString() === cellDate.toDateString()

            return (
              <div key={day} className={`${styles.cell} ${isToday ? styles.today : ''}`}>
                <div className={styles.cellHeader}>
                  <span className={styles.dayNum}>{day}</span>
                </div>
                
                <div className={styles.postList}>
                  {dayPosts.map(post => {
                    const time = new Date(post.scheduled_at || post.created_at)
                      .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    
                    return (
                      <div 
                        key={post.id} 
                        className={styles.postPill}
                        onClick={() => navigate(`/editor/${post.id}`)}
                        title={post.text}
                      >
                        <div 
                          className={styles.channelDot} 
                          style={{ background: getChannelColor(post.channel_id) }}
                        />
                        <span className={styles.postTime}>{time}</span>
                        <span className={styles.postPreview}>
                          {post.media_url ? '📷 ' : ''}{post.text || 'Empty'}
                        </span>
                        {post.status === 'published' && <span className={styles.statusCheck}>✓</span>}
                        {post.status === 'failed' && <span className={styles.statusFail}>!</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
