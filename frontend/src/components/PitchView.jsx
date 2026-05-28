import { useState, useRef, useEffect, useMemo } from 'react'

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

const W = 320, H = 440
const toX = p => (p / 100) * W
const toY = p => (p / 100) * H

// ─── PitchView ────────────────────────────────────────────────────────────────
// Props:
//   onPlayerClick(player, slotIndex) — tap/click a player (opens swap panel)
//   onSwapPlayers(fromIdx, toIdx)    — drag one player onto another to swap slots
function PitchView({ formation = '4-3-3', players = [], onPlayerClick, onSwapPlayers, selectedPlayerId }) {
  const positions = useMemo(
    () => FORMATION_POSITIONS[formation] || FORMATION_POSITIONS['4-3-3'],
    [formation]
  )

  const svgRef = useRef(null)
  // Imperative drag state (avoids stale-closure problems in event handlers)
  const ds = useRef({ fromIdx: null, dragging: false, sx: 0, sy: 0 })
  const longPressTimer = useRef(null)
  // Visual state — only what triggers re-renders
  const [dragVis, setDragVis] = useState(null) // { gx, gy, hoverIdx } | null

  // Convert screen → SVG coordinate space
  const toSVG = (cx, cy) => {
    const r = svgRef.current.getBoundingClientRect()
    return { x: (cx - r.left) * W / r.width, y: (cy - r.top) * H / r.height }
  }

  // Find slot index closest to (sx,sy) within snap radius, excluding one index
  const nearest = (sx, sy, excl) => {
    let best = null, bd = 44 // snap radius in SVG units
    positions.forEach((slot, i) => {
      if (i === excl || !players[i]) return
      const d = Math.hypot(sx - toX(slot.x), sy - toY(slot.y))
      if (d < bd) { bd = d; best = i }
    })
    return best
  }

  // Commit the swap and clean up
  const commitSwap = (clientX, clientY) => {
    if (!svgRef.current) return
    const { x, y } = toSVG(clientX, clientY)
    const toIdx = nearest(x, y, ds.current.fromIdx)
    if (toIdx !== null && onSwapPlayers) onSwapPlayers(ds.current.fromIdx, toIdx)
    ds.current = { fromIdx: null, dragging: false, sx: 0, sy: 0 }
    setDragVis(null)
  }

  // ── Mouse events ─────────────────────────────────────────────────
  const handleMouseDown = (e, idx) => {
    if (!onSwapPlayers || !players[idx]) return
    e.preventDefault()
    ds.current = { fromIdx: idx, dragging: false, sx: e.clientX, sy: e.clientY }
  }

  const handleSVGMouseMove = (e) => {
    const d = ds.current
    if (d.fromIdx === null) return
    if (!d.dragging) {
      if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 6) return
      ds.current.dragging = true
    }
    const { x, y } = toSVG(e.clientX, e.clientY)
    setDragVis({ gx: x, gy: y, hoverIdx: nearest(x, y, d.fromIdx) })
  }

  // Window mouseup: handles both click (no drag) and drag-release
  useEffect(() => {
    const onUp = (e) => {
      const d = ds.current
      if (d.fromIdx === null) return
      if (d.dragging) {
        commitSwap(e.clientX, e.clientY)
      } else {
        // Tap / click — check released near same player
        if (svgRef.current) {
          const { x, y } = toSVG(e.clientX, e.clientY)
          const slot = positions[d.fromIdx]
          if (slot && Math.hypot(x - toX(slot.x), y - toY(slot.y)) < 22) {
            const player = players[d.fromIdx]
            if (player && onPlayerClick) onPlayerClick(player, d.fromIdx)
          }
        }
        ds.current = { fromIdx: null, dragging: false, sx: 0, sy: 0 }
        setDragVis(null)
      }
    }
    window.addEventListener('mouseup', onUp)
    return () => window.removeEventListener('mouseup', onUp)
  }) // re-bind every render so closure captures latest props

  // ── Touch events ─────────────────────────────────────────────────
  const handleTouchStart = (e, idx) => {
    if (!onSwapPlayers) {
      // No swap — tap is handled by onClick which still fires
      return
    }
    const t = e.touches[0]
    ds.current = { fromIdx: null, dragging: false, sx: t.clientX, sy: t.clientY }
    longPressTimer.current = setTimeout(() => {
      if (!svgRef.current) return
      ds.current.fromIdx = idx
      ds.current.dragging = true
      const { x, y } = toSVG(t.clientX, t.clientY)
      setDragVis({ gx: x, gy: y, hoverIdx: null })
      // Haptic feedback on supported devices
      if (navigator.vibrate) navigator.vibrate(30)
    }, 350)
  }

  const handleTouchEnd = (e, idx, player) => {
    clearTimeout(longPressTimer.current)
    longPressTimer.current = null
    const d = ds.current
    if (d.dragging) {
      const t = e.changedTouches[0]
      commitSwap(t.clientX, t.clientY)
    } else {
      // Regular tap
      if (onPlayerClick && player) onPlayerClick(player, idx)
      ds.current = { fromIdx: null, dragging: false, sx: 0, sy: 0 }
      setDragVis(null)
    }
  }

  // Non-passive touchmove so we can preventDefault during drag (prevents scroll)
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const handler = (e) => {
      const t = e.touches[0]
      const d = ds.current
      // Cancel long-press if finger moves too much before drag activates
      if (longPressTimer.current && !d.dragging) {
        if (Math.hypot(t.clientX - d.sx, t.clientY - d.sy) > 8) {
          clearTimeout(longPressTimer.current)
          longPressTimer.current = null
        }
        return
      }
      if (!d.dragging || d.fromIdx === null) return
      e.preventDefault()
      const { x, y } = toSVG(t.clientX, t.clientY)
      setDragVis({ gx: x, gy: y, hoverIdx: nearest(x, y, d.fromIdx) })
    }
    el.addEventListener('touchmove', handler, { passive: false })
    return () => el.removeEventListener('touchmove', handler)
  }) // re-bind every render to capture latest positions / players

  // Derived values for ghost rendering
  const fromIdx = dragVis ? ds.current.fromIdx : null
  const ghostPlayer = fromIdx !== null ? players[fromIdx] : null
  const ghostPos = fromIdx !== null ? positions[fromIdx]?.pos : null

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      style={{
        width: '100%',
        display: 'block',
        borderRadius: 8,
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: dragVis ? 'none' : 'auto',
      }}
      onMouseMove={onSwapPlayers ? handleSVGMouseMove : undefined}
    >
      {/* Pitch background */}
      <rect width={W} height={H} fill="#1a3d1a" rx="8" />

      {/* Alternating stripes */}
      {[0, 1, 2, 3, 4].map(i => (
        <rect key={i} x={0} y={i * 88} width={W} height={88} fill={i % 2 === 0 ? 'rgba(0,0,0,0.07)' : 'transparent'} />
      ))}

      {/* Field markings */}
      <rect x="8" y="8" width={W - 16} height={H - 16} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" rx="4" />
      <line x1="8" y1={H / 2} x2={W - 8} y2={H / 2} stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
      <circle cx={W / 2} cy={H / 2} r="36" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
      <circle cx={W / 2} cy={H / 2} r="3" fill="rgba(255,255,255,0.5)" />
      <rect x={(W - 100) / 2} y="8" width="100" height="40" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
      <circle cx={W / 2} cy="60" r="2.5" fill="rgba(255,255,255,0.5)" />
      <rect x={(W - 100) / 2} y={H - 48} width="100" height="40" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
      <circle cx={W / 2} cy={H - 60} r="2.5" fill="rgba(255,255,255,0.5)" />

      {/* Player slots */}
      {positions.map((slot, i) => {
        const player = players[i]
        const cx = toX(slot.x), cy = toY(slot.y)
        const posColor = POS_COLORS[slot.pos] || '#fff'
        const isSelected = player && selectedPlayerId === player.id
        const isDragSrc = fromIdx === i
        const isHoverTarget = dragVis?.hoverIdx === i

        if (!player) {
          return (
            <g key={i}>
              {isHoverTarget && (
                <circle cx={cx} cy={cy} r={18} fill="rgba(0,212,170,0.2)" stroke="#00d4aa" strokeWidth="2" strokeDasharray="4 3" />
              )}
              <circle cx={cx} cy={cy} r={12} fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeDasharray="3 3" />
              <text x={cx} y={cy + 4} textAnchor="middle" fontSize="8" fill="rgba(255,255,255,0.3)">{slot.pos}</text>
            </g>
          )
        }

        return (
          <g
            key={i}
            style={{
              cursor: isDragSrc ? 'grabbing' : (onSwapPlayers ? 'grab' : (onPlayerClick ? 'pointer' : 'default')),
              opacity: isDragSrc ? 0.3 : 1,
            }}
            onMouseDown={onSwapPlayers ? (e) => handleMouseDown(e, i) : undefined}
            onTouchStart={onSwapPlayers ? (e) => handleTouchStart(e, i) : undefined}
            onTouchEnd={onSwapPlayers ? (e) => handleTouchEnd(e, i, player) : undefined}
            onClick={!onSwapPlayers && onPlayerClick ? () => onPlayerClick(player, i) : undefined}
          >
            {/* Hover drop-zone highlight */}
            {isHoverTarget && (
              <circle cx={cx} cy={cy} r={18} fill="rgba(0,212,170,0.2)" stroke="#00d4aa" strokeWidth="2" strokeDasharray="4 3" />
            )}
            {/* Selection ring */}
            {isSelected && !isDragSrc && (
              <circle cx={cx} cy={cy} r={16} fill="none" stroke="#00d4aa" strokeWidth="2" />
            )}
            {/* Player circle */}
            <circle
              cx={cx} cy={cy} r={12}
              fill={isSelected && !isDragSrc ? '#00d4aa' : posColor}
              stroke={isSelected ? 'var(--accent)' : 'rgba(255,255,255,0.6)'}
              strokeWidth={isSelected ? 2.5 : 1.5}
            />
            {/* Position label */}
            <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fontSize="9" fontWeight="700" fill="white" style={{ pointerEvents: 'none' }}>
              {slot.pos}
            </text>
            {/* Name tag */}
            <rect x={cx - 28} y={cy + 14} width={56} height={16} rx={4} fill="rgba(0,0,0,0.7)" style={{ pointerEvents: 'none' }} />
            <text x={cx} y={cy + 24} textAnchor="middle" dominantBaseline="middle" fontSize="10.5" fontWeight="600" fill="white" style={{ pointerEvents: 'none' }}>
              {formatName(player.skipper_name)}
            </text>
          </g>
        )
      })}

      {/* Drag ghost — follows cursor/finger */}
      {dragVis && ghostPlayer && (
        <g style={{ pointerEvents: 'none' }}>
          <circle cx={dragVis.gx} cy={dragVis.gy} r={14} fill={POS_COLORS[ghostPos] || '#888'} stroke="#00d4aa" strokeWidth="2.5" opacity={0.92} />
          <text x={dragVis.gx} y={dragVis.gy + 1} textAnchor="middle" dominantBaseline="middle" fontSize="9" fontWeight="700" fill="white">
            {ghostPos}
          </text>
          <rect x={dragVis.gx - 28} y={dragVis.gy + 16} width={56} height={16} rx={4} fill="rgba(0,0,0,0.88)" />
          <text x={dragVis.gx} y={dragVis.gy + 26} textAnchor="middle" dominantBaseline="middle" fontSize="10.5" fontWeight="600" fill="white">
            {formatName(ghostPlayer.skipper_name)}
          </text>
        </g>
      )}
    </svg>
  )
}

export default PitchView
