import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { simulateFirstHalf, simulateSecondHalf } from '../api/gameApi'

const EVENT_CONFIG = {
  goal:           { icon: '⚽', color: '#2ed573', label: 'GOAL!' },
  pk_goal:        { icon: '⚽', color: '#2ed573', label: 'PK GOAL!' },
  pk_miss:        { icon: '❌', color: '#ffa502', label: 'PK失敗' },
  pk_awarded:     { icon: '🟡', color: '#ffd700', label: 'PK獲得' },
  shot_on_target: { icon: '🥅', color: '#4f8cff', label: 'セーブ' },
  shot_blocked:   { icon: '🛡', color: '#8899bb', label: 'ブロック' },
  super_save:     { icon: '🧤', color: '#00d4aa', label: 'スーパーセーブ' },
  yellow_card:    { icon: '🟨', color: '#ffd700', label: 'イエロー' },
  red_card:       { icon: '🟥', color: '#ff4757', label: 'レッドカード' },
  near_miss:      { icon: '💨', color: '#4a5568', label: 'ニアミス' },
}

function getEventMainText(evt) {
  switch (evt.type) {
    case 'goal':
    case 'pk_goal':
      return `${evt.scorer}${evt.assist ? ` (A:${evt.assist})` : ''}`
    case 'pk_miss':
      return `${evt.player} → GK ${evt.gkName}セーブ`
    case 'pk_awarded':
      return `${evt.player} が獲得`
    case 'shot_on_target':
      return `${evt.player} → GK ${evt.gkName}がセーブ`
    case 'shot_blocked':
      return `${evt.shooter} → ${evt.blocker}がブロック`
    case 'super_save':
      return `GK ${evt.gkName}`
    case 'yellow_card':
    case 'red_card':
      return `${evt.player}`
    case 'near_miss':
      return `${evt.player}`
    default:
      return evt.player || evt.scorer || ''
  }
}

function MatchEventItem({ evt, myTeam }) {
  const cfg = EVENT_CONFIG[evt.type] || { icon: '📋', color: '#8899bb', label: evt.type }
  const isMyTeam = evt.team === myTeam
  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-start',
      gap: 10,
      padding: '10px 14px',
      borderRadius: 10,
      background: isMyTeam ? `${cfg.color}15` : 'rgba(255,255,255,0.03)',
      borderLeft: `3px solid ${isMyTeam ? cfg.color : '#2a3a5a'}`,
      marginBottom: 6,
      animation: 'slideInLeft 0.3s ease',
    }}>
      <span style={{ fontSize: 18, lineHeight: 1.4 }}>{cfg.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color, letterSpacing: '0.05em' }}>
            {evt.minute}'
          </span>
          <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color }}>
            {cfg.label}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {evt.teamName}
          </span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>
          {getEventMainText(evt)}
        </div>
        {evt.description && (
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {evt.description}
          </div>
        )}
      </div>
    </div>
  )
}

const EVENT_FILTERS = [
  { key: 'all',       label: '全て' },
  { key: 'important', label: '重要' },
]

const importantTypes = new Set(['goal', 'pk_goal', 'pk_miss', 'pk_awarded', 'red_card', 'super_save', 'yellow_card'])

// OVR平均を計算（フロント用）
function calcOVR(players) {
  if (!players || players.length === 0) return 0
  const total = players.reduce((sum, p) => {
    const s = p.stats || {}
    const vals = Object.values(s)
    return sum + (vals.length ? Math.round(vals.reduce((a, v) => a + v, 0) / vals.length) : 0)
  }, 0)
  return Math.round(total / players.length)
}

function MatchPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { player1, player2, player1Bench = [] } = location.state || {}

  // Intro splash state
  const [showIntro, setShowIntro] = useState(true)
  const [introExiting, setIntroExiting] = useState(false)

  const [matchResult, setMatchResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [phase, setPhase] = useState('loading') // 'loading'|'first_half'|'halftime'|'second_half'|'finished'
  const [firstHalfData, setFirstHalfData] = useState(null)
  const [currentPlayer1, setCurrentPlayer1] = useState(null)
  const [htFormation, setHtFormation] = useState(null)
  const [htTactic, setHtTactic] = useState(null)
  const [htSubs, setHtSubs] = useState([]) // [{outIdx, inPlayer}] max 3
  const [subPickingFor, setSubPickingFor] = useState(null) // slot index | null

  const [gameMinute, setGameMinute] = useState(0)
  const [displayScore, setDisplayScore] = useState({ player1: 0, player2: 0 })
  const [visibleEvents, setVisibleEvents] = useState([])
  const [scoreAnimate, setScoreAnimate] = useState({ player1: false, player2: false })
  const [finished, setFinished] = useState(false)
  const [eventFilter, setEventFilter] = useState('all')

  const timerRef = useRef(null)
  const minuteRef = useRef(0)
  const eventsRef = useRef([])
  const resultRef = useRef(null)
  const phaseRef = useRef('loading')
  const eventIndexRef = useRef(0)

  // Intro splash auto-dismiss (3.5s total: fade-out starts at 2.9s)
  useEffect(() => {
    const exitT = setTimeout(() => setIntroExiting(true), 4400)
    const hideT = setTimeout(() => setShowIntro(false), 5000)
    return () => { clearTimeout(exitT); clearTimeout(hideT) }
  }, [])

  // Keep phaseRef in sync with phase state
  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => {
    if (!player1 || !player2) {
      navigate('/')
      return
    }
    simulateFirstHalf(player1, player2)
      .then(result => {
        setFirstHalfData(result)
        setMatchResult(result)
        resultRef.current = result
        setCurrentPlayer1(player1)
        setHtFormation(player1.formation)
        setHtTactic(player1.tactic)
      })
      .catch(e => setError(e.message))
      .finally(() => { setLoading(false); setPhase('first_half') })
  }, [])

  useEffect(() => {
    if (!matchResult) return
    eventsRef.current = matchResult.events || []
    eventIndexRef.current = 0

    const INTERVAL_MS = 1500
    const allEvents = eventsRef.current

    timerRef.current = setInterval(() => {
      const idx = eventIndexRef.current

      if (idx < allEvents.length) {
        const ev = allEvents[idx]
        minuteRef.current = ev.minute
        setGameMinute(ev.minute)

        setVisibleEvents(prev => {
          const next = [...prev, ev]
          if (ev.type === 'goal' || ev.type === 'pk_goal') {
            const side = ev.team === player1?.teamId || ev.teamName === player1?.teamName ? 'player1' : 'player2'
            setDisplayScore(s => ({ ...s, [side]: s[side] + 1 }))
            setScoreAnimate(p => ({ ...p, [side]: true }))
            setTimeout(() => setScoreAnimate(p => ({ ...p, [side]: false })), 500)
          }
          return next
        })

        eventIndexRef.current = idx + 1
      } else {
        clearInterval(timerRef.current)
        if (phaseRef.current === 'first_half') {
          minuteRef.current = 45
          setGameMinute(45)
          setPhase('halftime')
        } else {
          // second_half finished
          minuteRef.current = 90
          setGameMinute(90)
          setFinished(true)
          setTimeout(() => {
            const base = resultRef.current || matchResult
            const enriched = {
              ...base,
              player1TeamId: player1?.teamId,
              player1TeamName: (phaseRef.current === 'second_half' ? base.player1TeamName : null) || currentPlayer1?.teamName || player1?.teamName,
              cpuTeamName: player2?.teamName,
              player1Players: currentPlayer1?.players || player1?.players || [],
              player2Players: player2?.players || [],
            }
            navigate('/result', { state: enriched })
          }, 2000)
        }
      }
    }, INTERVAL_MS)

    return () => clearInterval(timerRef.current)
  }, [matchResult])

  const handleSkip = () => {
    clearInterval(timerRef.current)
    const allEvents = matchResult?.events || []
    setVisibleEvents(allEvents)
    // Recalculate score
    const s = { player1: 0, player2: 0 }
    allEvents.forEach(ev => {
      if (ev.type === 'goal' || ev.type === 'pk_goal') {
        const side = ev.team === player1?.teamId || ev.teamName === player1?.teamName ? 'player1' : 'player2'
        s[side]++
      }
    })
    setDisplayScore(s)

    if (phase === 'first_half') {
      setGameMinute(45)
      setPhase('halftime')
    } else {
      setGameMinute(90)
      setFinished(true)
      setTimeout(() => {
        const base = resultRef.current || matchResult
        const enriched = {
          ...base,
          player1TeamId: player1?.teamId,
          player1TeamName: currentPlayer1?.teamName || player1?.teamName,
          cpuTeamName: player2?.teamName,
          player1Players: currentPlayer1?.players || player1?.players || [],
          player2Players: player2?.players || [],
        }
        navigate('/result', { state: enriched })
      }, 1500)
    }
  }

  const handleStartSecondHalf = async () => {
    // Apply halftime changes
    const updatedLineup = [...(currentPlayer1.players)]
    htSubs.forEach(({ outIdx, inPlayer }) => {
      updatedLineup[outIdx] = inPlayer
    })
    const updatedPlayer1 = {
      ...currentPlayer1,
      formation: htFormation,
      tactic: htTactic,
      players: updatedLineup,
    }
    setCurrentPlayer1(updatedPlayer1)
    setPhase('loading')
    setLoading(true)

    try {
      const result = await simulateSecondHalf(
        updatedPlayer1,
        player2,
        firstHalfData.score,
        firstHalfData.p1ScoreHint
      )
      // Merge first and second half events for final result
      const allEvents = [...(firstHalfData.events || []), ...(result.events || [])]
      const combined = { ...result, events: allEvents }

      // Only stream second-half events; first-half feed resets
      const h2Only = { ...result }
      setMatchResult(h2Only)
      resultRef.current = combined // navigate will use this (combined events)
      setGameMinute(45)
      setVisibleEvents([]) // reset event feed for second half
      eventIndexRef.current = 0
      setPhase('second_half')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const possession = matchResult?.stats?.player1?.possession || 50

  const filteredEvents = eventFilter === 'all'
    ? visibleEvents
    : visibleEvents.filter(e => importantTypes.has(e.type))

  if (loading) {
    return (
      <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="spinner" style={{ marginBottom: 16 }} />
        <p style={{ color: 'var(--text-secondary)' }}>
          {phase === 'loading' && !firstHalfData ? '試合をシミュレート中...' : '後半をシミュレート中...'}
        </p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ color: 'var(--danger)', marginBottom: 12 }}>エラー: {error}</p>
        <button className="btn btn-secondary" onClick={() => navigate(-1)}>戻る</button>
      </div>
    )
  }

  const p1OVR = calcOVR(player1?.players)
  const p2OVR = calcOVR(player2?.players)

  return (
    <>
    {/* ── Match Intro Splash ────────────────────────────── */}
    {showIntro && (
      <div
        onClick={() => { setIntroExiting(false); setShowIntro(false) }}
        style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: '#04070f',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', cursor: 'pointer',
          animation: introExiting ? 'introFadeOut 0.6s ease forwards' : 'none',
        }}
      >
        {/* Radial glow backdrop */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(0,212,170,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Header label */}
        <div style={{
          fontSize: 11, letterSpacing: 5, color: 'rgba(0,212,170,0.55)',
          fontWeight: 700, textTransform: 'uppercase', marginBottom: 44,
          animation: 'fadeInUp 0.5s ease 0.2s both',
        }}>
          MATCH START
        </div>

        {/* Horizontal dividing line */}
        <div style={{
          position: 'absolute', top: '50%', left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)',
          transformOrigin: 'center',
          animation: 'lineExpand 0.6s ease 0.7s both',
        }} />

        {/* Teams row */}
        <div style={{ display: 'flex', alignItems: 'center', width: '100%', maxWidth: 420, padding: '0 16px' }}>

          {/* Player team (left) */}
          <div style={{
            flex: 1, textAlign: 'right', paddingRight: 18,
            animation: 'introSlideLeft 0.65s cubic-bezier(0.16,1,0.3,1) 0.45s both',
          }}>
            <div style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 700, letterSpacing: 3, marginBottom: 6, textTransform: 'uppercase' }}>
              YOUR TEAM
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', lineHeight: 1.15, marginBottom: 6, wordBreak: 'break-word' }}>
              {player1?.teamName || 'YOUR TEAM'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>{player1?.formation}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{player1?.tactic}</div>
            <div style={{
              marginTop: 14, fontSize: 38, fontWeight: 900, color: 'var(--accent)',
              lineHeight: 1, animation: 'fadeInUp 0.4s ease 1.1s both',
            }}>
              {p1OVR}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 3, marginTop: 2 }}>OVR</div>
          </div>

          {/* VS badge */}
          <div style={{
            width: 60, textAlign: 'center', flexShrink: 0,
            animation: 'vsAppear 0.55s cubic-bezier(0.34,1.56,0.64,1) 0.75s both',
          }}>
            <div style={{
              fontSize: 22, fontWeight: 900, color: '#fff',
              textShadow: '0 0 24px rgba(0,212,170,0.9), 0 0 8px rgba(0,212,170,0.5)',
              letterSpacing: 1,
            }}>
              VS
            </div>
          </div>

          {/* CPU team (right) */}
          <div style={{
            flex: 1, textAlign: 'left', paddingLeft: 18,
            animation: 'introSlideRight 0.65s cubic-bezier(0.16,1,0.3,1) 0.45s both',
          }}>
            <div style={{ fontSize: 10, color: '#ff4757', fontWeight: 700, letterSpacing: 3, marginBottom: 6, textTransform: 'uppercase' }}>
              CPU TEAM
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', lineHeight: 1.15, marginBottom: 6, wordBreak: 'break-word' }}>
              {player2?.teamName || 'CPU TEAM'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 2 }}>{player2?.formation}</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{player2?.tactic}</div>
            <div style={{
              marginTop: 14, fontSize: 38, fontWeight: 900, color: '#ff4757',
              lineHeight: 1, animation: 'fadeInUp 0.4s ease 1.1s both',
            }}>
              {p2OVR}
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: 3, marginTop: 2 }}>OVR</div>
          </div>
        </div>

        {/* Kick off pulse */}
        <div style={{
          marginTop: 56, fontSize: 15, fontWeight: 700,
          color: 'rgba(255,255,255,0.35)', letterSpacing: 4, textTransform: 'uppercase',
          animation: 'pulse 1.4s ease 1.6s infinite, fadeInUp 0.4s ease 1.6s both',
        }}>
          ⚽ KICK OFF
        </div>

        {/* Skip hint */}
        <div style={{
          position: 'absolute', bottom: 28,
          fontSize: 12, color: 'rgba(255,255,255,0.18)',
          animation: 'fadeInUp 0.4s ease 2s both',
        }}>
          タップでスキップ
        </div>
      </div>
    )}

    <div
      className="page"
      style={{
        maxWidth: 640,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
      }}
    >
      {/* Halftime overlay */}
      {phase === 'halftime' && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(10,14,26,0.97)',
          zIndex: 100, overflowY: 'auto', padding: '24px 16px',
          display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 480, margin: '0 auto',
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', padding: '8px 0 4px' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--warning)' }}>⏸ ハーフタイム</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 8, color: 'var(--text-primary)' }}>
              前半スコア: {displayScore.player1} - {displayScore.player2}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              {player1?.teamName} vs {player2?.teamName}
            </div>
          </div>

          {/* Formation change */}
          <div className="card">
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
              フォーメーション変更
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['4-3-3', '4-2-4', '5-3-2', '3-5-2', '4-4-2'].map(f => (
                <button key={f} onClick={() => setHtFormation(f)} style={{
                  padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 14, fontWeight: 700,
                  background: htFormation === f ? 'var(--accent)' : 'var(--bg-secondary)',
                  color: htFormation === f ? '#0a0e1a' : 'var(--text-secondary)',
                  transition: 'all 0.15s',
                }}>{f}</button>
              ))}
            </div>
          </div>

          {/* Tactic change */}
          <div className="card">
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
              戦術変更
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['パス主導型', 'ロングボール型', 'サイド攻撃型'].map(t => (
                <button key={t} onClick={() => setHtTactic(t)} style={{
                  padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
                  fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
                  background: htTactic === t ? 'rgba(0,212,170,0.1)' : 'var(--bg-secondary)',
                  color: htTactic === t ? 'var(--accent)' : 'var(--text-secondary)',
                  border: htTactic === t ? '2px solid var(--accent)' : '1px solid var(--border)',
                  transition: 'all 0.15s',
                }}>{t}</button>
              ))}
            </div>
          </div>

          {/* Substitutions */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: 1 }}>
                選手交代
              </div>
              <div style={{ fontSize: 12, color: 'var(--warning)' }}>{htSubs.length}/3</div>
            </div>

            {subPickingFor !== null ? (
              <div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
                  交代選手を選択してください
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
                  {player1Bench
                    .filter(p => !htSubs.some(s => s.inPlayer.id === p.id))
                    .map(p => (
                      <div key={p.id} onClick={() => {
                        setHtSubs(prev => [...prev, { outIdx: subPickingFor, inPlayer: p }])
                        setSubPickingFor(null)
                      }} style={{
                        padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{p.skipper_name}</span>
                        <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4,
                          background: p.position === 'GK' ? '#f59e0b' : p.position === 'DF' ? '#3b82f6' : p.position === 'MF' ? '#10b981' : '#ef4444',
                          color: '#fff', fontWeight: 700 }}>{p.position}</span>
                      </div>
                    ))}
                </div>
                <button onClick={() => setSubPickingFor(null)} style={{
                  marginTop: 8, padding: '6px 16px', borderRadius: 6, border: '1px solid var(--border)',
                  background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
                }}>キャンセル</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {(() => {
                  const lineup = [...(currentPlayer1?.players || [])]
                  htSubs.forEach(({ outIdx, inPlayer }) => { lineup[outIdx] = inPlayer })
                  return lineup.map((player, idx) => {
                    const isSubbed = htSubs.some(s => s.outIdx === idx)
                    return (
                      <div key={idx} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '7px 10px', borderRadius: 8,
                        background: isSubbed ? 'rgba(0,212,170,0.08)' : 'var(--bg-secondary)',
                        border: isSubbed ? '1px solid var(--accent)' : '1px solid transparent',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 11, padding: '2px 5px', borderRadius: 4, fontWeight: 700, color: '#fff',
                            background: player?.position === 'GK' ? '#f59e0b' : player?.position === 'DF' ? '#3b82f6' : player?.position === 'MF' ? '#10b981' : '#ef4444',
                          }}>{player?.position}</span>
                          <span style={{ fontSize: 14, fontWeight: isSubbed ? 700 : 400, color: isSubbed ? 'var(--accent)' : 'var(--text-primary)' }}>
                            {player?.skipper_name}
                          </span>
                          {isSubbed && <span style={{ fontSize: 11, color: 'var(--accent)' }}>🔄 交代済</span>}
                        </div>
                        {!isSubbed && htSubs.length < 3 && player1Bench.length > 0 && (
                          <button onClick={() => setSubPickingFor(idx)} style={{
                            padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)',
                            background: 'var(--bg-card)', color: 'var(--text-secondary)',
                            cursor: 'pointer', fontFamily: 'inherit', fontSize: 12,
                          }}>交代</button>
                        )}
                      </div>
                    )
                  })
                })()}
              </div>
            )}
          </div>

          {/* Start second half button */}
          <button className="btn btn-primary" onClick={handleStartSecondHalf} style={{ justifyContent: 'center', fontSize: 17, padding: '14px', marginTop: 4 }}>
            ⚽ 後半キックオフ！
          </button>
        </div>
      )}

      {/* Score board */}
      <div className="card" style={{ textAlign: 'center' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: 12 }}>
          {/* Team 1 */}
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 4 }}>
              {player1?.teamName || 'プレイヤー'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase' }}>YOUR TEAM</div>
          </div>

          {/* Score */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              className={scoreAnimate.player1 ? 'score-animate' : ''}
              style={{ fontSize: 52, fontWeight: 900, color: 'var(--text-primary)', minWidth: 48, textAlign: 'center' }}
            >
              {displayScore.player1}
            </div>
            <div style={{ fontSize: 28, color: 'var(--text-muted)', fontWeight: 300 }}>-</div>
            <div
              className={scoreAnimate.player2 ? 'score-animate' : ''}
              style={{ fontSize: 52, fontWeight: 900, color: 'var(--text-primary)', minWidth: 48, textAlign: 'center' }}
            >
              {displayScore.player2}
            </div>
          </div>

          {/* Team 2 */}
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 4 }}>
              {player2?.teamName || 'CPU'}
            </div>
            <div style={{ fontSize: 10, color: 'var(--danger)', fontWeight: 700, textTransform: 'uppercase' }}>CPU TEAM</div>
          </div>
        </div>

        {/* Timer */}
        <div style={{ marginTop: 12 }}>
          <span style={{
            fontSize: 48,
            fontWeight: 900,
            color: gameMinute >= 90 ? 'var(--success)' : gameMinute >= 75 ? 'var(--warning)' : 'var(--accent)',
          }}>
            {gameMinute}'
          </span>
          {finished && (
            <div style={{ color: 'var(--success)', fontWeight: 700, fontSize: 14, marginTop: 4 }}>
              試合終了！
            </div>
          )}
          {phase === 'first_half' && gameMinute < 45 && (
            <div style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 700, marginTop: 4 }}>前半</div>
          )}
          {phase === 'second_half' && (
            <div style={{ color: 'var(--warning)', fontSize: 12, fontWeight: 700, marginTop: 4 }}>後半</div>
          )}
        </div>
      </div>

      {/* Possession bar */}
      {matchResult && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12, color: 'var(--text-muted)', fontWeight: 700 }}>
            <span>ポゼッション</span>
            <span>{possession}% - {100 - possession}%</span>
          </div>
          <div style={{ height: 12, borderRadius: 6, overflow: 'hidden', background: 'var(--danger)', display: 'flex' }}>
            <div style={{
              width: `${possession}%`,
              background: 'var(--accent)',
              transition: 'width 0.5s ease',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--text-secondary)' }}>
            <span>{player1?.teamName}</span>
            <span>{player2?.teamName}</span>
          </div>
        </div>
      )}

      {/* Event feed */}
      <div className="card" style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ fontSize: 14, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', margin: 0 }}>
            イベントフィード
          </h3>
          <div style={{ display: 'flex', gap: 4 }}>
            {EVENT_FILTERS.map(f => (
              <button
                key={f.key}
                onClick={() => setEventFilter(f.key)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 6,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: 'inherit',
                  background: eventFilter === f.key ? 'var(--accent)' : 'var(--bg-secondary)',
                  color: eventFilter === f.key ? '#fff' : 'var(--text-muted)',
                  transition: 'all 0.15s',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 280, overflowY: 'auto' }}>
          {filteredEvents.length === 0 && (
            <p style={{ color: 'var(--text-muted)', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>
              {visibleEvents.length === 0 ? '試合が始まりました...' : '該当イベントなし'}
            </p>
          )}
          {[...filteredEvents].reverse().map((ev, i) => (
            <MatchEventItem
              key={`${ev.minute}-${ev.type}-${i}`}
              evt={ev}
              myTeam={player1?.teamId}
            />
          ))}
        </div>
      </div>

      {/* Skip button */}
      {!finished && phase !== 'halftime' && (
        <button className="btn btn-secondary" onClick={handleSkip} style={{ justifyContent: 'center' }}>
          ⏩ スキップ
        </button>
      )}
    </div>
    </>
  )
}

export default MatchPage
