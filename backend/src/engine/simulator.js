import { generateMatchEvents } from './matchEvents.js'

// フォーメーション相性テーブル
const FORMATION_MATRIX = {
  '4-3-3': { '4-3-3': 50, '4-2-4': 45, '5-3-2': 55, '3-5-2': 50, '4-4-2': 50 },
  '4-2-4': { '4-3-3': 55, '4-2-4': 50, '5-3-2': 45, '3-5-2': 60, '4-4-2': 55 },
  '5-3-2': { '4-3-3': 45, '4-2-4': 55, '5-3-2': 50, '3-5-2': 48, '4-4-2': 52 },
  '3-5-2': { '4-3-3': 50, '4-2-4': 40, '5-3-2': 52, '3-5-2': 50, '4-4-2': 48 },
  '4-4-2': { '4-3-3': 50, '4-2-4': 45, '5-3-2': 48, '3-5-2': 52, '4-4-2': 50 },
}

// 戦術相性ボーナス
const TACTIC_BONUS = {
  'パス主導型':     { 'ロングボール型': 5,  'サイド攻撃型': 0, 'パス主導型': 0  },
  'ロングボール型': { 'パス主導型': 5,      'サイド攻撃型': -2, 'ロングボール型': 0 },
  'サイド攻撃型':   { 'パス主導型': 2,      'ロングボール型': 3, 'サイド攻撃型': 0  },
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function getFormationAdvantage(f1, f2) {
  return FORMATION_MATRIX[f1]?.[f2] ?? 50
}

function getTacticBonus(t1, t2) {
  return TACTIC_BONUS[t1]?.[t2] ?? 0
}

function simulateScore(_winnerStrength) {
  // 強い方が1〜3点、弱い方が0〜2点
  const winnerGoals = randomInt(1, 3)
  const loserGoals = randomInt(0, Math.max(0, winnerGoals - 1))
  return { winner: winnerGoals, loser: loserGoals }
}

// ポジション別乗数でチーム強さを計算（0〜100スケール）
export function calculateTeamStrength(players) {
  if (!players || players.length === 0) return 0

  const scores = players.map(p => {
    const s = p.stats || {}
    switch (p.position) {
      case 'GK': return (s.defense || 0) * 1.5
      case 'DF': return (s.defense || 0) * 1.5 + (s.physical || 0) * 0.8
      case 'MF': return (s.passing || 0) * 1.5 + (s.physical || 0) * 0.9
      case 'FW': return (s.shooting || 0) * 1.5 + (s.speed || 0) * 1.3
      default:   return (s.passing || 0) + (s.physical || 0)
    }
  })

  const avg = scores.reduce((sum, v) => sum + v, 0) / scores.length
  // GK最大 = 100*1.5=150, FW最大 = 100*1.5+100*1.3=280 → 正規化基準として150を使用
  return Math.min(100, avg / 1.5)
}

function calculateMVP(events, player1) {
  if (!events || events.length === 0) {
    // ゴールなし → player1 の最高総合値の選手
    const players = player1.players || []
    if (players.length === 0) return null
    const best = players.reduce((best, p) => {
      const s = p.stats || {}
      const total = Object.values(s).reduce((sum, v) => sum + v, 0)
      const bestTotal = Object.values(best.stats || {}).reduce((sum, v) => sum + v, 0)
      return total > bestTotal ? p : best
    })
    return {
      id: best.id,
      skipper_name: best.skipper_name,
      position: best.position,
      goals: 0,
      rating: parseFloat((6.0 + Math.random() * 1.5).toFixed(1)),
    }
  }

  // ゴール数カウント
  const goalCount = {}
  const playerMap = {}

  for (const event of events) {
    if (event.type === 'goal' && event.scorerId) {
      goalCount[event.scorerId] = (goalCount[event.scorerId] || 0) + 1
      if (!playerMap[event.scorerId]) {
        playerMap[event.scorerId] = {
          id: event.scorerId,
          skipper_name: event.scorer,
        }
      }
    }
  }

  if (Object.keys(goalCount).length === 0) {
    // ゴールはあるがscorerId不明の場合
    const players = player1.players || []
    if (players.length === 0) return null
    const best = players[0]
    return {
      id: best.id,
      skipper_name: best.skipper_name,
      position: best.position,
      goals: 0,
      rating: parseFloat((6.0 + Math.random() * 1.5).toFixed(1)),
    }
  }

  // 最多ゴールの選手
  const topId = Object.entries(goalCount).sort((a, b) => b[1] - a[1])[0][0]
  const topGoals = goalCount[topId]

  // ポジションを player1/player2 から検索
  const allPlayers = [
    ...(player1.players || []),
  ]
  const found = allPlayers.find(p => p.id === topId)
  const position = found ? found.position : 'FW'

  return {
    id: topId,
    skipper_name: playerMap[topId].skipper_name,
    position,
    goals: topGoals,
    rating: parseFloat((7.0 + Math.min(2.5, topGoals * 0.8) + Math.random() * 0.5).toFixed(1)),
  }
}

export function simulateMatch(player1, player2) {
  // 後方互換性: players が未定義なら空配列
  if (!player1.players) player1.players = []
  if (!player2.players) player2.players = []

  const { formation: f1, tactic: t1 } = player1
  const { formation: f2, tactic: t2 } = player2

  const formationScore = getFormationAdvantage(f1, f2)
  const tacticBonus = getTacticBonus(t1, t2)
  const randomFactor = randomInt(-20, 20)

  // チーム強度差をスコアへ反映
  const p1Strength = calculateTeamStrength(player1.players)
  const p2Strength = calculateTeamStrength(player2.players)
  const strengthDiff = clamp((p1Strength - p2Strength) * 0.3, -15, 15)

  const p1Score = formationScore + tacticBonus + randomFactor + strengthDiff

  let result, score
  if (p1Score > 50) {
    result = 'player1_win'
    const s = simulateScore(p1Score)
    score = { player1: s.winner, player2: s.loser }
  } else if (p1Score < 50) {
    result = 'player2_win'
    const s = simulateScore(100 - p1Score)
    score = { player1: s.loser, player2: s.winner }
  } else {
    result = 'draw'
    const g = randomInt(0, 2)
    score = { player1: g, player2: g }
  }

  const events = generateMatchEvents(player1, player2, result, score)
  const mvp = calculateMVP(events, player1)

  return {
    result,
    score,
    events,
    mvp,
    stats: {
      player1: {
        shots: randomInt(8, 15),
        shots_on_target: randomInt(3, 7),
        possession: Math.min(80, Math.max(20, 50 + (p1Score - 50))),
        pass_accuracy: randomInt(55, 85),
        tackles: randomInt(12, 25),
      },
      player2: {
        shots: randomInt(8, 15),
        shots_on_target: randomInt(3, 7),
        possession: 100 - Math.min(80, Math.max(20, 50 + (p1Score - 50))),
        pass_accuracy: randomInt(55, 85),
        tackles: randomInt(12, 25),
      },
    },
    points: {
      player1: result === 'player1_win' ? 30 : result === 'draw' ? 15 : 5,
      player2: result === 'player2_win' ? 30 : result === 'draw' ? 15 : 5,
    },
  }
}
