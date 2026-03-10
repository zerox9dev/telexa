import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { isSupabaseConfigured } from '../../lib/supabase'
import styles from './Landing.module.css'

export function Landing() {
  const navigate = useNavigate()
  const { signInWithGoogle } = useAuth()

  const handleStart = async () => {
    if (isSupabaseConfigured) {
      await signInWithGoogle()
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.logo}>
          <span className={styles.logoMark}>✦</span>
          <span className={styles.logoText}>Telexa</span>
        </div>
        <button className={styles.loginBtn} onClick={handleStart}>
          Log In
        </button>
      </header>

      <main className={styles.main}>
        <div className={styles.hero}>
          <h1 className={styles.title}>
            The smart way to run<br />
            your <span className={styles.highlight}>Telegram</span> channels.
          </h1>
          <p className={styles.subtitle}>
            Schedule posts, automate delivery, and grow your audience with 
            the clean, native-feeling planner for modern creators.
          </p>
          <button className={styles.ctaBtn} onClick={handleStart}>
            {isSupabaseConfigured ? 'Continue with Google' : 'Try it Locally'}
          </button>
          {!isSupabaseConfigured && (
            <p className={styles.localNote}>Running in local mode (no database required)</p>
          )}
        </div>

        <div className={styles.preview}>
          <div className={styles.mockup}>
            <div className={styles.mockHeader}>
              <div className={styles.dots}>
                <span /> <span /> <span />
              </div>
              <div className={styles.mockTitle}>@yourchannel</div>
            </div>
            <div className={styles.mockBody}>
              <div className={styles.bubble}>
                Post scheduled perfectly on time.
                <span className={styles.time}>10:00</span>
              </div>
              <div className={styles.bubble}>
                With clean formatting and no extra setup.
                <span className={styles.time}>14:30</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
