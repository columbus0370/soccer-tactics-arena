import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
let playersData = null
try {
  playersData = JSON.parse(
    readFileSync(join(__dirname, '../../data/players.json'), 'utf-8')
  )
} catch {
  // fallback to generated players if file unavailable
}

const CPU_FORMATIONS = ['4-3-3', '4-2-4', '5-3-2', '3-5-2', '4-4-2']
const CPU_TACTICS = ['パス主導型', 'ロングボール型', 'サイド攻撃型']

const FORMATION_POSITIONS = {
  '4-3-3': ['GK','DF','DF','DF','DF','MF','MF','MF','FW','FW','FW'],
  '4-2-4': ['GK','DF','DF','DF','DF','MF','MF','FW','FW','FW','FW'],
  '5-3-2': ['GK','DF','DF','DF','DF','DF','MF','MF','MF','FW','FW'],
  '3-5-2': ['GK','DF','DF','DF','MF','MF','MF','MF','MF','FW','FW'],
  '4-4-2': ['GK','DF','DF','DF','DF','MF','MF','MF','MF','FW','FW'],
}

// 難易度別 pl_finish 範囲（1=優勝 20=最下位）
const FINISH_RANGES = {
  easy:   { min: 12, max: 20 },
  normal: { min: 5,  max: 16 },
  hard:   { min: 1,  max: 7  },
}

// 難易度別ステータス範囲（フォールバック用）
const DIFFICULTY_RANGES = {
  easy:   { min: 38, max: 62 },
  normal: { min: 55, max: 75 },
  hard:   { min: 72, max: 92 },
}

const CPU_NAMES = [
  'Marco Silva','Pedro Alvez','Kai Hoffmann','Luca Bianchi','James Walsh',
  'Antoine Blanc','Stefan Kovač','Ryo Tanaka','Carlos Vega','Omar Hassan',
  'Diego Morales','Finn Andersen','Yuki Sato','Lucas Petit','Ali Rashid',
  'Tomás Novák','Hiroshi Ito','Elias Berg','Mateo Cruz','Samuel Okafor',
  'Bruno Ferreira','Viktor Petrov','Jin-ho Park','Mehmet Yilmaz','Rafael Costa',
]

function randomStat(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function pickForPosition(pos, available, used) {
  // Try exact position first, then fallbacks
  const fallbacks = { GK: ['DF'], DF: ['MF'], MF: ['DF','FW'], FW: ['MF'] }
  const priorities = [pos, ...(fallbacks[pos] || [])]
  for (const p of priorities) {
    const pool = available.filter(pl => pl.position === p && !used.has(pl.id))
    if (pool.length > 0) return pool[Math.floor(Math.random() * pool.length)]
  }
  // last resort: any unused player
  const any = available.filter(pl => !used.has(pl.id))
  return any.length > 0 ? any[Math.floor(Math.random() * any.length)] : available[0]
}

export function generateCPUTeam(difficulty = 'normal') {
  const formation = CPU_FORMATIONS[Math.floor(Math.random() * CPU_FORMATIONS.length)]
  const tactic = CPU_TACTICS[Math.floor(Math.random() * CPU_TACTICS.length)]
  const positions = FORMATION_POSITIONS[formation]
  const difficultyLabel = { easy: 'イージー', normal: 'ノーマル', hard: 'ハード' }

  // ── 実チームデータを使用 ──────────────────────────────
  if (playersData?.teams?.length > 0) {
    const range = FINISH_RANGES[difficulty] || FINISH_RANGES.normal
    const eligible = playersData.teams.filter(
      t => t.pl_finish >= range.min && t.pl_finish <= range.max
    )
    const pool = eligible.length > 0 ? eligible : playersData.teams
    const team = pool[Math.floor(Math.random() * pool.length)]

    const used = new Set()
    const players = positions.map((pos, i) => {
      const picked = pickForPosition(pos, team.players, used)
        || team.players[i % team.players.length]
      used.add(picked.id)
      return {
        id: picked.id,
        skipper_name: picked.skipper_name,
        position: pos,
        stats: { ...picked.stats },
      }
    })

    return {
      teamId: team.team_id,
      teamName: team.team_name,
      formation,
      tactic,
      players,
      isCPU: true,
      difficulty,
      primary_color: team.primary_color || '#888888',
    }
  }

  // ── フォールバック：架空選手生成 ──────────────────────
  const statRange = DIFFICULTY_RANGES[difficulty] || DIFFICULTY_RANGES.normal
  const shuffled = [...CPU_NAMES].sort(() => Math.random() - 0.5)
  const players = positions.map((pos, i) => ({
    id: `CPU_${i.toString().padStart(2, '0')}`,
    skipper_name: shuffled[i % shuffled.length],
    position: pos,
    stats: {
      speed:     randomStat(statRange.min, statRange.max),
      shooting:  randomStat(statRange.min, statRange.max),
      passing:   randomStat(statRange.min, statRange.max),
      dribbling: randomStat(statRange.min, statRange.max),
      physical:  randomStat(statRange.min, statRange.max),
      defense:   randomStat(statRange.min, statRange.max),
    }
  }))

  return {
    teamId: `cpu_${difficulty}`,
    teamName: `CPU (${difficultyLabel[difficulty] || difficulty})`,
    formation,
    tactic,
    players,
    isCPU: true,
    difficulty,
  }
}
