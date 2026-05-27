import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function LobbyPage() {
  const navigate = useNavigate()
  const [selectedDifficulty, setSelectedDifficulty] = useState('normal')

  const difficulties = [
    { key: 'easy',   label: 'EASY',   sub: '初心者向け',  icon: '🌱', color: '#2ed573' },
    { key: 'normal', label: 'NORMAL', sub: 'バランス',    icon: '⚽', color: '#4f8cff', recommended: true },
    { key: 'hard',   label: 'HARD',   sub: '上級者向け',  icon: '🔥', color: '#ff4757' },
  ]

  return (
    <div style={styles.root}>
      {/* 背景エフェクト */}
      <div style={styles.bgPitch} />
      <div style={styles.bgGlow1} />
      <div style={styles.bgGlow2} />
      <div style={styles.bgGrid} />

      {/* コンテンツ */}
      <div style={styles.content}>
        {/* タイトルロゴエリア */}
        <div style={styles.logoArea}>
          <div style={styles.preTitle}>⚽ WELCOME TO</div>
          <h1 style={styles.title}>
            <span style={styles.titleLine1}>SOCCER</span>
            <span style={styles.titleLine2}>TACTICS ARENA</span>
          </h1>
          <div style={styles.titleGlow} />
          <p style={styles.subtitle}>戦術で勝利を掴め。采配がすべてを決める。</p>
        </div>

        {/* 難易度選択 */}
        <div style={styles.section}>
          <div style={styles.sectionLabel}>── 難易度を選択 ──</div>
          <div style={styles.diffGrid}>
            {difficulties.map(d => (
              <button
                key={d.key}
                style={{
                  ...styles.diffCard,
                  ...(selectedDifficulty === d.key ? { ...styles.diffCardActive, borderColor: d.color, boxShadow: `0 0 24px ${d.color}66, inset 0 0 12px ${d.color}22` } : {}),
                }}
                onClick={() => setSelectedDifficulty(d.key)}
              >
                {d.recommended && <span style={styles.recommendBadge}>推奨</span>}
                <span style={{ fontSize: 32 }}>{d.icon}</span>
                <span style={{ ...styles.diffLabel, color: selectedDifficulty === d.key ? d.color : 'var(--text-primary)' }}>{d.label}</span>
                <span style={styles.diffSub}>{d.sub}</span>
              </button>
            ))}
          </div>
        </div>

        {/* スタートボタン */}
        <button
          style={styles.startBtn}
          onClick={() => navigate('/team-select', { state: { difficulty: selectedDifficulty } })}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.04)'; e.currentTarget.style.boxShadow = '0 0 40px #00d4aa88' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 0 24px #00d4aa44' }}
        >
          <span style={{ fontSize: 22, marginRight: 10 }}>⚽</span>
          試合を始める
          <span style={{ fontSize: 18, marginLeft: 10 }}>→</span>
        </button>

        {/* フッター統計（ダミー） */}
        <div style={styles.footer}>
          <div style={styles.stat}><span style={styles.statNum}>444</span><span style={styles.statLabel}>選手</span></div>
          <div style={styles.statDivider} />
          <div style={styles.stat}><span style={styles.statNum}>20</span><span style={styles.statLabel}>クラブ</span></div>
          <div style={styles.statDivider} />
          <div style={styles.stat}><span style={styles.statNum}>5</span><span style={styles.statLabel}>フォーメーション</span></div>
        </div>
      </div>
    </div>
  )
}

const styles = {
  root: {
    minHeight: '100vh',
    background: '#050810',
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bgPitch: {
    position: 'absolute', inset: 0,
    background: 'radial-gradient(ellipse 120% 80% at 50% 110%, #0d2d0d 0%, #050810 60%)',
    pointerEvents: 'none',
  },
  bgGlow1: {
    position: 'absolute',
    width: 600, height: 600,
    borderRadius: '50%',
    background: 'radial-gradient(circle, #00d4aa18 0%, transparent 70%)',
    top: -100, left: -100,
    pointerEvents: 'none',
    animation: 'pulse 4s ease-in-out infinite',
  },
  bgGlow2: {
    position: 'absolute',
    width: 500, height: 500,
    borderRadius: '50%',
    background: 'radial-gradient(circle, #4f8cff14 0%, transparent 70%)',
    bottom: -100, right: -100,
    pointerEvents: 'none',
    animation: 'pulse 4s ease-in-out infinite 2s',
  },
  bgGrid: {
    position: 'absolute', inset: 0,
    backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
    backgroundSize: '60px 60px',
    pointerEvents: 'none',
  },
  content: {
    position: 'relative',
    zIndex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 40,
    padding: '40px 20px',
    width: '100%',
    maxWidth: 600,
  },
  logoArea: {
    textAlign: 'center',
    position: 'relative',
  },
  preTitle: {
    fontSize: 13,
    letterSpacing: '0.3em',
    color: '#00d4aa',
    marginBottom: 8,
    fontWeight: 600,
  },
  title: {
    display: 'flex',
    flexDirection: 'column',
    lineHeight: 1.1,
    margin: 0,
  },
  titleLine1: {
    fontSize: 'clamp(48px, 12vw, 80px)',
    fontWeight: 900,
    letterSpacing: '0.15em',
    background: 'linear-gradient(135deg, #ffffff 0%, #a8edff 50%, #00d4aa 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    textShadow: 'none',
    filter: 'drop-shadow(0 0 20px rgba(0,212,170,0.5))',
  },
  titleLine2: {
    fontSize: 'clamp(16px, 4vw, 26px)',
    fontWeight: 700,
    letterSpacing: '0.4em',
    color: '#4f8cff',
    filter: 'drop-shadow(0 0 10px rgba(79,140,255,0.6))',
  },
  titleGlow: {
    position: 'absolute',
    inset: 0,
    background: 'radial-gradient(ellipse 80% 40% at 50% 50%, rgba(0,212,170,0.08) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  subtitle: {
    marginTop: 16,
    fontSize: 14,
    color: 'var(--text-secondary)',
    letterSpacing: '0.05em',
  },
  section: {
    width: '100%',
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: 12,
    letterSpacing: '0.2em',
    color: 'var(--text-muted)',
    marginBottom: 16,
  },
  diffGrid: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
  },
  diffCard: {
    position: 'relative',
    flex: 1,
    maxWidth: 140,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 6,
    padding: '20px 12px',
    background: 'rgba(255,255,255,0.04)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 16,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    color: 'inherit',
    fontFamily: 'inherit',
  },
  diffCardActive: {
    background: 'rgba(255,255,255,0.08)',
    transform: 'translateY(-2px)',
  },
  recommendBadge: {
    position: 'absolute',
    top: -10,
    background: '#4f8cff',
    color: 'white',
    fontSize: 10,
    fontWeight: 700,
    padding: '2px 8px',
    borderRadius: 20,
    letterSpacing: '0.05em',
  },
  diffLabel: {
    fontSize: 15,
    fontWeight: 800,
    letterSpacing: '0.1em',
    transition: 'color 0.2s',
  },
  diffSub: {
    fontSize: 11,
    color: 'var(--text-muted)',
  },
  startBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 380,
    padding: '18px 32px',
    background: 'linear-gradient(135deg, #00d4aa, #00b894)',
    color: '#050810',
    border: 'none',
    borderRadius: 50,
    fontSize: 20,
    fontWeight: 800,
    fontFamily: 'inherit',
    cursor: 'pointer',
    letterSpacing: '0.05em',
    boxShadow: '0 0 24px #00d4aa44',
    transition: 'all 0.2s ease',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    gap: 24,
  },
  stat: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  },
  statNum: {
    fontSize: 24,
    fontWeight: 800,
    color: 'var(--text-primary)',
  },
  statLabel: {
    fontSize: 11,
    color: 'var(--text-muted)',
    letterSpacing: '0.1em',
  },
  statDivider: {
    width: 1,
    height: 30,
    background: 'var(--border)',
  },
}
