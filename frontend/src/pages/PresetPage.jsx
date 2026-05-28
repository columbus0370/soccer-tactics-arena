import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PitchView from '../components/PitchView'
import { getTeams, getTeamPlayers, getAllPlayers } from '../api/gameApi'
import { savePreset, loadPreset, deletePreset, hasPreset, resolveLineup } from '../utils/presets'

const FORMATIONS = ['4-3-3', '4-2-4', '5-3-2', '3-5-2', '4-4-2']
const FORMATION_SLOTS = {
  '4-3-3': ['GK','DF','DF','DF','DF','MF','MF','MF','FW','FW','FW'],
  '4-2-4': ['GK','DF','DF','DF','DF','MF','MF','FW','FW','FW','FW'],
  '5-3-2': ['GK','DF','DF','DF','DF','DF','MF','MF','MF','FW','FW'],
  '3-5-2': ['GK','DF','DF','DF','MF','MF','MF','MF','MF','FW','FW'],
  '4-4-2': ['GK','DF','DF','DF','DF','MF','MF','MF','MF','FW','FW'],
}
const TACTICS = [
  { key: 'passing',  label: 'パス主導型',   icon: '🎯' },
  { key: 'longball', label: 'ロングボール型', icon: '🚀' },
  { key: 'wing',     label: 'サイド攻撃型',  icon: '↔️' },
]
const ORIGINAL_TEAM = {
  team_id: 'original', team_name: '⭐ ORIGINAL',
  primary_color: '#f0c040', isOriginal: true,
}

function assignDefaultPlayers(formation, allPlayers) {
  const slots = FORMATION_SLOTS[formation] || FORMATION_SLOTS['4-3-3']
  const grouped = { GK: [], DF: [], MF: [], FW: [] }
  allPlayers.forEach(p => { if (grouped[p.position]) grouped[p.position].push(p) })
  const used = new Set()
  return slots.map(pos => {
    const player = (grouped[pos] || []).find(p => !used.has(p.id))
    if (player) { used.add(player.id); return player }
    const fallback = allPlayers.find(p => !used.has(p.id))
    if (fallback) { used.add(fallback.id); return fallback }
    return null
  })
}

function calcOverall(p) {
  return p?.stats
    ? Math.round(Object.values(p.stats).reduce((s, v) => s + v, 0) / Math.max(Object.keys(p.stats).length, 1))
    : 0
}

function posTag(position) {
  const colors = { GK: '#f59e0b', DF: '#3b82f6', MF: '#10b981', FW: '#ef4444' }
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

const listItemStyle = {
  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
  borderRadius: 8, cursor: 'pointer', border: '1px solid var(--border)',
  background: 'var(--bg-card)', transition: 'background 0.15s',
}

export default function PresetPage() {
  const navigate = useNavigate()

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

  const [pendingLineup, setPendingLineup] = useState(null)
  const [presetWarning, setPresetWarning] = useState(null)
  const [toast, setToast] = useState(null)

  // Load teams on mount
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
      const fetchPromise = selectedTeam.isOriginal
        ? getAllPlayers().then(d => d.players || [])
        : getTeamPlayers(selectedTeam.team_id).then(d => d.players || [])

      fetchPromise.then(players => {
        setAllPlayersPool(players)
        setAllPlayers(players)
        if (pendingLineup) {
          const { resolved, missing } = resolveLineup(pendingLineup, players)
          if (missing > 0) setPresetWarning(`プリセット内 ${missing} 人の選手データが更新されました`)
          else setPresetWarning(null)
          setLineup(resolved)
          setPendingLineup(null)
        } else {
          setPresetWarning(null)
          setLineup(assignDefaultPlayers(formation, players))
        }
      }).catch(() => {}).finally(() => setPlayersLoading(false))
    }
  }, [step, selectedTeam])

  // Re-assign when formation changes in step 3
  useEffect(() => {
    if (allPlayersPool.length > 0 && step === 3) {
      setLineup(assignDefaultPlayers(formation, allPlayersPool))
      setChangingSlot(null)
    }
  }, [formation])

  const handleSelectTeam = (team) => {
    setSelectedTeam(team)
    const preset = loadPreset(team.team_id)
    if (preset) {
      setFormation(preset.formation)
      const tacticKey = TACTICS.find(t => t.label === preset.tactic)?.key || 'passing'
      setTactic(tacticKey)
      setPendingLineup(preset.lineup)
    } else {
      setFormation('4-3-3')
      setTactic('passing')
      setPendingLineup(null)
    }
  }

  const handleSelectPlayerForSlot = (player) => {
    if (changingSlot === null) return
    const newLineup = [...lineup]
    const existingSlot = lineup.findIndex(p => p && p.id === player.id)
    if (existingSlot !== -1) {
      newLineup[existingSlot] = newLineup[changingSlot]
    }
    newLineup[changingSlot] = player
    setLineup(newLineup)
    setChangingSlot(null)
    setPosFilter('ALL')
  }

  const handleSave = () => {
    const tacticLabel = TACTICS.find(t => t.key === tactic)?.label || tactic
    const teamId = selectedTeam.isOriginal ? 'original' : selectedTeam.team_id
    const preset = {
      teamId,
      teamName: selectedTeam.isOriginal ? 'My Original Team' : selectedTeam.team_name,
      teamType: selectedTeam.isOriginal ? 'original' : 'club',
      formation,
      tactic: tacticLabel,
      lineup: lineup.map(p => p ? {
        id: p.id, skipper_name: p.skipper_name, position: p.position,
        team_id: p.team_id, team_name: p.team_name, stats: p.stats
      } : null),
      matchCount: (loadPreset(teamId)?.matchCount || 0),
    }
    const result = savePreset(preset.teamId, preset)
    if (result.ok) {
      setToast('プリセットを保存しました！')
      setTimeout(() => setToast(null), 2500)
    } else {
      setToast('保存に失敗しました: ' + result.error)
      setTimeout(() => setToast(null), 3000)
    }
  }

  const handleDelete = () => {
    const tid = selectedTeam.isOriginal ? 'original' : selectedTeam.team_id
    deletePreset(tid)
    setStep(1)
    setSelectedTeam(null)
    setToast('プリセットを削除しました')
    setTimeout(() => setToast(null), 2000)
  }

  const filteredPlayers = allPlayersPool.filter(p => {
    const posOk = posFilter === 'ALL' || p.position === posFilter
    const notUsed = !lineup.some(l => l && l.id === p.id)
    return posOk && notUsed
  })

  const currentTeamId = selectedTeam?.isOriginal ? 'original' : selectedTeam?.team_id

  return (
    <div className="page">
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateX(-50%) translateY(12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @media (max-width: 600px) {
          .preset-lineup-layout { flex-direction: column !important; }
          .preset-lineup-pitch  { width: 100% !important; }
          .preset-lineup-panel  { width: 100% !important; }
        }
      `}</style>

      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button
            className="btn btn-secondary"
            style={{ padding: '8px 16px' }}
            onClick={() => navigate('/')}
          >
            ← ロビー
          </button>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)' }}>チーム編成</h1>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28, alignItems: 'center' }}>
          {[1, 2, 3].map(s => (
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
              {s < 3 && <div style={{ width: 32, height: 2, background: step > s ? 'var(--success)' : 'var(--border)', borderRadius: 1 }} />}
            </div>
          ))}
          <div style={{ marginLeft: 8, color: 'var(--text-secondary)', fontSize: 14 }}>
            {step === 1 ? 'チーム選択' : step === 2 ? 'フォーメーション' : 'ラインナップ'}
          </div>
        </div>

        {/* ── Step 1: Team Selection ── */}
        {step === 1 && (
          <div>
            <h2 style={{ marginBottom: 16, fontSize: 20, color: 'var(--text-primary)' }}>チームを選択</h2>
            {teamsLoading && <div className="spinner" />}
            {teamsError && <p style={{ color: 'var(--danger)' }}>エラー: {teamsError}</p>}
            {!teamsLoading && !teamsError && (
              <>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                  gap: 12,
                  marginBottom: 24,
                }}>
                  {/* ORIGINAL special card */}
                  <div
                    onClick={() => handleSelectTeam(ORIGINAL_TEAM)}
                    className="card"
                    style={{
                      position: 'relative',
                      cursor: 'pointer',
                      padding: '14px 16px',
                      transition: 'all 0.2s',
                      border: '2px solid transparent',
                      background: selectedTeam?.team_id === 'original'
                        ? 'linear-gradient(rgba(240,192,64,0.15),rgba(240,192,64,0.15)) padding-box, linear-gradient(135deg, #ffd700, #ff6b6b, #4f8cff, #00d4aa) border-box'
                        : 'linear-gradient(var(--bg-card),var(--bg-card)) padding-box, linear-gradient(135deg, #ffd700, #ff6b6b, #4f8cff, #00d4aa) border-box',
                    }}
                  >
                    <div style={{
                      height: 4, borderRadius: 2,
                      background: 'linear-gradient(135deg, #ffd700, #ff6b6b, #4f8cff, #00d4aa)',
                      marginBottom: 10,
                    }} />
                    {hasPreset('original') && (
                      <div style={{
                        position: 'absolute', top: 6, right: 6,
                        background: 'rgba(46,213,115,0.2)', border: '1px solid #2ed573',
                        borderRadius: 10, padding: '2px 6px', fontSize: 9, fontWeight: 700, color: '#2ed573',
                      }}>保存済</div>
                    )}
                    <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                      {ORIGINAL_TEAM.team_name}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                      全チームから選手を選択
                    </div>
                  </div>

                  {/* Regular club teams */}
                  {teams.map(team => (
                    <div
                      key={team.team_id}
                      onClick={() => handleSelectTeam(team)}
                      className="card"
                      style={{
                        position: 'relative',
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
                        height: 4, borderRadius: 2,
                        background: team.primary_color || 'var(--accent)',
                        marginBottom: 10,
                      }} />
                      {hasPreset(team.team_id) && (
                        <div style={{
                          position: 'absolute', top: 6, right: 6,
                          background: 'rgba(46,213,115,0.2)', border: '1px solid #2ed573',
                          borderRadius: 10, padding: '2px 6px', fontSize: 9, fontWeight: 700, color: '#2ed573',
                        }}>保存済</div>
                      )}
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
                    disabled={!selectedTeam}
                    onClick={() => setStep(2)}
                  >
                    次へ →
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Step 2: Formation & Tactic ── */}
        {step === 2 && (
          <div>
            <h2 style={{ marginBottom: 20, fontSize: 20 }}>フォーメーション &amp; 戦術</h2>
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
                          padding: '8px 16px', fontSize: 14, fontWeight: 700,
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
                          borderRadius: 8, padding: '12px 16px',
                          cursor: 'pointer', textAlign: 'left',
                          fontFamily: 'inherit', transition: 'all 0.2s',
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: 14 }}>
                          {t.icon} {t.label}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
              <button className="btn btn-secondary" onClick={() => setStep(1)}>← 戻る</button>
              <button className="btn btn-primary" disabled={!formation || !tactic} onClick={() => setStep(3)}>次へ →</button>
            </div>
          </div>
        )}

        {/* ── Step 3: Lineup ── */}
        {step === 3 && (
          <div>
            <h2 style={{ marginBottom: 16, fontSize: 20 }}>スターティングラインナップ</h2>

            {presetWarning && (
              <div style={{
                background: 'rgba(255,165,0,0.12)', border: '1px solid #ffa502',
                borderRadius: 8, padding: '8px 12px', marginBottom: 12,
                fontSize: 12, color: '#ffa502',
              }}>
                ⚠️ {presetWarning}
              </div>
            )}

            {playersLoading && <div className="spinner" />}
            {!playersLoading && (
              <>
                <div
                  className="preset-lineup-layout"
                  style={{ display: 'flex', flexDirection: 'row', gap: 20, alignItems: 'flex-start' }}
                >
                  {/* Pitch */}
                  <div className="preset-lineup-pitch" style={{ flex: '0 0 auto', width: '50%' }}>
                    <PitchView
                      formation={formation}
                      players={lineup}
                      onPlayerClick={(player, slotIndex) => {
                        setChangingSlot(slotIndex)
                        setPosFilter('ALL')
                      }}
                      selectedPlayerId={changingSlot !== null && lineup[changingSlot] ? lineup[changingSlot].id : null}
                    />
                  </div>

                  {/* Player selection panel */}
                  <div className="preset-lineup-panel" style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700, marginBottom: 10, textTransform: 'uppercase' }}>
                      {changingSlot !== null
                        ? `スロット ${changingSlot + 1} (${FORMATION_SLOTS[formation]?.[changingSlot]}) の選手を選択`
                        : '選手一覧（クリックして交代）'}
                    </p>

                    {changingSlot !== null ? (
                      <>
                        {/* Position filter tabs */}
                        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
                          {['ALL', 'GK', 'DF', 'MF', 'FW'].map(pos => (
                            <button
                              key={pos}
                              style={{
                                padding: '6px 12px', borderRadius: 20, border: '1px solid var(--border)',
                                background: posFilter === pos ? 'var(--accent)' : 'transparent',
                                color: posFilter === pos ? '#050810' : 'var(--text-secondary)',
                                cursor: 'pointer', fontSize: 12, fontFamily: 'inherit',
                                fontWeight: posFilter === pos ? 700 : 400,
                              }}
                              onClick={() => setPosFilter(pos)}
                            >
                              {pos}
                            </button>
                          ))}
                        </div>

                        {/* Filtered player list */}
                        <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {filteredPlayers.map(p => {
                            const overall = calcOverall(p)
                            return (
                              <div
                                key={p.id}
                                style={listItemStyle}
                                onClick={() => handleSelectPlayerForSlot(p)}
                                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card-hover)' }}
                                onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)' }}
                              >
                                <span style={posTag(p.position)}>{p.position}</span>
                                <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{p.skipper_name}</span>
                                {selectedTeam?.isOriginal && (
                                  <span style={{ fontSize: 11, color: 'var(--text-muted)', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {p.team_name}
                                  </span>
                                )}
                                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{overall}</span>
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
                          onClick={() => { setChangingSlot(null) }}
                        >
                          キャンセル
                        </button>
                      </>
                    ) : (
                      /* Default view: show lineup */
                      <div style={{ maxHeight: 340, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {lineup.map((player, idx) => {
                          if (!player) return (
                            <div key={idx} style={{ ...listItemStyle, opacity: 0.4 }}>
                              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>スロット {idx + 1} — 未設定</span>
                            </div>
                          )
                          const overall = calcOverall(player)
                          return (
                            <div
                              key={player.id}
                              style={listItemStyle}
                              onClick={() => { setChangingSlot(idx); setPosFilter('ALL') }}
                              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card-hover)' }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)' }}
                            >
                              <span style={{ color: 'var(--text-muted)', width: 20, fontSize: 12 }}>{idx + 1}</span>
                              <span style={posTag(player.position)}>{player.position}</span>
                              <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{player.skipper_name}</span>
                              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{overall}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Save / Delete bar */}
                <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                  <button className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setStep(2)}>← 戻る</button>
                  <button
                    className="btn btn-primary"
                    style={{ flex: 2, justifyContent: 'center' }}
                    onClick={handleSave}
                    disabled={lineup.filter(Boolean).length < 11}
                  >
                    💾 プリセットを保存
                  </button>
                  {hasPreset(currentTeamId) && (
                    <button
                      className="btn btn-danger"
                      style={{ padding: '12px 16px' }}
                      onClick={handleDelete}
                    >
                      🗑
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--bg-card)', border: '1px solid var(--accent)',
          borderRadius: 24, padding: '12px 28px',
          color: 'var(--accent)', fontWeight: 700, fontSize: 14,
          boxShadow: '0 4px 24px rgba(0,0,0,0.4)', zIndex: 500,
          animation: 'fadeInUp 0.3s ease',
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}
