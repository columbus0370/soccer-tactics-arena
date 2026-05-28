import { useEffect } from 'react'

const DISMISS_MS = 3200

function PlayerShootingSVG({ color }) {
  return (
    <svg
      width="300" height="196"
      viewBox="0 0 300 196"
      fill="none"
      style={{ maxWidth: '100%' }}
      aria-hidden="true"
    >
      {/* Speed lines from left */}
      <line x1="0" y1="76"  x2="62"  y2="76"  stroke={color} strokeWidth="1.5" opacity="0.28"/>
      <line x1="0" y1="89"  x2="48"  y2="89"  stroke={color} strokeWidth="2.5" opacity="0.40"/>
      <line x1="0" y1="102" x2="56"  y2="102" stroke={color} strokeWidth="1.5" opacity="0.28"/>
      <line x1="0" y1="116" x2="40"  y2="116" stroke={color} strokeWidth="1"   opacity="0.18"/>

      {/* Head */}
      <circle cx="92" cy="37" r="17" fill={color} />

      {/* Torso */}
      <path d="M92 54 L86 108" stroke={color} strokeWidth="13" strokeLinecap="round" />

      {/* Left arm — forward-up for balance */}
      <path d="M89 70 L119 49 L134 43" stroke={color} strokeWidth="8" strokeLinecap="round" />

      {/* Right arm — pulled back */}
      <path d="M89 74 L65 91" stroke={color} strokeWidth="8" strokeLinecap="round" />

      {/* Standing leg */}
      <path d="M86 108 L83 156 L81 182" stroke={color} strokeWidth="12" strokeLinecap="round" />
      {/* Standing foot */}
      <path d="M81 182 L71 189 L58 188" stroke={color} strokeWidth="10" strokeLinecap="round" />

      {/* Kicking leg thigh */}
      <path d="M86 108 L129 91 L166 99" stroke={color} strokeWidth="12" strokeLinecap="round" />
      {/* Kicking lower leg + foot toward ball */}
      <path d="M166 99 L206 107 L228 104" stroke={color} strokeWidth="11" strokeLinecap="round" />

      {/* Impact sparks at foot–ball contact */}
      <line x1="230" y1="104" x2="243" y2="89"  stroke={color} strokeWidth="2.8" strokeLinecap="round" opacity="0.90"/>
      <line x1="231" y1="103" x2="248" y2="96"  stroke={color} strokeWidth="2.2" strokeLinecap="round" opacity="0.75"/>
      <line x1="230" y1="106" x2="242" y2="120" stroke={color} strokeWidth="2.8" strokeLinecap="round" opacity="0.90"/>
      <line x1="229" y1="101" x2="236" y2="84"  stroke={color} strokeWidth="1.8" strokeLinecap="round" opacity="0.60"/>
      <line x1="232" y1="108" x2="244" y2="124" stroke={color} strokeWidth="1.8" strokeLinecap="round" opacity="0.60"/>
      <line x1="233" y1="102" x2="248" y2="99"  stroke={color} strokeWidth="1.4" strokeLinecap="round" opacity="0.45"/>

      {/* Ball motion trail */}
      <circle cx="256" cy="103" r="20" fill={color} opacity="0.07"/>
      <circle cx="265" cy="103" r="14" fill={color} opacity="0.06"/>

      {/* Ball */}
      <circle cx="274" cy="103" r="22" fill="white" opacity="0.96"/>
      <circle cx="274" cy="103" r="22" stroke={color} strokeWidth="2.2" fill="none" opacity="0.50"/>
      {/* Soccer ball hex seam */}
      <path
        d="M274 84 L287 92 L287 114 L274 122 L261 114 L261 92 Z"
        stroke={color} strokeWidth="1.2" fill="none" opacity="0.28"
      />
      <circle cx="274" cy="103" r="8" fill={color} opacity="0.11"/>
    </svg>
  )
}

export default function GoalCutscene({ event, onDismiss }) {
  const isPK    = event.type === 'pk_goal'
  const isP1    = event.team === 'player1'
  const color   = isP1 ? '#00d4aa' : '#ff4757'
  const glow    = isP1 ? 'rgba(0,212,170,0.38)' : 'rgba(255,71,87,0.38)'
  const chipBg  = isP1 ? 'rgba(0,212,170,0.12)' : 'rgba(255,71,87,0.12)'
  const chipBdr = isP1 ? 'rgba(0,212,170,0.32)' : 'rgba(255,71,87,0.32)'

  useEffect(() => {
    const t = setTimeout(onDismiss, DISMISS_MS)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <div
      onClick={onDismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', overflow: 'hidden',
        animation: 'goalCutsceneIn 0.12s ease both',
      }}
    >
      {/* Dark backdrop */}
      <div style={{ position: 'absolute', inset: 0, background: '#03060e' }} />

      {/* Diagonal stripes (subtle) */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `repeating-linear-gradient(
          -45deg,
          transparent, transparent 28px,
          ${color}05 28px, ${color}05 30px
        )`,
      }} />

      {/* Radial glow burst */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `radial-gradient(ellipse 82% 56% at 50% 44%, ${glow} 0%, transparent 68%)`,
        animation: 'goalBgPulse 0.55s cubic-bezier(0.16,1,0.3,1) both',
      }} />

      {/* White flash overlay on entry */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'rgba(255,255,255,0.18)',
        animation: 'goalFlashWhite 0.3s ease both',
        pointerEvents: 'none',
      }} />

      {/* Main content — shake wrapper */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        width: '100%', maxWidth: 440,
        padding: '0 16px',
        animation: 'goalShake 0.58s ease 0.08s',
      }}>

        {/* Team + minute chip */}
        <div style={{
          fontSize: 11, letterSpacing: 3.5, color,
          fontWeight: 700, textTransform: 'uppercase',
          background: chipBg,
          border: `1px solid ${chipBdr}`,
          padding: '4px 18px', borderRadius: 20,
          marginBottom: 8,
          animation: 'fadeInUp 0.3s ease both',
        }}>
          {event.teamName}&nbsp;&nbsp;{event.minute}'
        </div>

        {/* Player shooting illustration */}
        <div style={{
          animation: 'goalPlayerSlideIn 0.48s cubic-bezier(0.16,1,0.3,1) 0.06s both',
          marginBottom: -10,
        }}>
          <PlayerShootingSVG color={color} />
        </div>

        {/* GOAL! */}
        <div style={{
          fontSize: 92, fontWeight: 900,
          lineHeight: 0.92, letterSpacing: -5,
          color: '#fff',
          textShadow: `
            0 0 24px ${color},
            0 0 56px ${glow},
            0 0 100px ${glow},
            0 4px 20px rgba(0,0,0,0.7)
          `,
          animation: 'goalTextZoom 0.48s cubic-bezier(0.34,1.56,0.64,1) 0.18s both',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          userSelect: 'none',
        }}>
          {isPK ? 'PK GOAL!' : 'GOAL!'}
        </div>

        {/* Scorer */}
        <div style={{
          fontSize: 24, fontWeight: 900, color: '#fff',
          marginTop: 16, letterSpacing: 0.5,
          textShadow: '0 2px 8px rgba(0,0,0,0.5)',
          animation: 'fadeInUp 0.35s ease 0.52s both',
        }}>
          {event.scorer}
        </div>

        {/* Assist */}
        {event.assist && (
          <div style={{
            fontSize: 12, color: 'rgba(255,255,255,0.46)',
            marginTop: 5, letterSpacing: 0.5,
            animation: 'fadeInUp 0.3s ease 0.64s both',
          }}>
            Assist: {event.assist}
          </div>
        )}
      </div>

      {/* Shot moment — bottom pill, outside main animation area */}
      {event.shotMoment && (
        <div style={{
          position: 'absolute', bottom: 58,
          left: 0, right: 0,
          display: 'flex', justifyContent: 'center',
          padding: '0 28px',
          animation: 'fadeInUp 0.4s ease 0.92s both',
        }}>
          <div style={{
            fontSize: 13.5,
            color: 'rgba(255,255,255,0.76)',
            fontStyle: 'italic',
            letterSpacing: 0.2,
            background: 'rgba(0,0,0,0.58)',
            padding: '9px 24px',
            borderRadius: 28,
            border: `1px solid ${color}28`,
            maxWidth: 340,
            textAlign: 'center',
            lineHeight: 1.45,
          }}>
            {event.shotMoment}
          </div>
        </div>
      )}

      {/* Skip hint */}
      <div style={{
        position: 'absolute', bottom: 20,
        fontSize: 11,
        color: 'rgba(255,255,255,0.2)',
        letterSpacing: 1.5,
        animation: 'fadeInUp 0.3s ease 1.3s both',
        userSelect: 'none',
      }}>
        タップでスキップ
      </div>
    </div>
  )
}
