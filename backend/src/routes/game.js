import { Router } from 'express'
import { simulateMatch } from '../engine/simulator.js'
import { generateCPUTeam } from '../engine/cpuGenerator.js'

const router = Router()

// GET /api/game/cpu-team?difficulty=normal
router.get('/cpu-team', (req, res) => {
  const difficulty = req.query.difficulty || 'normal'
  if (!['easy', 'normal', 'hard'].includes(difficulty)) {
    return res.status(400).json({ error: 'difficulty は easy / normal / hard のいずれかです' })
  }
  res.json(generateCPUTeam(difficulty))
})

// POST /api/game/simulate
router.post('/simulate', (req, res) => {
  const { player1, player2 } = req.body

  if (!player1 || !player2) {
    return res.status(400).json({ error: 'player1 と player2 のデータが必要です' })
  }

  const VALID_FORMATIONS = ['4-3-3', '4-2-4', '5-3-2', '3-5-2', '4-4-2']
  const VALID_TACTICS = ['パス主導型', 'ロングボール型', 'サイド攻撃型']

  for (const [key, p] of [['player1', player1], ['player2', player2]]) {
    if (!p.formation || !VALID_FORMATIONS.includes(p.formation)) {
      return res.status(400).json({ error: `${key}.formation が無効です。有効値: ${VALID_FORMATIONS.join(', ')}` })
    }
    if (!p.tactic || !VALID_TACTICS.includes(p.tactic)) {
      return res.status(400).json({ error: `${key}.tactic が無効です。有効値: ${VALID_TACTICS.join(', ')}` })
    }
  }

  // player1.players / player2.players が存在しない場合は空配列にフォールバック（後方互換性）
  if (!player1.players) player1.players = []
  if (!player2.players) player2.players = []

  const result = simulateMatch(player1, player2)
  res.json(result)
})

export default router
