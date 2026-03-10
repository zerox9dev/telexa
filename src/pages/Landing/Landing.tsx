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
      <div className={styles.topBar}>
        <div className={styles.topInner}>
          <div className={styles.logo}>
            <svg width="24" height="24" viewBox="0 0 28 28" fill="none">
              <path d="M3 7.5L14 2L25 7.5V20.5L14 26L3 20.5V7.5Z" fill="#229ED9" />
              <path d="M8 13L12 17L20 9" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Telexa
          </div>
          <button className={styles.loginBtn} onClick={handleStart}>
            Log In
          </button>
        </div>
      </div>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroBadge}>
            <div className={styles.dot} />
            Local Mode Active
          </div>
          <h1 className={styles.heroTitle}>
            The smart way to run<br />
            your Telegram channels.
          </h1>
          <p className={styles.heroDesc}>
            Schedule posts, automate delivery, and grow your audience with 
            the clean, native-feeling planner for modern creators.
          </p>
          <div className={styles.heroCta}>
            <button className={styles.primaryBtn} onClick={handleStart}>
              {isSupabaseConfigured ? 'Continue with Google' : 'Try it Locally'}
            </button>
            <button className={styles.secondaryBtn} onClick={() => window.open('https://github.com/zerox9dev/telexa', '_blank')}>
              View on GitHub
            </button>
          </div>
        </section>

        <section className={styles.heroPreview}>
          <div className={styles.chatWindow}>
            <div className={styles.chatHeader}>
              <div className={styles.chatAvatar}>P</div>
              <div>
                <div className={styles.chatName}>@Pix2Code</div>
                <div className={styles.chatSubs}>713 subscribers</div>
              </div>
            </div>
            <div className={styles.chatBody}>
              <div className={styles.bubble}>
                Post scheduled perfectly on time. No weird formatting, no extra dashes.
                <div className={styles.bubbleMeta}>
                  10:00 ✓✓
                </div>
              </div>
              <div className={styles.bubbleScheduled}>
                <div className={styles.scheduledBadge}>⏳ Scheduled for Tomorrow</div>
                With clean Telegram-native preview, you always know exactly how your post will look before you send it.
                <div className={styles.bubbleMeta}>
                  14:30
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.features}>
          <h2 className={styles.sectionTitle}>Built for Telegram</h2>
          <div className={styles.featuresGrid}>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>📝</span>
              <h3 className={styles.featureName}>Native Preview</h3>
              <p className={styles.featureDesc}>See exactly how your post will look with Telegram chat bubbles before hitting publish.</p>
            </div>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>📸</span>
              <h3 className={styles.featureName}>Media Support</h3>
              <p className={styles.featureDesc}>Upload photos seamlessly. Texts automatically become native captions under the image.</p>
            </div>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>🤖</span>
              <h3 className={styles.featureName}>AI Drafts</h3>
              <p className={styles.featureDesc}>Generate and refine posts with OpenAI or Anthropic directly in the editor.</p>
            </div>
          </div>
        </section>

        <section className={styles.pricing}>
          <h2 className={styles.sectionTitle}>Simple Pricing</h2>
          <p className={styles.pricingDesc}>Start for free. Upgrade when you need more power.</p>
          <div className={styles.plans}>
            <div className={styles.plan}>
              <div className={styles.planName}>Free</div>
              <div className={styles.planPrice}>$0<span>/mo</span></div>
              <ul className={styles.planList}>
                <li>1 Channel</li>
                <li>10 Posts per month</li>
                <li>Local Storage mode</li>
              </ul>
              <button className={styles.planBtn} onClick={handleStart}>Get Started</button>
            </div>
            <div className={`${styles.plan} ${styles.planPro}`}>
              <div className={styles.proBadge}>Popular</div>
              <div className={styles.planName}>Pro</div>
              <div className={styles.planPrice}>$5<span>/mo</span></div>
              <ul className={styles.planList}>
                <li>Unlimited Channels</li>
                <li>Unlimited Posts</li>
                <li>AI Drafts & Refinement</li>
                <li>Background Cloud Posting</li>
              </ul>
              <button className={styles.planBtnPro}>Upgrade</button>
            </div>
            <div className={styles.plan}>
              <div className={styles.planName}>Team</div>
              <div className={styles.planPrice}>$15<span>/mo</span></div>
              <ul className={styles.planList}>
                <li>5 Team Members</li>
                <li>Approval Workflows</li>
                <li>Analytics Dashboard</li>
              </ul>
              <button className={styles.planBtn}>Contact Us</button>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        © {new Date().getFullYear()} Telexa. Built by creators for creators.
      </footer>
    </div>
  )
}
