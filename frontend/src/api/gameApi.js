import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'
const api = axios.create({ baseURL: BASE })

export const getTeams = () => api.get('/players').then(r => r.data)
export const getTeamPlayers = (teamId) => api.get(`/players/${teamId}`).then(r => r.data)
export const getAllPlayers = () => api.get('/players/all-players').then(r => r.data)
export const getCPUTeam = (difficulty) => api.get(`/game/cpu-team?difficulty=${difficulty}`).then(r => r.data)
export const simulateMatch = (player1, player2) => api.post('/game/simulate', { player1, player2 }).then(r => r.data)

export const simulateFirstHalf = (player1, player2) =>
  api.post('/game/first-half', { player1, player2 }).then(r => r.data)

export const simulateSecondHalf = (player1, player2, halftimeScore, p1ScoreHint) =>
  api.post('/game/second-half', { player1, player2, halftimeScore, p1ScoreHint }).then(r => r.data)
