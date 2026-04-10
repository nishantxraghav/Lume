import styles from './Loading.module.css'

export default function Loading() {
  return (
    <div className={styles.wrap}>
      <div className={styles.logo}>🌤️</div>
      <div className={styles.bar}>
        <div className={styles.barFill} />
      </div>
      <p className={styles.label}>Loading Lume…</p>
    </div>
  )
}
