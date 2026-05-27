import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import PitchView from '../components/PitchView'
import PlayerCard from '../components/PlayerCard'
import { getTeams, getTeamPlayers, getCPUTeam, getAllPlayers } from '../api/gameApi'

const FORMATIONS = ['4-3-3', '4-2-4', '5-3-2', '3-5-2', '4-4-2']

const TACTICS = [
  { key: 'passing', label: 'パス主導型', desc: 'パス精度UP、ポゼッションUP', icon: '🎯' },
  { key: 'longball', label: 'ロングボール型', desc: 'カウンター速攻、スピードUP', icon: '🚀' },
  { key: 'wing', label: 'サイド攻撃型', desc: 'クロス精度UP、サイドから崩す', icon: '↔️' },
]

const FORMATION_SLOTS = {
  '4-3-3': ['GK', 'DF', 'DF', 'DF', 'DF', 'MF', 'MF', 'MF', 'FW', 'FW', 'FW'],
  '4-2-4': ['GK', 'DF', 'DF', 'DF', 'DF', 'MF', 'MF', 'FW', 'FW', 'FW', 'FW'],
  '5-3-2': ['GK', 'DF', 'DF', 'DF', 'DF', 'DF', 'MF', 'MF', 'MF', 'FW', 'FW'],
  '3-5-2': ['GK', 'DF', 'DF', 'DF', 'MF', 'MF', 'MF', 'MF', 'MF', 'FW', 'FW'],
  '4-4-2': ['GK', 'DF', 'DF', 'DF', 'DF', 'MF', 'MF', 'MF', 'MF', 'FW', 'FW'],
}

const ORIGINAL_TEAM = {
  team_id: 'original',
  team_name: '⭐ ORIGINAL',
  sub: '全チームから選手を選択',
  primary_color: '#f0c040',
  isOriginal: true,
}

function assignDefaultPlayers(formation, allPlayers) {
  const slots = FORMATION_SLOTS[formation] || FORMATION_SLOTS['4-3-3']
  const grouped = { GK: [], DF: [], MF: [], FW: [] }
  allPlayers.forEach(p => {
    if (grouped[p.position]) grouped[p.position].push(p)
  })
  const used = new Set()
  return slots.map(pos => {
    const candidates = grouped[pos] || []
    const player = candidates.find(p => !used.has(p.id))
    if (player) { used.add(player.id); return player }
    // fallback: any unused player
    const fallback = allPlayers.find(p => !used.has(p.id))
    if (fallback) { used.add(fallback.id); return fallback }
    return null
  })
}

const styles = {
  filterTabs: { display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' },
  filterTab: {
    padding: '6px 12px', borderRadius: 20, border: '1px solid var(--border)',
    background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer',
    fontSize: 12, fontFamily: 'inherit',
  },
  filterTabActive: {
    background: 'var(--accent)', color: '#050810',
    borderColor: 'var(--accent)', fontWeight: 700,
  },
  teamSelect: {
    width: '100%', padding: '8px 12px', background: 'var(--bg-card)',
    border: '1px solid var(--border)', borderRadius: 8,
    color: 'var(--text-primary)', fontSize: 13, fontFamily: 'inherit', marginBottom: 10,
  },
  playerListScroll: {
    maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4,
  },
  playerListItem: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
    borderRadius: 8, cursor: 'pointer', border: '1px solid var(--border)',
    background: 'var(--bg-card)', transition: 'background 0.15s',
  },
  playerName: { flex: 1, fontSize: 13, fontWeight: 500 },
  teamTag: {
    fontSize: 11, color: 'var(--text-muted)', maxWidth: 100,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  },
  overallScore: { fontSize: 13, fontWeight: 700, color: 'var(--accent)' },
}

function posTag(position) {
  const colors = {
    GK: '#f59e0b', DF: '#3b82f6', MF: '#10b981', FW: '#ef4444',
  }
  return {
    background: colors[position] || '#888',
    color: '#fff',
    padding: '1px 5px',
    borderRadius: 3,
    fontSize: 10,
    fontWeight: 700,
    flexShrink: 0,
  }
}

function TeamSelectPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const difficulty = location.state?.difficulty || 'normal'

  const [step, setStep] = useState(1)
  const [teams, setTeams] = useState([])
  const [teamsLoading, setTeamsLoading] = useState(true)
  const [teamsError, setTeamsError] = useState(null)

  const [selectedTeam, setSelectedTeam] = useState(null)
  const [formation, setFormation] = useState('4-3-3')
  const [tactic, setTactic] = useState('passing')

  const [allPlayers, setAllPlayers] = useState([])
  const [allPlayersPool, setAllPlayersPool] = useState([])
  const [lineup, setLineup] = useState([])
  const [playersLoading, setPlayersLoading] = useState(false)

  const [changingSlot, setChangingSlot] = useState(null)
  const [posFilter, setPosFilter] = useState('ALL')
  const [teamFilter, setTeamFilter] = useState('ALL')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setTeamsLoading(true)
    getTeams()
      .then(data => setTeams(data.teams || []))
      .catch(e => setTeamsError(e.message))
      .finally(() => setTeamsLoading(false))
  }, [])

  // Load players when entering step 3
  useEffect(() => {
    if (step === 3 && selectedTeam) {
      setPlayersLoading(true)
      if (selectedTeam.isOriginal) {
        getAllPlayers()
          .then(data => {
            const players = data.players || []
            setAllPlayersPool(players)
            setAllPlayers(players)
            setLineup(assignDefaultPlayers(formation, players))
          })
          .catch(() => {})
          .finally(() => setPlayersLoading(false))
      } else {
        getTeamPlayers(selectedTeam.team_id)
          .then(data => {
            const players = data.players || []
            setAllPlayersPool(players)
            setAllPlayers(players)
            setLineup(assignDefaultPlayers(formation, players))
          })
          .catch(() => {})
          .finally(() => setPlayersLoading(false))
      }
    }
  }, [step, selectedTeam])

  // Re-assign when formation changes in step 3
  useEffect(() => {
    if (allPlayersPool.length > 0) {
      setLineup(assignDefaultPlayers(formation, allPlayersPool))
      setChangingSlot(null)
    }
  }, [formation])

  const handleSelectPlayerForSlot = (player) => {
    if (changingSlot === null) return
    const existingSlot = lineup.findIndex(p => p && p.id === player.id)
    const newLineup = [...lineup]
    if (existingSlot !== -1) {
      newLineup[existingSlot] = newLineup[changingSlot]
    }
    newLineup[changingSlot] = player
    setLineup(newLineup)
    setChangingSlot(null)
    setPosFilter('ALL')
    setTeamFilter('ALL')
  }

  const handleConfirm = async () => {
    setSubmitting(true)
    try {
      const cpuTeam = await getCPUTeam(difficulty)
      const tacticLabel = TACTICS.find(t => t.key === tactic)?.label || tactic
      const player1 = {
        teamName: selectedTeam.isOriginal ? 'My Original Team' : selectedTeam.team_name,
        teamId: selectedTeam.isOriginal ? 'original' : selectedTeam.team_id,
        formation,
        tactic: tacticLabel,
        players: lineup.filter(Boolean),
      }
      navigate('/match', { state: { player1, player2: cpuTeam, difficulty } })
    } catch (e) {
      alert('CPUチームの取得に失敗しました: ' + e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const canNextStep1 = !!selectedTeam
  const canNextStep2 = !!formation && !!tactic
  const canNextStep3 = lineup.filter(Boolean).length === 11

  // Filtered players for the swap modal
  const filteredPlayers = allPlayersPool.filter(p => {
    const posOk = posFilter === 'ALL' || p.position === posFilter
    const teamOk = teamFilter === 'ALL' || p.team_id === teamFilter
    const notUsed = !lineup.some(l => l && l.id === p.id)
    return posOk && teamOk && notUsed
  })

  // Unique teams from pool for the team filter dropdown
  const teamsForFilter = allPlayersPool.reduce((acc, p) => {
    if (!acc.some(t => t.team_id === p.team_id)) {
      acc.push({ team_id: p.team_id, team_name: p.team_name })
    }
    return acc
  }, [])

  return (
    <div className="page" style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28, alignItems: 'center' }}>
        {[1, 2, 3, 4].map(s => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32, height: 32,
              borderRadius: '50%',
              background: step === s ? 'var(--accent)' : step > s ? 'var(--success)' : 'var(--bg-card)',
              border: step === s ? 'none' : '1px solid var(--border)',
              color: step === s ? '#0a0e1a' : step > s ? '#0a0e1a' : 'var(--text-muted)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: 13,
              cursor: step > s ? 'pointer' : 'default',
              transition: 'all 0.2s',
            }}
              onClick={() => step > s && setStep(s)}
            >
              {step > s ? '✓' : s}
            </div>
            {s < 4 && <div style={{ width: 32, height: 2, background: step > s ? 'var(--success)' : 'var(--border)', borderRadius: 1 }} />}
          </div>
        ))}
        <div style={{ marginLeft: 8, color: 'var(--text-secondary)', fontSize: 14 }}>
          {['', 'チーム選択', 'フォーメーション', 'ラインナップ', '確認'][step]}
        </div>
      </div>

      {/* Step 1: Team selection */}
      {step === 1 && (
        <div>
          <h2 style={{ marginBottom: 16, fontSize: 20, color: 'var(--text-primary)' }}>チームを選択</h2>
          {teamsLoading && <div className="spinner" />}
          {teamsError && <p style={{ color: 'var(--danger)' }}>エラー: {teamsError}</p>}
          {!teamsLoading && !teamsError && (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: 12,
                marginBottom: 24,
              }}>
                {/* ORIGINAL special card */}
                <div
                  key={ORIGINAL_TEAM.team_id}
                  onClick={() => setSelectedTeam(ORIGINAL_TEAM)}
                  className="card"
                  style={{
                    cursor: 'pointer',
                    padding: '14px 16px',
                    transition: 'all 0.2s',
                    border: '2px solid transparent',
                    background: selectedTeam?.team_id === 'original'
                      ? 'linear-gradient(rgba(240,192,64,0.15),rgba(240,192,64,0.15)) padding-box, linear-gradient(135deg, #ffd700, #ff6b6b, #4f8cff, #00d4aa) border-box'
                      : 'linear-gradient(var(--bg-card),var(--bg-card)) padding-box, linear-gradient(135deg, #ffd700, #ff6b6b, #4f8cff, #00d4aa) border-box',
                  }}
                  onMouseEnter={e => {
                    if (selectedTeam?.team_id !== 'original')
                      e.currentTarget.style.background = 'linear-gradient(var(--bg-card-hover),var(--bg-card-hover)) padding-box, linear-gradient(135deg, #ffd700, #ff6b6b, #4f8cff, #00d4aa) border-box'
                  }}
                  onMouseLeave={e => {
                    if (selectedTeam?.team_id !== 'original')
                      e.currentTarget.style.background = 'linear-gradient(var(--bg-card),var(--bg-card)) padding-box, linear-gradient(135deg, #ffd700, #ff6b6b, #4f8cff, #00d4aa) border-box'
                  }}
                >
                  <div style={{
                    height: 4,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #ffd700, #ff6b6b, #4f8cff, #00d4aa)',
                    marginBottom: 10,
                  }} />
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                    {ORIGINAL_TEAM.team_name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    {ORIGINAL_TEAM.sub}
                  </div>
                </div>

                {teams.map(team => (
                  <div
                    key={team.team_id}
                    onClick={() => setSelectedTeam(team)}
                    className="card"
                    style={{
                      cursor: 'pointer',
                      border: selectedTeam?.team_id === team.team_id
                        ? '2px solid var(--accent)'
                        : '1px solid var(--border)',
                      background: selectedTeam?.team_id === team.team_id ? 'rgba(0,212,170,0.08)' : 'var(--bg-card)',
                      padding: '14px 16px',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => {
                      if (selectedTeam?.team_id !== team.team_id)
                        e.currentTarget.style.background = 'var(--bg-card-hover)'
                    }}
                    onMouseLeave={e => {
                      if (selectedTeam?.team_id !== team.team_id)
                        e.currentTarget.style.background = 'var(--bg-card)'
                    }}
                  >
                    <div style={{
                      height: 4,
                      borderRadius: 2,
                      background: team.primary_color || 'var(--accent)',
                      marginBottom: 10,
                    }} />
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                      {team.team_name}
                    </div>
                    {team.pl_finish && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                        順位: {team.pl_finish}位
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  className="btn btn-primary"
                  disabled={!canNextStep1}
                  onClick={() => setStep(2)}
                >
                  次へ →
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Step 2: Formation & Tactic */}
      {step === 2 && (
        <div>
          <h2 style={{ marginBottom: 20, fontSize: 20 }}>フォーメーション & 戦術</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Pitch preview */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <PitchView formation={formation} players={[]} />
            </div>

            {/* Selection panels */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Formation buttons */}
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                  フォーメーション
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {FORMATIONS.map(f => (
                    <button
                      key={f}
                      onClick={() => setFormation(f)}
                      className="btn"
                      style={{
                        background: formation === f ? 'var(--accent)' : 'var(--bg-secondary)',
                        color: formation === f ? '#0a0e1a' : 'var(--text-secondary)',
                        border: formation === f ? 'none' : '1px solid var(--border)',
                        padding: '8px 16px',
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tactic buttons */}
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                  戦術スタイル
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {TACTICS.map(t => (
                    <button
                      key={t.key}
                      onClick={() => setTactic(t.key)}
                      style={{
                        background: tactic === t.key ? 'rgba(0,212,170,0.1)' : 'var(--bg-secondary)',
                        color: tactic === t.key ? 'var(--accent)' : 'var(--text-primary)',
                        border: tactic === t.key ? '2px solid var(--accent)' : '1px solid var(--border)',
                        borderRadius: 8,
                        padding: '12px 16px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: 'inherit',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>
                        {t.icon} {t.label}
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.7 }}>{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
            <button className="btn btn-secondary" onClick={() => setStep(1)}>← 戻る</button>
            <button className="btn btn-primary" disabled={!canNextStep2} onClick={() => setStep(3)}>次へ →</button>
          </div>
        </div>
      )}

      {/* Step 3: Lineup */}
      {step === 3 && (
        <div>
          <h2 style={{ marginBottom: 20, fontSize: 20 }}>スターティングラインナップ</h2>
          {playersLoading && <div className="spinner" />}
          {!playersLoading && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* Pitch */}
              <div>
                <PitchView
                  formation={formation}
                  players={lineup}
                  onPlayerClick={(player, slotIndex) => {
                    setChangingSlot(slotIndex)
                    setPosFilter('ALL')
                    setTeamFilter('ALL')
                  }}
                  selectedPlayerId={changingSlot !== null && lineup[changingSlot] ? lineup[changingSlot].id : null}
                />
                {changingSlot !== null && (
                  <p style={{ color: 'var(--accent)', fontSize: 12, marginTop: 8, textAlign: 'center' }}>
                    右のリストから選手を選んでください
                  </p>
                )}
              </div>

              {/* Player selection panel */}
              <div>
                <p style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700, marginBottom: 10, textTransform: 'uppercase' }}>
                  {changingSlot !== null
                    ? `スロット ${changingSlot + 1} (${FORMATION_SLOTS[formation]?.[changingSlot]}) の選手を選択`
                    : '選手一覧（クリックして交代）'}
                </p>

                {changingSlot !== null ? (
                  <>
                    {/* Position filter tabs */}
                    <div style={styles.filterTabs}>
                      {['ALL', 'GK', 'DF', 'MF', 'FW'].map(pos => (
                        <button
                          key={pos}
                          style={{
                            ...styles.filterTab,
                            ...(posFilter === pos ? styles.filterTabActive : {}),
                          }}
                          onClick={() => setPosFilter(pos)}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>

                    {/* Team filter (Original only) */}
                    {selectedTeam?.isOriginal && (
                      <select
                        value={teamFilter}
                        onChange={e => setTeamFilter(e.target.value)}
                        style={styles.teamSelect}
                      >
                        <option value="ALL">すべてのチーム</option>
                        {teamsForFilter.map(t => (
                          <option key={t.team_id} value={t.team_id}>{t.team_name}</option>
                        ))}
                      </select>
                    )}

                    {/* Filtered player list */}
                    <div style={styles.playerListScroll}>
                      {filteredPlayers.map(p => {
                        const overall = Math.round(
                          Object.values(p.stats || {}).reduce((s, v) => s + v, 0) /
                          Math.max(Object.keys(p.stats || {}).length, 1)
                        )
                        return (
                          <div
                            key={p.id}
                            style={styles.playerListItem}
                            onClick={() => handleSelectPlayerForSlot(p)}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card-hover)' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)' }}
                          >
                            <span style={posTag(p.position)}>{p.position}</span>
                            <span style={styles.playerName}>{p.skipper_name}</span>
                            {selectedTeam?.isOriginal && (
                              <span style={styles.teamTag}>{p.team_name}</span>
                            )}
                            <span style={styles.overallScore}>{overall}</span>
                          </div>
                        )
                      })}
                      {filteredPlayers.length === 0 && (
                        <div style={{ padding: 20, color: 'var(--text-muted)', textAlign: 'center' }}>
                          該当する選手がいません
                        </div>
                      )}
                    </div>

                    <button
                      className="btn btn-secondary"
                      style={{ marginTop: 10, fontSize: 12, padding: '6px 12px' }}
                      onClick={() => setChangingSlot(null)}
                    >
                      キャンセル
                    </button>
                  </>
                ) : (
                  /* Default view: show all players with PlayerCard */
                  <div style={{ maxHeight: 440, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {allPlayers.map(player => {
                      const inLineup = lineup.findIndex(p => p && p.id === player.id)
                      return (
                        <PlayerCard
                          key={player.id}
                          player={player}
                          isSelected={inLineup !== -1}
                          onClick={() => {
                            const slotIdx = lineup.findIndex(p => p && p.id === player.id)
                            if (slotIdx !== -1) {
                              setChangingSlot(slotIdx)
                              setPosFilter('ALL')
                              setTeamFilter('ALL')
                            }
                          }}
                        />
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
            <button className="btn btn-secondary" onClick={() => setStep(2)}>← 戻る</button>
            <button className="btn btn-primary" disabled={!canNextStep3} onClick={() => setStep(4)}>次へ →</button>
          </div>
        </div>
      )}

      {/* Step 4: Confirmation */}
      {step === 4 && (
        <div>
          <h2 style={{ marginBottom: 20, fontSize: 20 }}>確認 & 試合開始</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            <div className="card">
              <h3 style={{ marginBottom: 12, color: 'var(--accent)', fontSize: 16 }}>チーム情報</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>チーム</span>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>
                    {selectedTeam?.isOriginal ? 'My Original Team' : selectedTeam?.team_name}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>フォーメーション</span>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{formation}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>戦術</span>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>{TACTICS.find(t => t.key === tactic)?.label}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>難易度</span>
                  <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--warning)' }}>{difficulty.toUpperCase()}</span>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: 12, color: 'var(--accent)', fontSize: 16 }}>先発メンバー</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 220, overflowY: 'auto' }}>
                {lineup.filter(Boolean).map((player, i) => (
                  <div key={player.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <span style={{ color: 'var(--text-muted)', width: 20 }}>{i + 1}</span>
                    <span style={posTag(player.position)}>{player.position}</span>
                    <span style={{ color: 'var(--text-primary)' }}>{player.skipper_name}</span>
                    {selectedTeam?.isOriginal && (
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>{player.team_name}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-secondary" onClick={() => setStep(3)}>← 戻る</button>
            <button
              className="btn btn-primary"
              disabled={submitting}
              onClick={handleConfirm}
              style={{ fontSize: 16, padding: '14px 32px' }}
            >
              {submitting ? '準備中...' : '⚽ 試合開始！'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default TeamSelectPage
