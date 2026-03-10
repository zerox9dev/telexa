import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/auth'
import { useEffect } from 'react'
import { isSupabaseConfigured } from '../../lib/supabase'
import styles from './Landing.module.css'

export function Landing() {
  const navigate = useNavigate()
  const { user, signInWithGoogle } = useAuth()

  useEffect(() => {
    if (user && isSupabaseConfigured) {
      navigate('/dashboard')
    }
  }, [user, navigate])


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
            Увійти
          </button>
        </div>
      </div>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroBadge}>
            <div className={styles.dot} />
            Локальний режим
          </div>
          <h1 className={styles.heroTitle}>
            Розумний спосіб вести<br />
            свої Telegram-канали.
          </h1>
          <p className={styles.heroDesc}>
            Плануйте пости, автоматизуйте публікації та нарощуйте аудиторію 
            з чистим, зручним планувальником для сучасних креаторів.
          </p>
          <div className={styles.heroCta}>
            <button className={styles.primaryBtn} onClick={handleStart}>
              {isSupabaseConfigured ? 'Продовжити з Google' : 'Спробувати локально'}
            </button>
            <button className={styles.secondaryBtn} onClick={() => window.open('https://github.com/zerox9dev/telexa', '_blank')}>
              Переглянути на GitHub
            </button>
          </div>
        </section>

        <section className={styles.heroPreview}>
          <div className={styles.chatWindow}>
            <div className={styles.chatHeader}>
              <div className={styles.chatAvatar}>P</div>
              <div>
                <div className={styles.chatName}>@Pix2Code</div>
                <div className={styles.chatSubs}>713 підписників</div>
              </div>
            </div>
            <div className={styles.chatBody}>
              <div className={styles.bubble}>
                Пост опубліковано вчасно. Жодного зайвого форматування, жодних зайвих тире.
                <div className={styles.bubbleMeta}>
                  10:00 ✓✓
                </div>
              </div>
              <div className={styles.bubbleScheduled}>
                <div className={styles.scheduledBadge}>⏳ Заплановано на завтра</div>
                З чистим Telegram-нативним прев'ю ви завжди точно знаєте, як виглядатиме ваш пост перед відправкою.
                <div className={styles.bubbleMeta}>
                  14:30
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.features}>
          <h2 className={styles.sectionTitle}>Створено для Telegram</h2>
          <div className={styles.featuresGrid}>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>📝</span>
              <h3 className={styles.featureName}>Нативний прев'ю</h3>
              <p className={styles.featureDesc}>Бачте, як саме виглядатиме ваш пост у вигляді Telegram-бульбашок ще до публікації.</p>
            </div>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>📸</span>
              <h3 className={styles.featureName}>Медіа-підтримка</h3>
              <p className={styles.featureDesc}>Завантажуйте фото без зусиль. Текст автоматично стає нативним підписом під зображенням.</p>
            </div>
            <div className={styles.feature}>
              <span className={styles.featureIcon}>🤖</span>
              <h3 className={styles.featureName}>AI-чернетки</h3>
              <p className={styles.featureDesc}>Генеруйте та покращуйте пости за допомогою OpenAI або Anthropic прямо в редакторі.</p>
            </div>
          </div>
        </section>

        <section className={styles.pricing}>
          <h2 className={styles.sectionTitle}>Прості тарифи</h2>
          <p className={styles.pricingDesc}>Починайте безкоштовно. Оновіть, коли потрібно більше.</p>
          <div className={styles.plans}>
            <div className={styles.plan}>
              <div className={styles.planName}>Free</div>
              <div className={styles.planPrice}>$0<span>/міс</span></div>
              <ul className={styles.planList}>
                <li>1 канал</li>
                <li>10 постів на місяць</li>
                <li>Локальне сховище</li>
              </ul>
              <button className={styles.planBtn} onClick={handleStart}>Почати</button>
            </div>
            <div className={`${styles.plan} ${styles.planPro}`}>
              <div className={styles.proBadge}>Популярний</div>
              <div className={styles.planName}>Pro</div>
              <div className={styles.planPrice}>$5<span>/міс</span></div>
              <ul className={styles.planList}>
                <li>Необмежено каналів</li>
                <li>Необмежено постів</li>
                <li>AI-чернетки та покращення</li>
                <li>Хмарна публікація у фоні</li>
              </ul>
              <button className={styles.planBtnPro}>Оновити</button>
            </div>
            <div className={styles.plan}>
              <div className={styles.planName}>Team</div>
              <div className={styles.planPrice}>$15<span>/міс</span></div>
              <ul className={styles.planList}>
                <li>5 учасників команди</li>
                <li>Воркфлоу з погодженням</li>
                <li>Аналітичний дашборд</li>
              </ul>
              <button className={styles.planBtn}>Зв'язатися</button>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        © {new Date().getFullYear()} Telexa. Створено для креаторів.
      </footer>
    </div>
  )
}
