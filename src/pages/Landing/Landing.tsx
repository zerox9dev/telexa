import { useNavigate } from 'react-router-dom'
import styles from './Landing.module.css'

const FEATURES = [
  { icon: '📅', title: 'Smart Scheduling', desc: 'Pick date, time, timezone. Posts go out exactly when you want.' },
  { icon: '📢', title: 'Multi-Channel', desc: 'One dashboard for all your Telegram channels.' },
  { icon: '👁', title: 'Live Preview', desc: 'See exactly how your post looks in Telegram before publishing.' },
  { icon: '📊', title: 'Analytics', desc: 'Track views, forwards, and reactions per post.' },
  { icon: '🤖', title: 'AI Drafts', desc: 'Generate post ideas from a topic. Edit and schedule.' },
  { icon: '⏱', title: 'Queue Mode', desc: 'Set intervals. Posts drip out automatically.' },
]

export function Landing() {
  const navigate = useNavigate()

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <div className={styles.topInner}>
          <div className={styles.logo}>
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
              <path d="M3 7.5L14 2L25 7.5V20.5L14 26L3 20.5V7.5Z" fill="#229ED9" />
              <path d="M8 13L12 17L20 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Telexa</span>
          </div>
          <button className={styles.loginBtn} onClick={() => navigate('/dashboard')}>
            Log In
          </button>
        </div>
      </header>

      <section className={styles.hero}>
        <div className={styles.heroBadge}>
          <span className={styles.dot} /> Built for Telegram
        </div>
        <h1 className={styles.heroTitle}>
          Schedule posts to your<br />
          Telegram channels
        </h1>
        <p className={styles.heroDesc}>
          Plan, preview, and publish. The simplest content scheduler
          designed specifically for Telegram channel owners.
        </p>
        <div className={styles.heroCta}>
          <button className={styles.primaryBtn} onClick={() => navigate('/dashboard')}>
            Start for Free
          </button>
          <button className={styles.secondaryBtn}>See how it works</button>
        </div>

        {/* Fake TG chat preview */}
        <div className={styles.heroPreview}>
          <div className={styles.chatWindow}>
            <div className={styles.chatHeader}>
              <div className={styles.chatAvatar}>T</div>
              <div>
                <div className={styles.chatName}>Your Channel</div>
                <div className={styles.chatSubs}>1,234 subscribers</div>
              </div>
            </div>
            <div className={styles.chatBody}>
              <div className={styles.bubble}>
                <p>🚀 Exciting update! We just launched our new feature...</p>
                <span className={styles.bubbleMeta}>
                  10:00
                  <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
                    <path d="M1 5L4 8L10 2" stroke="#4FAE4E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M6 5L9 8L15 2" stroke="#4FAE4E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
              <div className={styles.bubbleScheduled}>
                <div className={styles.scheduledBadge}>⏳ Scheduled — 14:30</div>
                <p>📊 Weekly stats: engagement is up 23% this week!</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.features}>
        <h2 className={styles.sectionTitle}>Everything you need</h2>
        <div className={styles.featuresGrid}>
          {FEATURES.map((f, i) => (
            <div key={f.title} className={styles.feature} style={{ animationDelay: `${i * 0.06}s` }}>
              <span className={styles.featureIcon}>{f.icon}</span>
              <h3 className={styles.featureName}>{f.title}</h3>
              <p className={styles.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.pricing}>
        <h2 className={styles.sectionTitle}>Simple pricing</h2>
        <p className={styles.pricingDesc}>Start free. Upgrade when you need more.</p>
        <div className={styles.plans}>
          <div className={styles.plan}>
            <h3 className={styles.planName}>Free</h3>
            <div className={styles.planPrice}>$0</div>
            <ul className={styles.planList}>
              <li>1 channel</li>
              <li>10 posts / month</li>
              <li>Basic scheduling</li>
            </ul>
            <button className={styles.planBtn} onClick={() => navigate('/dashboard')}>Get Started</button>
          </div>
          <div className={`${styles.plan} ${styles.planPro}`}>
            <div className={styles.proBadge}>Popular</div>
            <h3 className={styles.planName}>Pro</h3>
            <div className={styles.planPrice}>$5<span>/mo</span></div>
            <ul className={styles.planList}>
              <li>Unlimited channels</li>
              <li>Unlimited posts</li>
              <li>Analytics</li>
              <li>AI drafts</li>
              <li>Queue posting</li>
            </ul>
            <button className={styles.planBtnPro}>Start Free Trial</button>
          </div>
          <div className={styles.plan}>
            <h3 className={styles.planName}>Team</h3>
            <div className={styles.planPrice}>$15<span>/mo</span></div>
            <ul className={styles.planList}>
              <li>Everything in Pro</li>
              <li>5 team members</li>
              <li>Approval workflow</li>
              <li>Priority support</li>
            </ul>
            <button className={styles.planBtn}>Contact Us</button>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <span>© 2026 Telexa</span>
      </footer>
    </div>
  )
}
