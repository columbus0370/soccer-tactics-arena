import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

const TABS = [
  { key: 'summary', label: 'サマリー' },
  { key: 'stats', label: 'チーム統計' },
  { key: 'players', label: '選手パフォーマンス' },
  { key: 'timeline', label: 'タイムライン' },
  { key: 'goals', label: '得点シーン' },
]

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

function randomRating() {
  return (Math.random() * 3 + 6).toFixed(1)
}

function getRatingColor(r) {
  const val = parseFloat(r)
  if (val >= 9.0) return '#00bcd4'
  if (val >= 8.0) return '#2e7d32'
  if (val >= 7.0) return '#66bb6a'
  if (val >= 6.0) return '#ffeb3b'
  if (val >= 5.0) return '#ff9800'
  if (val >= 4.0) return '#f44336'
  return '#7f0000'
}

function ResultPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const matchResult = location.state

  const [activeTab, setActiveTab] = useState('summary')
  const [commentary, setCommentary] = useState(null) // null=loading, ''=unavailable, string=text

  // Fetch AI commentary once after mount
  useEffect(() => {
    if (!matchResult) return
    const API = import.meta.env.VITE_API_URL || ''
    fetch(`${API}/api/game/commentary`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        home: matchResult.player1TeamName || 'あなたのチーム',
        away: matchResult.cpuTeamName || matchResult.player2TeamName || 'CPUチーム',
        score: matchResult.score,
        result: matchResult.result,
        events: matchResult.events || [],
      }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => setCommentary(data?.commentary || ''))
      .catch(() => setCommentary(''))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Stable ratings computed once per match result (avoids re-randomizing on tab switch)
  const playerRatings = useMemo(() => {
    if (!matchResult) return { player1: [], player2: [] }
    const p1 = (matchResult.player1Players || []).map(() =>
      parseFloat((Math.random() * 3 + 6).toFixed(1))
    )
    const p2 = (matchResult.player2Players || []).map(() =>
      parseFloat((Math.random() * 3 + 6).toFixed(1))
    )
    return { player1: p1, player2: p2 }
  }, [matchResult])

  if (!matchResult) {
    return (
      <div className="page" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>リザルトデータがありません</p>
        <button className="btn btn-primary" onClick={() => navigate('/')}>トップへ戻る</button>
      </div>
    )
  }

  const { result, score, stats, events, mvp, points } = matchResult

  const resultLabel =
    result === 'player1_win' ? '勝利！' :
    result === 'player2_win' ? '敗北...' :
    '引き分け'

  const resultColor =
    result === 'player1_win' ? 'var(--success)' :
    result === 'player2_win' ? 'var(--danger)' :
    'var(--warning)'

  const p1Stats = stats?.player1 || {}
  const p2Stats = stats?.player2 || {}
  const allEvents = (events || []).slice().sort((a, b) => a.minute - b.minute)
  const goalEvents = allEvents.filter(e => e.type === 'goal' || e.type === 'pk_goal')

  // Card events for summary
  const yellowCards = allEvents.filter(e => e.type === 'yellow_card')
  const redCards = allEvents.filter(e => e.type === 'red_card')

  return (
    <div className="page" style={{ width: '100%', boxSizing: 'border-box', paddingLeft: 8, paddingRight: 8 }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <div style={{ fontSize: 36, fontWeight: 900, color: resultColor, marginBottom: 4 }}>
          {resultLabel}
        </div>
        <div style={{
          fontSize: 64,
          fontWeight: 900,
          color: 'var(--text-primary)',
          letterSpacing: '-2px',
          lineHeight: 1,
          marginBottom: 8,
        }}>
          {score?.player1 ?? 0} - {score?.player2 ?? 0}
        </div>
        {points && (
          <div style={{ color: 'var(--warning)', fontWeight: 700, fontSize: 14 }}>
            +{result === 'player1_win' ? points.player1 : result === 'draw' ? points.player1 : 0} pts
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="hide-scrollbar" style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 0, overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 14px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid var(--accent)' : '2px solid transparent',
              color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-secondary)',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: activeTab === tab.key ? 700 : 500,
              fontFamily: 'inherit',
              transition: 'all 0.2s',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Summary Tab */}
      {activeTab === 'summary' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Result banner */}
          <div className="card" style={{ textAlign: 'center', background: result === 'player1_win' ? 'rgba(46,213,115,0.08)' : result === 'player2_win' ? 'rgba(255,71,87,0.08)' : 'rgba(255,165,2,0.08)', border: `1px solid ${resultColor}33` }}>
            <div style={{ fontSize: 24, marginBottom: 4 }}>
              {result === 'player1_win' ? '🏆' : result === 'player2_win' ? '😢' : '🤝'}
            </div>
            <div style={{ color: resultColor, fontWeight: 700, fontSize: 18 }}>{resultLabel}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
              最終スコア: {score?.player1 ?? 0} - {score?.player2 ?? 0}
            </div>
            {/* Card info */}
            {(yellowCards.length > 0 || redCards.length > 0) && (
              <div style={{ marginTop: 12, textAlign: 'left' }}>
                {yellowCards.map((e, i) => (
                  <span key={i} style={{ marginRight: 8, fontSize: 13 }}>🟨 {e.player} ({e.teamName} {e.minute}')</span>
                ))}
                {redCards.map((e, i) => (
                  <span key={i} style={{ marginRight: 8, fontSize: 13 }}>🟥 {e.player} ({e.teamName} {e.minute}')</span>
                ))}
              </div>
            )}
          </div>

          {/* AI Commentary */}
          {commentary !== '' && (
            <div className="card" style={{ background: 'rgba(0,212,170,0.06)', border: '1px solid rgba(0,212,170,0.2)', padding: '14px 16px' }}>
              <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>🎙 AI実況解説</div>
              {commentary === null ? (
                <div style={{ color: 'var(--text-muted)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="spinner" style={{ width: 12, height: 12, borderWidth: 2 }} />
                  解説を生成中...
                </div>
              ) : (
                <p style={{ color: 'var(--text-primary)', fontSize: 14, lineHeight: 1.7, margin: 0 }}>{commentary}</p>
              )}
            </div>
          )}

          {/* MVP */}
          {mvp && (
            <div className="card">
              <h3 style={{ color: 'var(--warning)', marginBottom: 12, fontSize: 14, fontWeight: 700, textTransform: 'uppercase' }}>
                ⭐ MVP
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--warning), #f97316)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24,
                }}>
                  ⭐
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>{mvp.skipper_name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                    {mvp.position} · {mvp.goals ?? 0}ゴール · 評点 {mvp.rating ?? randomRating()}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Points */}
          {points && (
            <div className="card">
              <h3 style={{ color: 'var(--accent)', marginBottom: 12, fontSize: 14, fontWeight: 700, textTransform: 'uppercase' }}>
                獲得ポイント
              </h3>
              <div style={{ display: 'flex', justifyContent: 'space-around' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--accent)' }}>{points.player1}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>あなた</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--danger)' }}>{points.player2}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>CPU</div>
                </div>
              </div>
            </div>
          )}

          {/* Comment */}
          <div className="card" style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, fontStyle: 'italic' }}>
            {result === 'player1_win'
              ? '素晴らしい戦術眼で完璧な試合を見せた！チームの連携も抜群だった。'
              : result === 'player2_win'
              ? '惜しい試合だった。次回はより良い戦術を準備して挑もう。'
              : '両チームが互いに譲らない激闘だった。再戦を楽しみにしよう。'}
          </div>
        </div>
      )}

      {/* Stats Tab */}
      {activeTab === 'stats' && (
        <div className="card">
          <h3 style={{ marginBottom: 16, color: 'var(--accent)', fontSize: 16, fontWeight: 700 }}>チーム統計比較</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ color: 'var(--accent)', textAlign: 'left', padding: '8px 0', fontSize: 13 }}>あなた</th>
                <th style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0', fontSize: 13 }}>スタッツ</th>
                <th style={{ color: 'var(--danger)', textAlign: 'right', padding: '8px 0', fontSize: 13 }}>CPU</th>
              </tr>
            </thead>
            <tbody>
              {[
                { label: 'シュート', k: 'shots' },
                { label: '枠内シュート', k: 'shots_on_target' },
                { label: 'ポゼッション (%)', k: 'possession' },
                { label: 'パス精度 (%)', k: 'pass_accuracy' },
                { label: 'タックル', k: 'tackles' },
              ].map(({ label, k }) => {
                const v1 = p1Stats[k] ?? 0
                const v2 = p2Stats[k] ?? 0
                const max = Math.max(v1, v2, 1)
                return (
                  <tr key={k} style={{ borderTop: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 0', textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', minWidth: 28 }}>{v1}</span>
                        <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, maxWidth: 80, overflow: 'hidden' }}>
                          <div style={{ width: `${(v1 / max) * 100}%`, height: '100%', background: 'var(--accent)', borderRadius: 3 }} />
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: '12px 8px' }}>{label}</td>
                    <td style={{ padding: '12px 0', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                        <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, maxWidth: 80, overflow: 'hidden' }}>
                          <div style={{ width: `${(v2 / max) * 100}%`, height: '100%', background: 'var(--danger)', borderRadius: 3, marginLeft: 'auto' }} />
                        </div>
                        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', minWidth: 28, textAlign: 'right' }}>{v2}</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Players Tab */}
      {activeTab === 'players' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <h3 style={{ color: 'var(--accent)', marginBottom: 12, fontSize: 14 }}>あなたのチーム</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(matchResult.player1Players || []).map((player, i) => {
                const rating = playerRatings.player1[i] ?? parseFloat((Math.random() * 3 + 6).toFixed(1))
                return (
                  <div key={player.id || i} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px',
                    background: 'var(--bg-card)',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    fontSize: 12,
                  }}>
                    <span style={{
                      fontWeight: 900, fontSize: 14,
                      color: getRatingColor(rating),
                      minWidth: 32,
                    }}>{rating}</span>
                    <span style={{
                      background: player.position === 'GK' ? '#f59e0b' : player.position === 'DF' ? '#3b82f6' : player.position === 'MF' ? '#10b981' : '#ef4444',
                      color: '#fff', padding: '1px 5px', borderRadius: 3, fontSize: 10, fontWeight: 700,
                    }}>{player.position}</span>
                    <span style={{ color: 'var(--text-primary)' }}>{player.skipper_name}</span>
                  </div>
                )
              })}
            </div>
          </div>
          <div>
            <h3 style={{ color: 'var(--danger)', marginBottom: 12, fontSize: 14 }}>CPUチーム</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(matchResult.player2Players || []).map((player, i) => {
                const rating = playerRatings.player2[i] ?? parseFloat((Math.random() * 3 + 6).toFixed(1))
                return (
                  <div key={player.id || i} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px',
                    background: 'var(--bg-card)',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    fontSize: 12,
                  }}>
                    <span style={{
                      fontWeight: 900, fontSize: 14,
                      color: getRatingColor(rating),
                      minWidth: 32,
                    }}>{rating}</span>
                    <span style={{
                      background: player.position === 'GK' ? '#f59e0b' : player.position === 'DF' ? '#3b82f6' : player.position === 'MF' ? '#10b981' : '#ef4444',
                      color: '#fff', padding: '1px 5px', borderRadius: 3, fontSize: 10, fontWeight: 700,
                    }}>{player.position}</span>
                    <span style={{ color: 'var(--text-primary)' }}>{player.skipper_name}</span>
                  </div>
                )
              })}
              {!(matchResult.player2Players || []).length && (
                <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>データなし</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Timeline Tab */}
      {activeTab === 'timeline' && (
        <div className="card">
          <h3 style={{ marginBottom: 20, color: 'var(--text-primary)', fontSize: 16 }}>タイムライン</h3>

          {/* Horizontal timeline bar (goals/pk_goals only) */}
          <div style={{ position: 'relative', margin: '0 20px 32px' }}>
            <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, position: 'relative' }}>
              <div style={{
                position: 'absolute', left: '50%', top: -10,
                width: 2, height: 24, background: 'var(--text-muted)',
                transform: 'translateX(-50%)',
              }} />
              <div style={{ position: 'absolute', left: '50%', top: 14, transform: 'translateX(-50%)', fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>HT</div>
              {goalEvents.map((ev, i) => {
                const pct = Math.min((ev.minute / 90) * 100, 100)
                const isP1 = ev.teamName && matchResult.player1TeamName ? ev.teamName === matchResult.player1TeamName : true
                return (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      left: `${pct}%`,
                      top: '50%',
                      transform: 'translate(-50%, -50%)',
                    }}
                    title={`${ev.minute}' ${ev.scorer}`}
                  >
                    <div style={{
                      width: 16, height: 16, borderRadius: '50%',
                      background: isP1 ? 'var(--accent)' : 'var(--danger)',
                      border: '2px solid var(--bg-card)',
                      cursor: 'default',
                    }} />
                    <div style={{
                      position: 'absolute',
                      top: -22, left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: 10,
                      color: isP1 ? 'var(--accent)' : 'var(--danger)',
                      whiteSpace: 'nowrap',
                      fontWeight: 700,
                    }}>
                      {ev.minute}'
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Vertical event list */}
          <div style={{ position: 'relative', paddingLeft: 40 }}>
            {/* 縦ライン */}
            <div style={{
              position: 'absolute', left: 14, top: 8, bottom: 8,
              width: 2, background: 'var(--border)',
            }} />

            {allEvents.map((evt, i) => {
              const cfg = EVENT_CONFIG[evt.type] || { icon: '📋', color: '#8899bb', label: evt.type }
              return (
                <div key={i} style={{
                  position: 'relative',
                  marginBottom: 16,
                  paddingLeft: 8,
                }}>
                  {/* ドット */}
                  <div style={{
                    position: 'absolute', left: -26, top: 4,
                    width: 12, height: 12, borderRadius: '50%',
                    background: cfg.color,
                    boxShadow: `0 0 8px ${cfg.color}88`,
                  }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color }}>{evt.minute}'</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{evt.teamName}</span>
                    <span style={{ fontSize: 12 }}>{cfg.icon}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: cfg.color }}>{cfg.label}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>
                    {getEventMainText(evt)}
                  </div>
                  {evt.description && (
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2, lineHeight: 1.5 }}>
                      {evt.description}
                    </div>
                  )}
                </div>
              )
            })}
            {allEvents.length === 0 && (
              <div style={{ color: 'var(--text-muted)', padding: 20 }}>イベントなし</div>
            )}
          </div>
        </div>
      )}

      {/* Goals tab */}
      {activeTab === 'goals' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h3 style={{ color: 'var(--text-primary)', fontSize: 16 }}>得点シーン一覧</h3>
          {goalEvents.length === 0 && (
            <div className="card" style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
              この試合のゴールはありませんでした
            </div>
          )}
          {goalEvents.map((ev, i) => {
            const cfg = EVENT_CONFIG[ev.type] || EVENT_CONFIG['goal']
            return (
              <div key={i} className="card" style={{ borderLeft: `4px solid ${cfg.color}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 24 }}>{cfg.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{ev.minute}' - {ev.scorer}</div>
                    <div style={{ color: cfg.color, fontSize: 12, fontWeight: 700 }}>{cfg.label} · {ev.teamName}</div>
                  </div>
                </div>
                {ev.assist && (
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>
                    🤝 アシスト: {ev.assist}
                  </div>
                )}
                {ev.description && (
                  <div style={{
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    background: 'var(--bg-secondary)',
                    borderRadius: 6,
                    padding: '8px 12px',
                    lineHeight: 1.5,
                    fontStyle: 'italic',
                  }}>
                    {ev.description}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Footer buttons */}
      <div style={{ display: 'flex', gap: 12, marginTop: 24, justifyContent: 'center' }}>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          🔄 もう一度プレイ
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/team-select')}>
          👥 チーム変更
        </button>
      </div>
    </div>
  )
}

export default ResultPage
