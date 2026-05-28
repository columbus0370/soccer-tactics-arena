import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import { simulateMatch, simulateFirstHalf, simulateSecondHalf } from '../engine/simulator.js'
import { generateCPUTeam } from '../engine/cpuGenerator.js'

const router = Router()

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null

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

  if (!Array.isArray(player1.players) || player1.players.length === 0) {
    return res.status(400).json({ error: 'player1.players は1人以上の選手が必要です' })
  }
  if (!Array.isArray(player2.players) || player2.players.length === 0) {
    return res.status(400).json({ error: 'player2.players は1人以上の選手が必要です' })
  }

  try {
    const result = simulateMatch(player1, player2)
    res.json(result)
  } catch (err) {
    console.error('simulateMatch error:', err)
    res.status(500).json({ error: '試合シミュレーション中にエラーが発生しました' })
  }
})

// POST /api/game/commentary
// Body: { home, away, score, result, events }
// Sends only key events (goals/red_card/pk_goal) to Claude to minimize tokens
router.post('/commentary', async (req, res) => {
  if (!anthropic) {
    return res.status(503).json({ error: 'ANTHROPIC_API_KEY が設定されていません' })
  }

  const { home, away, score, result, events = [] } = req.body
  if (!home || !away || !score) {
    return res.status(400).json({ error: 'home / away / score が必要です' })
  }

  // ── 重要イベントだけ抽出してトークンを節約 ──────────────
  const KEY_TYPES = new Set(['goal', 'pk_goal', 'red_card'])
  const keyEvents = events
    .filter(e => KEY_TYPES.has(e.type))
    .sort((a, b) => a.minute - b.minute)
    .map(e => {
      if (e.type === 'goal' || e.type === 'pk_goal') {
        const label = e.type === 'pk_goal' ? 'PK' : 'ゴール'
        return `${e.minute}' ${label} ${e.scorer}(${e.teamName})`
      }
      return `${e.minute}' 退場 ${e.player}(${e.teamName})`
    })
    .join(', ')

  const resultLabel =
    result === 'player1_win' ? `${home}の勝利` :
    result === 'player2_win' ? `${away}の勝利` : '引き分け'

  const userMsg = `${home} ${score.player1}-${score.player2} ${away} (${resultLabel})${keyEvents ? `\n${keyEvents}` : ''}`

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 380,
      system: 'あなたはサッカーの試合実況アナウンサーです。試合結果を6〜7文で、試合の流れ・ターニングポイント・印象的な場面・両チームの評価を含めて臨場感ある日本語で詳しく解説してください。',
      messages: [{ role: 'user', content: userMsg }],
    })
    res.json({ commentary: msg.content[0]?.text ?? '' })
  } catch (err) {
    console.error('commentary error:', err.message)
    res.status(500).json({ error: '解説の生成に失敗しました' })
  }
})

// POST /api/game/first-half
router.post('/first-half', (req, res) => {
  const { player1, player2 } = req.body
  if (!player1 || !player2) return res.status(400).json({ error: 'player1 と player2 が必要です' })
  if (!Array.isArray(player1.players) || player1.players.length === 0)
    return res.status(400).json({ error: 'player1.players が必要です' })
  if (!Array.isArray(player2.players) || player2.players.length === 0)
    return res.status(400).json({ error: 'player2.players が必要です' })
  try {
    res.json(simulateFirstHalf(player1, player2))
  } catch (err) {
    console.error('simulateFirstHalf error:', err)
    res.status(500).json({ error: '前半シミュレーション中にエラーが発生しました' })
  }
})

// POST /api/game/second-half
router.post('/second-half', (req, res) => {
  const { player1, player2, halftimeScore, p1ScoreHint } = req.body
  if (!player1 || !player2 || !halftimeScore)
    return res.status(400).json({ error: 'player1 / player2 / halftimeScore が必要です' })
  if (!Array.isArray(player1.players) || player1.players.length === 0)
    return res.status(400).json({ error: 'player1.players が必要です' })
  try {
    res.json(simulateSecondHalf(player1, player2, halftimeScore, p1ScoreHint ?? 50))
  } catch (err) {
    console.error('simulateSecondHalf error:', err)
    res.status(500).json({ error: '後半シミュレーション中にエラーが発生しました' })
  }
})

export default router
