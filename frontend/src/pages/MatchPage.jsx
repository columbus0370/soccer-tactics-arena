import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { simulateMatch } from '../api/gameApi'

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

function MatchPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { player1, player2 } = location.state || {}

  const [matchResult, setMatchResult] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [gameMinute, setGameMinute] = useState(0)
  const [displayScore, setDisplayScore] = useState({ player1: 0, player2: 0 })
  const [visibleEvents, setVisibleEvents] = useState([])
  const [scoreAnimate, setScoreAnimate] = useState({ player1: false, player2: false })
  const [interventionsLeft, setInterventionsLeft] = useState(2)
  const [finished, setFinished] = useState(false)
  const [eventFilter, setEventFilter] = useState('all')

  const timerRef = useRef(null)
  const minuteRef = useRef(0)
  const eventsRef = useRef([])
  const resultRef = useRef(null)

  useEffect(() => {
    if (!player1 || !player2) {
      navigate('/')
      return
    }
    simulateMatch(player1, player2)
      .then(result => {
        setMatchResult(result)
        resultRef.current = result
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const eventIndexRef = useRef(0)

  useEffect(() => {
    if (!matchResult) return
    eventsRef.current = matchResult.events || []
    eventIndexRef.current = 0

    // Show one event per tick so each log is readable (~1.5s per event).
    // Game minute advances to match the current event's minute; after the last
    // event it runs to 90 to signal the end of the match.
    const INTERVAL_MS = 1500
    const allEvents = eventsRef.current

    timerRef.current = setInterval(() => {
      const idx = eventIndexRef.current

      if (idx < allEvents.length) {
        // Reveal the next event and jump the minute clock to that event's minute
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
        // All events shown — run the clock to 90 and finish
        minuteRef.current = 90
        setGameMinute(90)
        clearInterval(timerRef.current)
        setFinished(true)
        setTimeout(() => {
          const enriched = {
            ...resultRef.current,
            player1TeamId: player1?.teamId,
            player1TeamName: player1?.teamName,
            cpuTeamName: player2?.teamName,
            player1Players: player1?.players || [],
            player2Players: player2?.players || [],
          }
          navigate('/result', { state: enriched })
        }, 2000)
      }
    }, INTERVAL_MS)

    return () => clearInterval(timerRef.current)
  }, [matchResult])

  const handleSkip = () => {
    clearInterval(timerRef.current)
    minuteRef.current = 90
    setGameMinute(90)
    if (matchResult) {
      const allEvents = matchResult.events || []
      setVisibleEvents(allEvents)
      const s = { player1: 0, player2: 0 }
      allEvents.forEach(ev => {
        if (ev.type === 'goal' || ev.type === 'pk_goal') {
          const side = ev.team === player1?.teamId || ev.teamName === player1?.teamName ? 'player1' : 'player2'
          s[side]++
        }
      })
      setDisplayScore(s)
    }
    setFinished(true)
    setTimeout(() => {
      const base = resultRef.current || matchResult
      const enriched = {
        ...base,
        player1TeamId: player1?.teamId,
        player1TeamName: player1?.teamName,
        cpuTeamName: player2?.teamName,
        player1Players: player1?.players || [],
        player2Players: player2?.players || [],
      }
      navigate('/result', { state: enriched })
    }, 1500)
  }

  const handleIntervention = (type) => {
    if (interventionsLeft <= 0) return
    setInterventionsLeft(prev => prev - 1)
    if (type === 'attack') {
      setScoreAnimate({ player1: true, player2: false })
      setTimeout(() => setScoreAnimate({ player1: false, player2: false }), 400)
    } else {
      setScoreAnimate({ player1: false, player2: true })
      setTimeout(() => setScoreAnimate({ player1: false, player2: false }), 400)
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
        <p style={{ color: 'var(--text-secondary)' }}>試合をシミュレート中...</p>
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

  return (
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

      {/* Interventions */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 700 }}>介入ボタン</span>
          <span style={{ fontSize: 12, color: 'var(--warning)' }}>残り {interventionsLeft} 回</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn btn-primary"
            disabled={interventionsLeft <= 0 || finished}
            onClick={() => handleIntervention('attack')}
            style={{ flex: 1, justifyContent: 'center', background: 'var(--accent-secondary)' }}
          >
            ⚔ 攻撃強化
          </button>
          <button
            className="btn"
            disabled={interventionsLeft <= 0 || finished}
            onClick={() => handleIntervention('defense')}
            style={{
              flex: 1, justifyContent: 'center',
              background: interventionsLeft > 0 && !finished ? 'var(--bg-secondary)' : 'var(--bg-card)',
              color: 'var(--text-primary)', border: '1px solid var(--border)',
            }}
          >
            🛡 守備固め
          </button>
        </div>
      </div>

      {/* Skip button */}
      {!finished && (
        <button className="btn btn-secondary" onClick={handleSkip} style={{ justifyContent: 'center' }}>
          ⏩ スキップ
        </button>
      )}
    </div>
  )
}

export default MatchPage
