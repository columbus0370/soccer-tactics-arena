const POS_COLORS = {
  GK: '#f59e0b',
  DF: '#3b82f6',
  MF: '#10b981',
  FW: '#ef4444',
}

const RANK_COLORS = {
  S: '#f59e0b',
  A: '#a855f7',
  B: '#3b82f6',
  C: '#6b7280',
}

function getOverall(stats) {
  if (!stats) return 0
  const vals = [stats.speed, stats.shooting, stats.passing, stats.dribbling, stats.physical, stats.defense]
  const sum = vals.reduce((a, b) => a + (b || 0), 0)
  return Math.round(sum / vals.length)
}

function getRank(stats) {
  if (!stats) return 'C'
  const vals = [stats.speed, stats.shooting, stats.passing, stats.dribbling, stats.physical, stats.defense]
  const total = vals.reduce((a, b) => a + (b || 0), 0)
  if (total >= 450) return 'S'
  if (total >= 380) return 'A'
  if (total >= 310) return 'B'
  return 'C'
}

const STAT_LABELS = {
  speed: 'SPD',
  shooting: 'SHT',
  passing: 'PAS',
  dribbling: 'DRB',
  physical: 'PHY',
  defense: 'DEF',
}

function PlayerCard({ player, isSelected, onClick }) {
  if (!player) return null
  const { skipper_name, position, stats } = player
  const overall = getOverall(stats)
  const rank = getRank(stats)
  const posColor = POS_COLORS[position] || '#8899bb'
  const rankColor = RANK_COLORS[rank] || '#6b7280'

  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-card)',
        borderRadius: 10,
        border: isSelected ? '2px solid var(--accent)' : '1px solid var(--border)',
        padding: '12px 14px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s',
        boxShadow: isSelected ? '0 0 12px rgba(0,212,170,0.25)' : 'none',
      }}
      onMouseEnter={e => {
        if (!isSelected) e.currentTarget.style.background = 'var(--bg-card-hover)'
      }}
      onMouseLeave={e => {
        if (!isSelected) e.currentTarget.style.background = 'var(--bg-card)'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        {/* Rank badge */}
        <div style={{
          width: 32, height: 32,
          borderRadius: 6,
          background: rankColor,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 900, fontSize: 16, color: '#fff',
          flexShrink: 0,
        }}>
          {rank}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {skipper_name}
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 2, alignItems: 'center' }}>
            <span style={{
              background: posColor,
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              padding: '1px 6px',
              borderRadius: 4,
            }}>
              {position}
            </span>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: rankColor }}>{overall}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>OVR</div>
        </div>
      </div>

      {/* Stats bars */}
      {stats && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {Object.entries(STAT_LABELS).map(([key, label]) => {
            const value = stats[key] || 0
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 26, fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>{label}</span>
                <div style={{ flex: 1, height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{
                    width: `${value}%`,
                    height: '100%',
                    background: value >= 80 ? 'var(--accent)' : value >= 60 ? 'var(--accent-secondary)' : 'var(--text-muted)',
                    borderRadius: 3,
                  }} />
                </div>
                <span style={{ width: 24, fontSize: 10, color: 'var(--text-secondary)', textAlign: 'right', flexShrink: 0 }}>{value}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default PlayerCard
