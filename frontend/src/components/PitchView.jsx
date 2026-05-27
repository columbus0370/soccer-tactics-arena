const FORMATION_POSITIONS = {
  '4-3-3': [
    { pos: 'GK', x: 50, y: 85 },
    { pos: 'DF', x: 15, y: 68 }, { pos: 'DF', x: 38, y: 68 }, { pos: 'DF', x: 62, y: 68 }, { pos: 'DF', x: 85, y: 68 },
    { pos: 'MF', x: 25, y: 48 }, { pos: 'MF', x: 50, y: 48 }, { pos: 'MF', x: 75, y: 48 },
    { pos: 'FW', x: 20, y: 22 }, { pos: 'FW', x: 50, y: 18 }, { pos: 'FW', x: 80, y: 22 },
  ],
  '4-2-4': [
    { pos: 'GK', x: 50, y: 85 },
    { pos: 'DF', x: 15, y: 68 }, { pos: 'DF', x: 38, y: 68 }, { pos: 'DF', x: 62, y: 68 }, { pos: 'DF', x: 85, y: 68 },
    { pos: 'MF', x: 35, y: 50 }, { pos: 'MF', x: 65, y: 50 },
    { pos: 'FW', x: 15, y: 22 }, { pos: 'FW', x: 38, y: 22 }, { pos: 'FW', x: 62, y: 22 }, { pos: 'FW', x: 85, y: 22 },
  ],
  '5-3-2': [
    { pos: 'GK', x: 50, y: 85 },
    { pos: 'DF', x: 10, y: 68 }, { pos: 'DF', x: 28, y: 68 }, { pos: 'DF', x: 50, y: 68 }, { pos: 'DF', x: 72, y: 68 }, { pos: 'DF', x: 90, y: 68 },
    { pos: 'MF', x: 25, y: 48 }, { pos: 'MF', x: 50, y: 48 }, { pos: 'MF', x: 75, y: 48 },
    { pos: 'FW', x: 35, y: 22 }, { pos: 'FW', x: 65, y: 22 },
  ],
  '3-5-2': [
    { pos: 'GK', x: 50, y: 85 },
    { pos: 'DF', x: 25, y: 68 }, { pos: 'DF', x: 50, y: 68 }, { pos: 'DF', x: 75, y: 68 },
    { pos: 'MF', x: 10, y: 50 }, { pos: 'MF', x: 28, y: 50 }, { pos: 'MF', x: 50, y: 50 }, { pos: 'MF', x: 72, y: 50 }, { pos: 'MF', x: 90, y: 50 },
    { pos: 'FW', x: 35, y: 22 }, { pos: 'FW', x: 65, y: 22 },
  ],
  '4-4-2': [
    { pos: 'GK', x: 50, y: 85 },
    { pos: 'DF', x: 15, y: 68 }, { pos: 'DF', x: 38, y: 68 }, { pos: 'DF', x: 62, y: 68 }, { pos: 'DF', x: 85, y: 68 },
    { pos: 'MF', x: 15, y: 50 }, { pos: 'MF', x: 38, y: 50 }, { pos: 'MF', x: 62, y: 50 }, { pos: 'MF', x: 85, y: 50 },
    { pos: 'FW', x: 35, y: 22 }, { pos: 'FW', x: 65, y: 22 },
  ],
}

const POS_COLORS = {
  GK: '#f59e0b',
  DF: '#3b82f6',
  MF: '#10b981',
  FW: '#ef4444',
}

function formatName(fullName) {
  if (!fullName) return '?'
  const parts = fullName.trim().split(' ')
  if (parts.length === 1) return parts[0].slice(0, 8)
  const initial = parts[0][0]
  const lastName = parts[parts.length - 1]
  return `${initial}.${lastName.slice(0, 7)}`
}

function PitchView({ formation = '4-3-3', players = [], onPlayerClick, selectedPlayerId }) {
  const positions = FORMATION_POSITIONS[formation] || FORMATION_POSITIONS['4-3-3']

  const W = 320
  const H = 440

  const toX = (pct) => (pct / 100) * W
  const toY = (pct) => (pct / 100) * H

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      style={{ width: '100%', maxWidth: 320, display: 'block', borderRadius: 8 }}
    >
      {/* Pitch background */}
      <rect width={W} height={H} fill="#1a3d1a" rx="8" />

      {/* Alternating stripes */}
      {[0, 1, 2, 3, 4].map(i => (
        <rect
          key={i}
          x={0}
          y={i * 88}
          width={W}
          height={88}
          fill={i % 2 === 0 ? 'rgba(0,0,0,0.07)' : 'transparent'}
        />
      ))}

      {/* Outer border */}
      <rect x="8" y="8" width={W - 16} height={H - 16} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" rx="4" />

      {/* Center line */}
      <line x1="8" y1={H / 2} x2={W - 8} y2={H / 2} stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />

      {/* Center circle */}
      <circle cx={W / 2} cy={H / 2} r="36" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
      <circle cx={W / 2} cy={H / 2} r="3" fill="rgba(255,255,255,0.5)" />

      {/* Top goal area */}
      <rect x={(W - 100) / 2} y="8" width="100" height="40" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
      {/* Top penalty spot */}
      <circle cx={W / 2} cy="60" r="2.5" fill="rgba(255,255,255,0.5)" />

      {/* Bottom goal area */}
      <rect x={(W - 100) / 2} y={H - 48} width="100" height="40" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
      {/* Bottom penalty spot */}
      <circle cx={W / 2} cy={H - 60} r="2.5" fill="rgba(255,255,255,0.5)" />

      {/* Players */}
      {positions.map((slot, i) => {
        const player = players[i]
        const cx = toX(slot.x)
        const cy = toY(slot.y)
        const posColor = POS_COLORS[slot.pos] || '#fff'
        const isSelected = player && selectedPlayerId === player.id

        if (!player) {
          return (
            <g key={i}>
              <circle
                cx={cx} cy={cy} r={12}
                fill="rgba(255,255,255,0.05)"
                stroke="rgba(255,255,255,0.25)"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <text
                x={cx} y={cy + 4}
                textAnchor="middle"
                fontSize="8"
                fill="rgba(255,255,255,0.3)"
              >
                {slot.pos}
              </text>
            </g>
          )
        }

        return (
          <g
            key={i}
            style={{ cursor: onPlayerClick ? 'pointer' : 'default' }}
            onClick={() => onPlayerClick && onPlayerClick(player, i)}
          >
            {/* Selection ring */}
            {isSelected && (
              <circle cx={cx} cy={cy} r={16} fill="none" stroke="#00d4aa" strokeWidth="2" />
            )}
            {/* Player circle */}
            <circle
              cx={cx} cy={cy} r={12}
              fill={isSelected ? '#00d4aa' : posColor}
              stroke={isSelected ? 'var(--accent)' : 'rgba(255,255,255,0.6)'}
              strokeWidth={isSelected ? 2.5 : 1.5}
            />
            {/* Position label inside circle */}
            <text
              x={cx} y={cy + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="9"
              fontWeight="700"
              fill="white"
              style={{ pointerEvents: 'none' }}
            >
              {slot.pos}
            </text>
            {/* Name background rect */}
            <rect
              x={cx - 28} y={cy + 14}
              width={56} height={16}
              rx={4} fill="rgba(0,0,0,0.7)"
              style={{ pointerEvents: 'none' }}
            />
            {/* Player name below circle */}
            <text
              x={cx} y={cy + 24}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="10.5"
              fontWeight="600"
              fill="white"
              style={{ pointerEvents: 'none' }}
            >
              {formatName(player.skipper_name)}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

export default PitchView
