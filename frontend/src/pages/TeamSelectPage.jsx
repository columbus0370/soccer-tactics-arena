import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import PitchView from '../components/PitchView'
import PlayerCard from '../components/PlayerCard'
import { getTeams, getTeamPlayers, getCPUTeam, getAllPlayers } from '../api/gameApi'
import { savePreset, loadPreset, hasPreset, resolveLineup } from '../utils/presets'

const FORMATIONS = ['4-3-3', '4-2-4', '5-3-2', '3-5-2', '4-4-2']
const CPU_TACTICS_LIST = ['パス主導型', 'ロングボール型', 'サイド攻撃型']

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

const MAGIC_TEAM = { isMagic: true, team_name: '✨ Magic Team', team_id: 'magic' }

function calcOverallStatic(p) {
  return p?.stats
    ? Math.round(Object.values(p.stats).reduce((s, v) => s + v, 0) / Math.max(Object.keys(p.stats).length, 1))
    : 0
}

function assignDefaultPlayers(formation, allPlayers, isMagic = false) {
  const slots = FORMATION_SLOTS[formation] || FORMATION_SLOTS['4-3-3']
  if (isMagic) {
    // Top 11 by OVR descending, duplicates allowed
    const sorted = [...allPlayers].sort((a, b) => calcOverallStatic(b) - calcOverallStatic(a))
    return slots.map((_, i) => sorted[i] || null)
  }
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
  const [opponentMode, setOpponentMode] = useState('random')

  const [preloadedLineup, setPreloadedLineup] = useState(null)
  const [presetWarning, setPresetWarning] = useState(null)

  // Swap overlay (mobile tap-to-swap panel)
  const [swapOverlay, setSwapOverlay] = useState(null) // { slotIndex, player }
  const [overlaySearch, setOverlaySearch] = useState('')

  // Opponent team builder state (Steps 5 & 6)
  const [oppFormation, setOppFormation] = useState('4-3-3')
  const [oppTactic, setOppTactic] = useState('passing')
  const [oppLineup, setOppLineup] = useState([])
  const [oppPlayersPool, setOppPlayersPool] = useState([])
  const [oppPlayersLoading, setOppPlayersLoading] = useState(false)
  const [oppChangingSlot, setOppChangingSlot] = useState(null)
  const [oppPosFilter, setOppPosFilter] = useState('ALL')
  const [oppSwapOverlay, setOppSwapOverlay] = useState(null)
  const [oppOverlaySearch, setOppOverlaySearch] = useState('')

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
      const applyLineup = (players) => {
        if (preloadedLineup) {
          const { resolved, missing } = resolveLineup(preloadedLineup, players)
          if (missing > 0) setPresetWarning(`プリセット内 ${missing} 人の選手データが更新されました`)
          else setPresetWarning(null)
          setLineup(resolved)
          setPreloadedLineup(null)
        } else {
          setPresetWarning(null)
          setLineup(assignDefaultPlayers(formation, players, !!selectedTeam?.isMagic))
        }
      }
      if (selectedTeam.isOriginal || selectedTeam.isMagic) {
        getAllPlayers()
          .then(data => {
            const players = data.players || []
            setAllPlayersPool(players)
            setAllPlayers(players)
            applyLineup(players)
          })
          .catch(() => {})
          .finally(() => setPlayersLoading(false))
      } else {
        getTeamPlayers(selectedTeam.team_id)
          .then(data => {
            const players = data.players || []
            setAllPlayersPool(players)
            setAllPlayers(players)
            applyLineup(players)
          })
          .catch(() => {})
          .finally(() => setPlayersLoading(false))
      }
    }
  }, [step, selectedTeam])

  // Re-assign when formation changes in step 3
  useEffect(() => {
    if (allPlayersPool.length > 0) {
      setLineup(assignDefaultPlayers(formation, allPlayersPool, !!selectedTeam?.isMagic))
      setChangingSlot(null)
    }
  }, [formation])

  // Load all players when entering Step 5 (opponent builder)
  useEffect(() => {
    if (step === 5 && (opponentMode === 'original' || opponentMode === 'magic')) {
      setOppPlayersLoading(true)
      getAllPlayers()
        .then(data => {
          const players = data.players || []
          setOppPlayersPool(players)
          setOppLineup(assignDefaultPlayers(oppFormation, players, opponentMode === 'magic'))
        })
        .catch(() => {})
        .finally(() => setOppPlayersLoading(false))
    }
  }, [step, opponentMode])

  // Re-assign opponent lineup when oppFormation changes
  useEffect(() => {
    if (oppPlayersPool.length > 0) {
      setOppLineup(assignDefaultPlayers(oppFormation, oppPlayersPool, opponentMode === 'magic'))
      setOppChangingSlot(null)
    }
  }, [oppFormation])

  const handleSelectPlayerForSlot = (player) => {
    if (changingSlot === null) return
    const newLineup = [...lineup]
    if (selectedTeam?.isMagic) {
      // Magic Team: just overwrite the slot, allow duplicates
      newLineup[changingSlot] = player
    } else {
      const existingSlot = lineup.findIndex(p => p && p.id === player.id)
      if (existingSlot !== -1) {
        newLineup[existingSlot] = newLineup[changingSlot]
      }
      newLineup[changingSlot] = player
    }
    setLineup(newLineup)
    setChangingSlot(null)
    setPosFilter('ALL')
    setTeamFilter('ALL')
  }

  const handleSwapLineupSlots = (fromIdx, toIdx) => {
    setLineup(prev => {
      const next = [...prev]
      ;[next[fromIdx], next[toIdx]] = [next[toIdx], next[fromIdx]]
      return next
    })
  }

  const handleSwapOppLineupSlots = (fromIdx, toIdx) => {
    setOppLineup(prev => {
      const next = [...prev]
      ;[next[fromIdx], next[toIdx]] = [next[toIdx], next[fromIdx]]
      return next
    })
  }

  const calcOverall = (p) =>
    p?.stats
      ? Math.round(Object.values(p.stats).reduce((s, v) => s + v, 0) / Math.max(Object.keys(p.stats).length, 1))
      : 0

  const handleSelectOppPlayerForSlot = (player) => {
    if (oppChangingSlot === null) return
    const newLineup = [...oppLineup]
    if (opponentMode === 'magic') {
      newLineup[oppChangingSlot] = player
    } else {
      const existingSlot = oppLineup.findIndex(p => p && p.id === player.id)
      if (existingSlot !== -1) newLineup[existingSlot] = newLineup[oppChangingSlot]
      newLineup[oppChangingSlot] = player
    }
    setOppLineup(newLineup)
    setOppChangingSlot(null)
    setOppPosFilter('ALL')
  }

  const handleOppOverlaySwap = (candidate) => {
    if (oppSwapOverlay === null) return
    const { slotIndex } = oppSwapOverlay
    const newLineup = [...oppLineup]
    if (opponentMode === 'magic') {
      newLineup[slotIndex] = candidate
    } else {
      const existingSlot = oppLineup.findIndex(p => p && p.id === candidate.id)
      if (existingSlot !== -1) newLineup[existingSlot] = newLineup[slotIndex]
      newLineup[slotIndex] = candidate
    }
    setOppLineup(newLineup)
    setOppSwapOverlay(null)
    setOppOverlaySearch('')
  }

  const handleOverlaySwap = (candidate) => {
    if (swapOverlay === null) return
    const { slotIndex } = swapOverlay
    const newLineup = [...lineup]
    if (selectedTeam?.isMagic) {
      // Magic Team: just overwrite, allow duplicates
      newLineup[slotIndex] = candidate
    } else {
      const existingSlot = lineup.findIndex(p => p && p.id === candidate.id)
      if (existingSlot !== -1) {
        newLineup[existingSlot] = newLineup[slotIndex]
      }
      newLineup[slotIndex] = candidate
    }
    setLineup(newLineup)
    setSwapOverlay(null)
    setOverlaySearch('')
  }

  const handleConfirm = async () => {
    setSubmitting(true)
    try {
      let player2

      if (opponentMode === 'random') {
        player2 = await getCPUTeam(difficulty)
      } else if (opponentMode === 'original' || opponentMode === 'magic') {
        const oppTacticLabel = CPU_TACTICS_LIST[Math.floor(Math.random() * CPU_TACTICS_LIST.length)]
        player2 = {
          teamId: opponentMode,
          teamName: opponentMode === 'magic' ? '✨ Magic Team' : '⭐ ORIGINAL',
          formation: oppFormation,
          tactic: oppTacticLabel,
          players: oppLineup.filter(Boolean),
          isCPU: true,
          difficulty,
        }
      } else {
        const randFormation = FORMATIONS[Math.floor(Math.random() * FORMATIONS.length)]
        const randTactic = CPU_TACTICS_LIST[Math.floor(Math.random() * CPU_TACTICS_LIST.length)]
        let oppPlayers = []
        let oppTeamName = ''

        const data = await getTeamPlayers(opponentMode)
        oppPlayers = data.players || []
        oppTeamName = teams.find(t => t.team_id === opponentMode)?.team_name || opponentMode

        const builtLineup = assignDefaultPlayers(randFormation, oppPlayers, false)
        player2 = {
          teamId: opponentMode,
          teamName: oppTeamName,
          formation: randFormation,
          tactic: randTactic,
          players: builtLineup.filter(Boolean),
          isCPU: true,
          difficulty,
        }
      }

      const tacticLabel = TACTICS.find(t => t.key === tactic)?.label || tactic
      const player1 = {
        teamName: selectedTeam.isOriginal ? 'My Original Team' : selectedTeam.isMagic ? '✨ Magic Team' : selectedTeam.team_name,
        teamId: selectedTeam.isOriginal ? 'original' : selectedTeam.isMagic ? 'magic' : selectedTeam.team_id,
        formation,
        tactic: tacticLabel,
        players: lineup.filter(Boolean),
      }

      // Auto-save preset before navigating to match
      const presetPayload = {
        teamId: player1.teamId,
        teamName: player1.teamName,
        teamType: selectedTeam?.isOriginal ? 'original' : selectedTeam?.isMagic ? 'magic' : 'club',
        formation,
        tactic: tacticLabel,
        lineup: lineup.filter(Boolean).map(p => ({
          id: p.id, skipper_name: p.skipper_name, position: p.position,
          team_id: p.team_id, team_name: p.team_name, stats: p.stats,
        })),
        matchCount: (loadPreset(player1.teamId)?.matchCount || 0) + 1,
      }
      savePreset(player1.teamId, presetPayload)

      navigate('/match', { state: { player1, player2, difficulty } })
    } catch (e) {
      alert('エラーが発生しました: ' + e.message)
    } finally {
      setSubmitting(false)
    }
  }

  const canNextStep1 = !!selectedTeam
  const canNextStep2 = !!formation && !!tactic
  const canNextStep3 = lineup.filter(Boolean).length === 11
  const canNextStep6 = oppLineup.filter(Boolean).length === 11

  // Filtered players for the swap modal
  const filteredPlayers = allPlayersPool.filter(p => {
    const posOk = posFilter === 'ALL' || p.position === posFilter
    const teamOk = teamFilter === 'ALL' || p.team_id === teamFilter
    const notUsed = selectedTeam?.isMagic || !lineup.some(l => l && l.id === p.id)
    return posOk && teamOk && notUsed
  })

  // Unique teams from pool for the team filter dropdown
  const teamsForFilter = allPlayersPool.reduce((acc, p) => {
    if (!acc.some(t => t.team_id === p.team_id)) {
      acc.push({ team_id: p.team_id, team_name: p.team_name })
    }
    return acc
  }, [])

  const totalSteps = (opponentMode === 'original' || opponentMode === 'magic') ? 6 : 4
  const stepLabels = ['', 'チーム選択', 'フォーメーション', 'ラインナップ', '確認',
    '相手フォーメーション', '相手ラインナップ']

  return (
    <div className="page" style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Step indicator */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28, alignItems: 'center' }}>
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map(s => (
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
            {s < totalSteps && <div style={{ width: 32, height: 2, background: step > s ? 'var(--success)' : 'var(--border)', borderRadius: 1 }} />}
          </div>
        ))}
        <div style={{ marginLeft: 8, color: 'var(--text-secondary)', fontSize: 14 }}>
          {stepLabels[step] || ''}
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
                  onClick={() => {
                    setSelectedTeam(ORIGINAL_TEAM)
                    const preset = loadPreset(ORIGINAL_TEAM.team_id)
                    if (preset) {
                      setFormation(preset.formation)
                      const tacticKey = TACTICS.find(t => t.label === preset.tactic)?.key || 'passing'
                      setTactic(tacticKey)
                      setPreloadedLineup(preset.lineup)
                    } else {
                      setPreloadedLineup(null)
                    }
                  }}
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
                  {hasPreset('original') && (
                    <div style={{
                      position: 'absolute', top: 6, right: 6,
                      background: 'rgba(46,213,115,0.15)', border: '1px solid rgba(46,213,115,0.5)',
                      borderRadius: 10, padding: '2px 6px', fontSize: 9, fontWeight: 700, color: '#2ed573',
                      letterSpacing: '0.05em',
                    }}>保存済</div>
                  )}
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                    {ORIGINAL_TEAM.team_name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    {ORIGINAL_TEAM.sub}
                  </div>
                </div>

                {/* MAGIC TEAM special card */}
                <div
                  key={MAGIC_TEAM.team_id}
                  onClick={() => {
                    setSelectedTeam(MAGIC_TEAM)
                    const preset = loadPreset(MAGIC_TEAM.team_id)
                    if (preset) {
                      setFormation(preset.formation)
                      const tacticKey = TACTICS.find(t => t.label === preset.tactic)?.key || 'passing'
                      setTactic(tacticKey)
                      setPreloadedLineup(preset.lineup)
                    } else {
                      setPreloadedLineup(null)
                    }
                  }}
                  className="card"
                  style={{
                    position: 'relative',
                    cursor: 'pointer',
                    padding: '14px 16px',
                    transition: 'all 0.2s',
                    border: '2px solid transparent',
                    background: selectedTeam?.team_id === 'magic'
                      ? 'linear-gradient(rgba(167,139,250,0.15),rgba(167,139,250,0.15)) padding-box, linear-gradient(135deg, #a78bfa, #f472b6, #fb923c) border-box'
                      : 'linear-gradient(var(--bg-card),var(--bg-card)) padding-box, linear-gradient(135deg, #a78bfa, #f472b6, #fb923c) border-box',
                  }}
                  onMouseEnter={e => {
                    if (selectedTeam?.team_id !== 'magic')
                      e.currentTarget.style.background = 'linear-gradient(var(--bg-card-hover),var(--bg-card-hover)) padding-box, linear-gradient(135deg, #a78bfa, #f472b6, #fb923c) border-box'
                  }}
                  onMouseLeave={e => {
                    if (selectedTeam?.team_id !== 'magic')
                      e.currentTarget.style.background = 'linear-gradient(var(--bg-card),var(--bg-card)) padding-box, linear-gradient(135deg, #a78bfa, #f472b6, #fb923c) border-box'
                  }}
                >
                  <div style={{
                    height: 4,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #a78bfa, #f472b6, #fb923c)',
                    marginBottom: 10,
                  }} />
                  {hasPreset('magic') && (
                    <div style={{
                      position: 'absolute', top: 6, right: 6,
                      background: 'rgba(46,213,115,0.15)', border: '1px solid rgba(46,213,115,0.5)',
                      borderRadius: 10, padding: '2px 6px', fontSize: 9, fontWeight: 700, color: '#2ed573',
                      letterSpacing: '0.05em',
                    }}>保存済</div>
                  )}
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text-primary)' }}>
                    {MAGIC_TEAM.team_name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    ポジション不問・重複あり
                  </div>
                </div>

                {teams.map(team => (
                  <div
                    key={team.team_id}
                    onClick={() => {
                      setSelectedTeam(team)
                      const preset = loadPreset(team.team_id)
                      if (preset) {
                        setFormation(preset.formation)
                        const tacticKey = TACTICS.find(t => t.label === preset.tactic)?.key || 'passing'
                        setTactic(tacticKey)
                        setPreloadedLineup(preset.lineup)
                      } else {
                        setPreloadedLineup(null)
                      }
                    }}
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
                      height: 4,
                      borderRadius: 2,
                      background: team.primary_color || 'var(--accent)',
                      marginBottom: 10,
                    }} />
                    {hasPreset(team.team_id) && (
                      <div style={{
                        position: 'absolute', top: 6, right: 6,
                        background: 'rgba(46,213,115,0.15)', border: '1px solid rgba(46,213,115,0.5)',
                        borderRadius: 10, padding: '2px 6px', fontSize: 9, fontWeight: 700, color: '#2ed573',
                        letterSpacing: '0.05em',
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
        <div style={{ position: 'relative' }}>
          <style>{`
            @media (max-width: 600px) {
              .lineup-layout { flex-direction: column !important; }
              .lineup-pitch-col { width: 100% !important; }
              .lineup-panel-col { width: 100% !important; }
            }
          `}</style>
          <h2 style={{ marginBottom: 20, fontSize: 20 }}>スターティングラインナップ</h2>
          {presetWarning && (
            <div style={{
              background: 'rgba(255,165,0,0.1)', border: '1px solid var(--warning)',
              borderRadius: 8, padding: '8px 12px', marginBottom: 8,
              fontSize: 12, color: 'var(--warning)',
            }}>
              ⚠️ {presetWarning}
            </div>
          )}
          {playersLoading && <div className="spinner" />}
          {!playersLoading && (
            <div
              className="lineup-layout"
              style={{ display: 'flex', flexDirection: 'row', gap: 24, alignItems: 'flex-start' }}
            >
              {/* Pitch */}
              <div className="lineup-pitch-col" style={{ flex: '0 0 auto', width: '50%' }}>
                <PitchView
                  formation={formation}
                  players={lineup}
                  onPlayerClick={(player, slotIndex) => {
                    // Open overlay on mobile-friendly tap; also update right-panel slot
                    setSwapOverlay({ slotIndex, player })
                    setChangingSlot(slotIndex)
                    setPosFilter('ALL')
                    setTeamFilter('ALL')
                  }}
                  onSwapPlayers={handleSwapLineupSlots}
                  selectedPlayerId={changingSlot !== null && lineup[changingSlot] ? lineup[changingSlot].id : null}
                />
                {changingSlot !== null && swapOverlay === null && (
                  <p style={{ color: 'var(--accent)', fontSize: 12, marginTop: 8, textAlign: 'center' }}>
                    右のリストから選手を選んでください
                  </p>
                )}
              </div>

              {/* Player selection panel */}
              <div className="lineup-panel-col" style={{ flex: 1, minWidth: 0 }}>
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
                        const overall = calcOverall(p)
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
                      onClick={() => { setChangingSlot(null); setSwapOverlay(null) }}
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

          {/* ── Swap Overlay (slide-up panel for mobile tap-to-swap) ── */}
          {swapOverlay !== null && (() => {
            const { slotIndex, player } = swapOverlay
            const slotPos = FORMATION_SLOTS[formation]?.[slotIndex]
            const overallCurrent = calcOverall(player)
            // Stable OVR-descending candidates; Magic Team: no position/duplicate restriction
            const candidates = allPlayersPool
              .filter(p => {
                const posOk = selectedTeam?.isMagic || p.position === slotPos
                const notUsed = selectedTeam?.isMagic || !lineup.some(l => l && l.id === p.id)
                return posOk && notUsed
              })
              .sort((a, b) => calcOverall(b) - calcOverall(a))
            const visibleCandidates = overlaySearch.trim()
              ? candidates.filter(c => c.skipper_name.toLowerCase().includes(overlaySearch.toLowerCase()))
              : candidates
            return (
              <>
                {/* Backdrop */}
                <div
                  onClick={() => { setSwapOverlay(null); setChangingSlot(null); setOverlaySearch('') }}
                  style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 100,
                  }}
                />
                {/* Slide-up panel */}
                <div
                  style={{
                    position: 'fixed', left: 0, right: 0, bottom: 0,
                    background: 'var(--bg-card)',
                    borderRadius: '16px 16px 0 0',
                    boxShadow: '0 -4px 32px rgba(0,0,0,0.5)',
                    zIndex: 101,
                    maxHeight: '70vh',
                    display: 'flex', flexDirection: 'column',
                    animation: 'slideUp 0.25s ease-out',
                  }}
                >
                  <style>{`
                    @keyframes slideUp {
                      from { transform: translateY(100%); }
                      to   { transform: translateY(0); }
                    }
                  `}</style>

                  {/* Handle bar */}
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
                    <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)' }} />
                  </div>

                  {/* Header: current player info */}
                  <div style={{
                    padding: '8px 20px 12px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                        交代対象 — スロット {slotIndex + 1}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={posTag(player.position)}>{player.position}</span>
                        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
                          {player.skipper_name}
                        </span>
                        <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 700 }}>
                          {overallCurrent}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => { setSwapOverlay(null); setChangingSlot(null); setOverlaySearch('') }}
                      style={{
                        background: 'none', border: 'none', color: 'var(--text-muted)',
                        fontSize: 22, cursor: 'pointer', padding: '4px 8px', lineHeight: 1,
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Sub-header */}
                  <div style={{ padding: '8px 20px 4px', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700 }}>
                    {selectedTeam?.isMagic ? '交代候補（全ポジション）' : `交代候補（${slotPos}）`}
                  </div>

                  {/* Search input */}
                  <div style={{ padding: '0 12px' }}>
                    <input
                      placeholder="選手名で検索..."
                      value={overlaySearch}
                      onChange={e => setOverlaySearch(e.target.value)}
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        margin: '8px 0', padding: '8px 12px',
                        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                        borderRadius: 8, color: 'var(--text-primary)', fontSize: 14,
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>

                  {/* Candidate list */}
                  <div style={{ overflowY: 'auto', flex: 1, padding: '0 12px 16px' }}>
                    {visibleCandidates.length === 0 && (
                      <div style={{ padding: 20, color: 'var(--text-muted)', textAlign: 'center', fontSize: 13 }}>
                        交代候補がいません
                      </div>
                    )}
                    {visibleCandidates.map(c => {
                      const ov = calcOverall(c)
                      return (
                        <div
                          key={c.id}
                          style={{ ...styles.playerListItem, marginBottom: 4 }}
                          onClick={() => handleOverlaySwap(c)}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card-hover)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)' }}
                        >
                          <span style={posTag(c.position)}>{c.position}</span>
                          <span style={styles.playerName}>{c.skipper_name}</span>
                          {(selectedTeam?.isOriginal || selectedTeam?.isMagic) && (
                            <span style={styles.teamTag}>{c.team_name}</span>
                          )}
                          <span style={styles.overallScore}>{ov}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            )
          })()}
        </div>
      )}

      {/* Step 4: Confirmation */}
      {step === 4 && (
        <div>
          <style>{`
            @media (max-width: 600px) {
              .confirm-grid { grid-template-columns: 1fr !important; }
            }
          `}</style>
          <h2 style={{ marginBottom: 20, fontSize: 20 }}>確認 & 試合開始</h2>
          <div className="confirm-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            <div className="card">
              <h3 style={{ marginBottom: 12, color: 'var(--accent)', fontSize: 16 }}>チーム情報</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'チーム', value: selectedTeam?.isOriginal ? 'My Original Team' : selectedTeam?.isMagic ? '✨ Magic Team' : selectedTeam?.team_name },
                  { label: 'フォーメーション', value: formation },
                  { label: '戦術', value: TACTICS.find(t => t.key === tactic)?.label },
                  { label: '難易度', value: difficulty.toUpperCase(), color: 'var(--warning)' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
                    <span style={{ fontWeight: 700, fontSize: 14, color: color || 'var(--text-primary)' }}>{value}</span>
                  </div>
                ))}
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

          {/* 対戦相手選択 */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 style={{ marginBottom: 12, color: 'var(--accent)', fontSize: 16 }}>⚔️ 対戦相手</h3>

            {/* クイック選択 */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
              {[
                { id: 'random', label: '🎲 ランダム' },
                { id: 'original', label: '⭐ ORIGINAL' },
                { id: 'magic', label: '✨ Magic' },
              ].map(opt => (
                <button
                  key={opt.id}
                  onClick={() => setOpponentMode(opt.id)}
                  style={{
                    padding: '8px 16px', borderRadius: 20,
                    border: `2px solid ${opponentMode === opt.id ? 'var(--accent)' : 'var(--border)'}`,
                    background: opponentMode === opt.id ? 'rgba(0,212,170,0.15)' : 'transparent',
                    color: opponentMode === opt.id ? 'var(--accent)' : 'var(--text-secondary)',
                    cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 700,
                    transition: 'all 0.15s',
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* チーム一覧グリッド */}
            <div style={{
              maxHeight: 180, overflowY: 'auto',
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 6,
              marginBottom: 10,
            }}>
              {teams.map(team => (
                <button
                  key={team.team_id}
                  onClick={() => setOpponentMode(team.team_id)}
                  style={{
                    padding: '7px 10px', borderRadius: 8, textAlign: 'left',
                    border: `1px solid ${opponentMode === team.team_id ? 'var(--accent)' : 'var(--border)'}`,
                    background: opponentMode === team.team_id ? 'rgba(0,212,170,0.1)' : 'var(--bg-secondary)',
                    color: opponentMode === team.team_id ? 'var(--accent)' : 'var(--text-secondary)',
                    cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 600,
                    transition: 'all 0.15s', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                  }}
                >
                  {team.team_name}
                </button>
              ))}
            </div>

            {/* 選択中表示 */}
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              選択中：{
                opponentMode === 'random' ? '🎲 ランダム（難易度に応じたチーム）' :
                opponentMode === 'original' ? '⭐ ORIGINAL（全クラブ最強11人）' :
                opponentMode === 'magic' ? '✨ Magic（総合値トップ11）' :
                (teams.find(t => t.team_id === opponentMode)?.team_name || opponentMode)
              }
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="btn btn-secondary" onClick={() => setStep(3)}>← 戻る</button>
            {(opponentMode === 'original' || opponentMode === 'magic') ? (
              <button className="btn btn-primary" onClick={() => setStep(5)} style={{ fontSize: 16, padding: '14px 32px' }}>
                次へ（相手編成）→
              </button>
            ) : (
              <button
                className="btn btn-primary"
                disabled={submitting}
                onClick={handleConfirm}
                style={{ fontSize: 16, padding: '14px 32px' }}
              >
                {submitting ? '準備中...' : '⚽ 試合開始！'}
              </button>
            )}
          </div>
        </div>
      )}
      {/* Step 5: Opponent Formation & Tactic */}
      {step === 5 && (
        <div>
          <h2 style={{ marginBottom: 20, fontSize: 20 }}>対戦相手 — フォーメーション &amp; 戦術</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            {/* Pitch preview */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <PitchView formation={oppFormation} players={[]} />
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
                      onClick={() => setOppFormation(f)}
                      className="btn"
                      style={{
                        background: oppFormation === f ? 'var(--accent)' : 'var(--bg-secondary)',
                        color: oppFormation === f ? '#0a0e1a' : 'var(--text-secondary)',
                        border: oppFormation === f ? 'none' : '1px solid var(--border)',
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
                      onClick={() => setOppTactic(t.key)}
                      style={{
                        background: oppTactic === t.key ? 'rgba(0,212,170,0.1)' : 'var(--bg-secondary)',
                        color: oppTactic === t.key ? 'var(--accent)' : 'var(--text-primary)',
                        border: oppTactic === t.key ? '2px solid var(--accent)' : '1px solid var(--border)',
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
            <button className="btn btn-secondary" onClick={() => setStep(4)}>← 戻る</button>
            <button className="btn btn-primary" disabled={!(!!oppFormation && !!oppTactic)} onClick={() => setStep(6)}>次へ →</button>
          </div>
        </div>
      )}

      {/* Step 6: Opponent Lineup */}
      {step === 6 && (
        <div style={{ position: 'relative' }}>
          <style>{`
            @media (max-width: 600px) {
              .opp-lineup-layout { flex-direction: column !important; }
              .opp-lineup-pitch-col { width: 100% !important; }
              .opp-lineup-panel-col { width: 100% !important; }
            }
          `}</style>
          <h2 style={{ marginBottom: 20, fontSize: 20 }}>対戦相手 — スターティングラインナップ</h2>
          {oppPlayersLoading && <div className="spinner" />}
          {!oppPlayersLoading && (
            <div
              className="opp-lineup-layout"
              style={{ display: 'flex', flexDirection: 'row', gap: 24, alignItems: 'flex-start' }}
            >
              {/* Pitch */}
              <div className="opp-lineup-pitch-col" style={{ flex: '0 0 auto', width: '50%' }}>
                <PitchView
                  formation={oppFormation}
                  players={oppLineup}
                  onPlayerClick={(player, slotIndex) => {
                    setOppSwapOverlay({ slotIndex, player })
                    setOppChangingSlot(slotIndex)
                    setOppPosFilter('ALL')
                  }}
                  onSwapPlayers={handleSwapOppLineupSlots}
                  selectedPlayerId={oppChangingSlot !== null && oppLineup[oppChangingSlot] ? oppLineup[oppChangingSlot].id : null}
                />
                {oppChangingSlot !== null && oppSwapOverlay === null && (
                  <p style={{ color: 'var(--accent)', fontSize: 12, marginTop: 8, textAlign: 'center' }}>
                    右のリストから選手を選んでください
                  </p>
                )}
              </div>

              {/* Player selection panel */}
              <div className="opp-lineup-panel-col" style={{ flex: 1, minWidth: 0 }}>
                <p style={{ color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700, marginBottom: 10, textTransform: 'uppercase' }}>
                  {oppChangingSlot !== null
                    ? `スロット ${oppChangingSlot + 1} (${FORMATION_SLOTS[oppFormation]?.[oppChangingSlot]}) の選手を選択`
                    : '選手一覧（クリックして交代）'}
                </p>

                {oppChangingSlot !== null ? (
                  <>
                    {/* Position filter tabs */}
                    <div style={styles.filterTabs}>
                      {['ALL', 'GK', 'DF', 'MF', 'FW'].map(pos => (
                        <button
                          key={pos}
                          style={{
                            ...styles.filterTab,
                            ...(oppPosFilter === pos ? styles.filterTabActive : {}),
                          }}
                          onClick={() => setOppPosFilter(pos)}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>

                    {/* Filtered player list */}
                    <div style={styles.playerListScroll}>
                      {oppPlayersPool
                        .filter(p => {
                          const posOk = oppPosFilter === 'ALL' || p.position === oppPosFilter
                          const notUsed = opponentMode === 'magic' || !oppLineup.some(l => l && l.id === p.id)
                          return posOk && notUsed
                        })
                        .map(p => {
                          const overall = calcOverall(p)
                          return (
                            <div
                              key={p.id}
                              style={styles.playerListItem}
                              onClick={() => handleSelectOppPlayerForSlot(p)}
                              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card-hover)' }}
                              onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)' }}
                            >
                              <span style={posTag(p.position)}>{p.position}</span>
                              <span style={styles.playerName}>{p.skipper_name}</span>
                              <span style={styles.teamTag}>{p.team_name}</span>
                              <span style={styles.overallScore}>{overall}</span>
                            </div>
                          )
                        })}
                    </div>

                    <button
                      className="btn btn-secondary"
                      style={{ marginTop: 10, fontSize: 12, padding: '6px 12px' }}
                      onClick={() => { setOppChangingSlot(null); setOppSwapOverlay(null) }}
                    >
                      キャンセル
                    </button>
                  </>
                ) : (
                  /* Default view: show all current lineup players */
                  <div style={{ maxHeight: 440, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {oppLineup.map((player, idx) => {
                      if (!player) return null
                      const overall = calcOverall(player)
                      return (
                        <div
                          key={`${player.id}-${idx}`}
                          style={{ ...styles.playerListItem, cursor: 'pointer' }}
                          onClick={() => {
                            setOppChangingSlot(idx)
                            setOppPosFilter('ALL')
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card-hover)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)' }}
                        >
                          <span style={{ color: 'var(--text-muted)', width: 20, fontSize: 12 }}>{idx + 1}</span>
                          <span style={posTag(player.position)}>{player.position}</span>
                          <span style={styles.playerName}>{player.skipper_name}</span>
                          <span style={styles.overallScore}>{overall}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
            <button className="btn btn-secondary" onClick={() => setStep(5)}>← 戻る</button>
            <button
              className="btn btn-primary"
              disabled={!canNextStep6 || submitting}
              onClick={handleConfirm}
              style={{ fontSize: 16, padding: '14px 32px' }}
            >
              {submitting ? '準備中...' : '⚽ 試合開始！'}
            </button>
          </div>

          {/* ── Opp Swap Overlay ── */}
          {oppSwapOverlay !== null && (() => {
            const { slotIndex, player } = oppSwapOverlay
            const slotPos = FORMATION_SLOTS[oppFormation]?.[slotIndex]
            const overallCurrent = calcOverall(player)
            const oppCandidates = oppPlayersPool
              .filter(p => {
                if (opponentMode === 'magic') return true
                return p.position === slotPos
              })
              .filter(p => opponentMode === 'magic' || !oppLineup.some(l => l && l.id === p.id))
              .sort((a, b) => calcOverall(b) - calcOverall(a))
            const oppVisible = oppOverlaySearch.trim()
              ? oppCandidates.filter(c => c.skipper_name.toLowerCase().includes(oppOverlaySearch.toLowerCase()))
              : oppCandidates
            return (
              <>
                {/* Backdrop */}
                <div
                  onClick={() => { setOppSwapOverlay(null); setOppChangingSlot(null); setOppOverlaySearch('') }}
                  style={{
                    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 100,
                  }}
                />
                {/* Slide-up panel */}
                <div
                  style={{
                    position: 'fixed', left: 0, right: 0, bottom: 0,
                    background: 'var(--bg-card)',
                    borderRadius: '16px 16px 0 0',
                    boxShadow: '0 -4px 32px rgba(0,0,0,0.5)',
                    zIndex: 101,
                    maxHeight: '70vh',
                    display: 'flex', flexDirection: 'column',
                    animation: 'slideUp 0.25s ease-out',
                  }}
                >
                  {/* Handle bar */}
                  <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
                    <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border)' }} />
                  </div>

                  {/* Header: current player info */}
                  <div style={{
                    padding: '8px 20px 12px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                        交代対象 — スロット {slotIndex + 1}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={posTag(player.position)}>{player.position}</span>
                        <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>
                          {player.skipper_name}
                        </span>
                        <span style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 700 }}>
                          {overallCurrent}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => { setOppSwapOverlay(null); setOppChangingSlot(null); setOppOverlaySearch('') }}
                      style={{
                        background: 'none', border: 'none', color: 'var(--text-muted)',
                        fontSize: 22, cursor: 'pointer', padding: '4px 8px', lineHeight: 1,
                      }}
                    >
                      ✕
                    </button>
                  </div>

                  {/* Sub-header */}
                  <div style={{ padding: '8px 20px 4px', fontSize: 12, color: 'var(--text-secondary)', fontWeight: 700 }}>
                    {opponentMode === 'magic' ? '交代候補（全ポジション）' : `交代候補（${slotPos}）`}
                  </div>

                  {/* Search input */}
                  <div style={{ padding: '0 12px' }}>
                    <input
                      placeholder="選手名で検索..."
                      value={oppOverlaySearch}
                      onChange={e => setOppOverlaySearch(e.target.value)}
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        margin: '8px 0', padding: '8px 12px',
                        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
                        borderRadius: 8, color: 'var(--text-primary)', fontSize: 14,
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>

                  {/* Candidate list */}
                  <div style={{ overflowY: 'auto', flex: 1, padding: '0 12px 16px' }}>
                    {oppVisible.length === 0 && (
                      <div style={{ padding: 20, color: 'var(--text-muted)', textAlign: 'center', fontSize: 13 }}>
                        交代候補がいません
                      </div>
                    )}
                    {oppVisible.map(c => {
                      const ov = calcOverall(c)
                      return (
                        <div
                          key={c.id}
                          style={{ ...styles.playerListItem, marginBottom: 4 }}
                          onClick={() => handleOppOverlaySwap(c)}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-card-hover)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)' }}
                        >
                          <span style={posTag(c.position)}>{c.position}</span>
                          <span style={styles.playerName}>{c.skipper_name}</span>
                          <span style={styles.teamTag}>{c.team_name}</span>
                          <span style={styles.overallScore}>{ov}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </>
            )
          })()}
        </div>
      )}
    </div>
  )
}

export default TeamSelectPage
