import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePosts } from '../../hooks/usePosts'
import styles from './Calendar.module.css'

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

export function Calendar() {
  const navigate = useNavigate()
  const { posts } = usePosts()
  
  const [date, setDate] = useState(new Date())
  const year = date.getFullYear()
  const month = date.getMonth()
  
  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfMonth(year, month)
  
  // Adjust 0 (Sun) to 7 for Monday-first week
  const startOffset = firstDay === 0 ? 6 : firstDay - 1
  
  const handlePrevMonth = () => {
    setDate(new Date(year, month - 1, 1))
  }
  
  const handleNextMonth = () => {
    setDate(new Date(year, month + 1, 1))
  }

  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month

  // Build grid days (35 or 42 cells)
  const cells = []
  
  // Previous month trailing days
  const prevMonthDays = getDaysInMonth(year, month - 1)
  for (let i = 0; i < startOffset; i++) {
    cells.push({ day: prevMonthDays - startOffset + i + 1, isOther: true, m: month - 1 })
  }
  
  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({ day: i, isOther: false, m: month })
  }
  
  // Next month leading days
  const remaining = 35 - cells.length
  if (remaining > 0) {
    for (let i = 1; i <= remaining; i++) {
      cells.push({ day: i, isOther: true, m: month + 1 })
    }
  } else if (cells.length > 35) {
    const rem42 = 42 - cells.length
    for (let i = 1; i <= rem42; i++) {
      cells.push({ day: i, isOther: true, m: month + 1 })
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Calendar</h1>
          <p className={styles.subtitle}>Your posting schedule</p>
        </div>
        
        <div className={styles.controls}>
          <button className={styles.navBtn} onClick={handlePrevMonth}>&lt;</button>
          <div className={styles.monthLabel}>
            {date.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
          </div>
          <button className={styles.navBtn} onClick={handleNextMonth}>&gt;</button>
        </div>
      </header>

      <div className={styles.calendarWrapper}>
        <div className={styles.weekdays}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
            <div key={d} className={styles.weekday}>{d}</div>
          ))}
        </div>
        
        <div className={styles.grid}>
          {cells.map((cell, idx) => {
            const isToday = isCurrentMonth && !cell.isOther && cell.day === today.getDate()
            
            // Filter posts for this specific day
            const cellDate = new Date(year, cell.m, cell.day)
            const cellDateStr = cellDate.toISOString().split('T')[0]
            
            const dayPosts = posts.filter(p => {
              const postDate = new Date(p.scheduled_at || p.created_at)
              return postDate.toISOString().split('T')[0] === cellDateStr && p.status !== 'draft'
            }).sort((a, b) => {
              const ta = new Date(a.scheduled_at || a.created_at).getTime()
              const tb = new Date(b.scheduled_at || b.created_at).getTime()
              return ta - tb
            })

            return (
              <div key={idx} className={`${styles.day} ${cell.isOther ? styles.otherMonth : ''}`}>
                <span className={`${styles.dayNumber} ${isToday ? styles.today : ''}`}>
                  {isToday ? <span className={styles.todayMarker}>{cell.day}</span> : cell.day}
                </span>
                
                <div className={styles.posts}>
                  {dayPosts.map(post => {
                    const time = new Date(post.scheduled_at || post.created_at).toLocaleTimeString('en-US', {
                      hour: '2-digit', minute: '2-digit', hour12: false
                    })
                    
                    const pillClass = post.status === 'published' 
                      ? styles.pillPublished 
                      : post.status === 'failed' 
                        ? styles.pillFailed 
                        : styles.pillScheduled

                    return (
                      <div 
                        key={post.id} 
                        className={`${styles.postPill} ${pillClass}`}
                        onClick={() => navigate(`/editor/${post.id}`)}
                      >
                        <span className={styles.pillTime}>{time}</span>
                        <span className={styles.pillText}>{post.text || 'Photo...'}</span>
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
