import { Router } from 'express'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const playersData = JSON.parse(
  readFileSync(join(__dirname, '../../data/players.json'), 'utf-8')
)

const router = Router()

// GET /api/players - 全チーム一覧
router.get('/', (_req, res) => {
  const teams = playersData.teams.map((t) => ({
    team_id: t.team_id,
    team_name: t.team_name,
    pl_finish: t.pl_finish,
    primary_color: t.primary_color,
  }))
  res.json({ meta: playersData.meta, teams })
})

// GET /api/players/all-players - 全チームの全選手
router.get('/all-players', (_req, res) => {
  const all = playersData.teams.flatMap(t =>
    t.players.map(p => ({
      ...p,
      team_id: t.team_id,
      team_name: t.team_name,
      primary_color: t.primary_color,
    }))
  )
  res.json({ players: all, total: all.length })
})

// GET /api/players/:teamId - チームの選手一覧
router.get('/:teamId', (req, res) => {
  const team = playersData.teams.find((t) => t.team_id === req.params.teamId)
  if (!team) return res.status(404).json({ error: 'チームが見つかりません' })
  res.json(team)
})

export default router
