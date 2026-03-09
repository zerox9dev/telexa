import { useNavigate } from 'react-router-dom'
import styles from './Landing.module.css'

const FEATURES = [
  { icon: '📅', title: 'Schedule Posts', desc: 'Plan content ahead. Set date, time, and timezone.' },
  { icon: '📊', title: 'Analytics', desc: 'Track views, forwards, and reactions per post.' },
  { icon: '🔗', title: 'Multi-Channel', desc: 'Manage multiple Telegram channels from one place.' },
  { icon: '🤖', title: 'AI Drafts', desc: 'Generate post ideas from a topic in seconds.' },
  { icon: '📷', title: 'Media Support', desc: 'Photos, videos, documents — everything Telegram supports.' },
  { icon: '⏱️', title: 'Queue', desc: 'Set up a posting queue with custom intervals.' },
]

export function Landing() {
  const navigate = useNavigate()

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.logo}>
            <span>⚡</span> Telexa
          </div>
          <button className={styles.loginBtn} onClick={() => navigate('/dashboard')}>
            Log In
          </button>
        </div>
      </header>

      <section className={styles.hero}>
        <h1 className={styles.heroTitle}>
          Schedule Telegram posts<br />like a pro
        </h1>
        <p className={styles.heroDesc}>
          The simplest way to plan, schedule, and publish content
          to your Telegram channels. No bloat, just what you need.
        </p>
        <button className={styles.cta} onClick={() => navigate('/dashboard')}>
          Get Started — Free
        </button>
      </section>

      <section className={styles.features}>
        <div className={styles.featuresGrid}>
          {FEATURES.map(f => (
            <div key={f.title} className={styles.featureCard}>
              <span className={styles.featureIcon}>{f.icon}</span>
              <h3 className={styles.featureTitle}>{f.title}</h3>
              <p className={styles.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.pricing}>
        <h2 className={styles.sectionTitle}>Simple Pricing</h2>
        <div className={styles.pricingGrid}>
          <div className={styles.priceCard}>
            <h3 className={styles.planName}>Free</h3>
            <div className={styles.planPrice}>$0</div>
            <ul className={styles.planFeatures}>
              <li>1 channel</li>
              <li>10 posts / month</li>
              <li>Basic scheduling</li>
            </ul>
          </div>
          <div className={`${styles.priceCard} ${styles.popular}`}>
            <span className={styles.popularBadge}>Popular</span>
            <h3 className={styles.planName}>Pro</h3>
            <div className={styles.planPrice}>$5<span>/mo</span></div>
            <ul className={styles.planFeatures}>
              <li>Unlimited channels</li>
              <li>Unlimited posts</li>
              <li>Analytics</li>
              <li>AI drafts</li>
              <li>Queue posting</li>
            </ul>
          </div>
          <div className={styles.priceCard}>
            <h3 className={styles.planName}>Team</h3>
            <div className={styles.planPrice}>$15<span>/mo</span></div>
            <ul className={styles.planFeatures}>
              <li>Everything in Pro</li>
              <li>5 team members</li>
              <li>Approval workflow</li>
              <li>Priority support</li>
            </ul>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>© 2026 Telexa. Built with ⚡</p>
      </footer>
    </div>
  )
}
