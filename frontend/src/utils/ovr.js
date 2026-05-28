// Position-weighted OVR calculation
// Gives realistic ratings by weighting stats relevant to each position

const WEIGHTS = {
  GK: { defense: 0.50, physical: 0.20, passing: 0.15, speed: 0.15, shooting: 0.00, dribbling: 0.00 },
  DF: { defense: 0.35, physical: 0.25, speed: 0.20, passing: 0.10, dribbling: 0.05, shooting: 0.05 },
  MF: { passing: 0.30, dribbling: 0.20, physical: 0.15, speed: 0.15, defense: 0.10, shooting: 0.10 },
  FW: { shooting: 0.35, dribbling: 0.25, speed: 0.20, physical: 0.10, passing: 0.07, defense: 0.03 },
}

export function calcPlayerOVR(player) {
  const s = player?.stats
  if (!s) return 0
  const w = WEIGHTS[player.position] || WEIGHTS.MF
  return Math.round(Object.entries(w).reduce((sum, [stat, weight]) => sum + (s[stat] || 0) * weight, 0))
}

export function calcTeamOVR(players) {
  if (!players || players.length === 0) return 0
  return Math.round(players.reduce((sum, p) => sum + calcPlayerOVR(p), 0) / players.length)
}
