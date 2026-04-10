import styles from './CrisisPage.module.css'

const RESOURCES = [
  { icon:'🤝', name:'iCall — TISS',           num:'9152987821',    desc:'Mon–Sat 8am–10pm · Free & confidential counselling' },
  { icon:'💙', name:'Vandrevala Foundation',   num:'1860-2662-345', desc:'24/7 · Free mental health helpline' },
  { icon:'🌸', name:'Snehi Foundation',        num:'044-24640050',  desc:'Mon–Fri 8am–10pm · Emotional support' },
  { icon:'📱', name:'NIMHANS Bangalore',       num:'080-46110007',  desc:'National Institute of Mental Health, India' },
  { icon:'🧡', name:'Fortis Stress Helpline',  num:'8376804102',    desc:'24/7 · Stress, anxiety, depression' },
]

export default function CrisisPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h2>Crisis Resources</h2>
        <p>You're not alone. Help is available any time, day or night.</p>
      </header>

      <div className={styles.body}>
        <div className={styles.emergencyCard}>
          <h3>⚠️ If you're in immediate danger</h3>
          <p>Please call emergency services immediately. Your life matters and help is available right now.</p>
          <div className={styles.resourceItem}>
            <span className={styles.rIcon}>🚨</span>
            <div>
              <div className={styles.rName}>Emergency Services</div>
              <div className={styles.rNum}>112</div>
              <div className={styles.rDesc}>India — Police, ambulance, fire</div>
            </div>
          </div>
        </div>

        <div className={styles.sectionLabel}>Mental Health Helplines — India</div>

        {RESOURCES.map(r => (
          <div key={r.name} className={styles.resourceItem} style={{ background: 'var(--card)', border: '1.5px solid var(--border)', marginBottom: 10, borderRadius: 'var(--radius-sm)', padding: '14px 16px' }}>
            <span className={styles.rIcon}>{r.icon}</span>
            <div>
              <div className={styles.rName}>{r.name}</div>
              <div className={styles.rNum}>{r.num}</div>
              <div className={styles.rDesc}>{r.desc}</div>
            </div>
          </div>
        ))}

        <div className={styles.rememberCard}>
          <h3>💚 Remember</h3>
          <p>Reaching out for help is a sign of strength, not weakness. Whatever you're going through, there are trained people ready to listen right now. Please don't face this alone.</p>
        </div>
      </div>
    </div>
  )
}
