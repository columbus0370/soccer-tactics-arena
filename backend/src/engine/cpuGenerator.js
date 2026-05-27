// 難易度別ステータス範囲
const DIFFICULTY_RANGES = {
  easy:   { min: 38, max: 62 },
  normal: { min: 55, max: 75 },
  hard:   { min: 72, max: 92 },
}

const CPU_FORMATIONS = ['4-3-3', '4-2-4', '5-3-2', '3-5-2', '4-4-2']
const CPU_TACTICS = ['パス主導型', 'ロングボール型', 'サイド攻撃型']

// フォーメーション → ポジション配列
const FORMATION_POSITIONS = {
  '4-3-3': ['GK','DF','DF','DF','DF','MF','MF','MF','FW','FW','FW'],
  '4-2-4': ['GK','DF','DF','DF','DF','MF','MF','FW','FW','FW','FW'],
  '5-3-2': ['GK','DF','DF','DF','DF','DF','MF','MF','MF','FW','FW'],
  '3-5-2': ['GK','DF','DF','DF','MF','MF','MF','MF','MF','FW','FW'],
  '4-4-2': ['GK','DF','DF','DF','DF','MF','MF','MF','MF','FW','FW'],
}

// CPU 選手名プール
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

export function generateCPUTeam(difficulty = 'normal') {
  const range = DIFFICULTY_RANGES[difficulty] || DIFFICULTY_RANGES.normal
  const formation = CPU_FORMATIONS[Math.floor(Math.random() * CPU_FORMATIONS.length)]
  const tactic = CPU_TACTICS[Math.floor(Math.random() * CPU_TACTICS.length)]
  const positions = FORMATION_POSITIONS[formation]

  const difficultyLabel = { easy: 'イージー', normal: 'ノーマル', hard: 'ハード' }

  // 名前をシャッフルして11人選ぶ
  const shuffled = [...CPU_NAMES].sort(() => Math.random() - 0.5)

  const players = positions.map((pos, i) => ({
    id: `CPU_${i.toString().padStart(2, '0')}`,
    skipper_name: shuffled[i % shuffled.length],
    position: pos,
    stats: {
      speed:     randomStat(range.min, range.max),
      shooting:  randomStat(range.min, range.max),
      passing:   randomStat(range.min, range.max),
      dribbling: randomStat(range.min, range.max),
      physical:  randomStat(range.min, range.max),
      defense:   randomStat(range.min, range.max),
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
