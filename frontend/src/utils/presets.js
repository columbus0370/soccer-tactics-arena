const STORAGE_PREFIX = 'soccer_tactics__preset__v1__'
const SCHEMA_VERSION = 1

function isValidPreset(data) {
  return (
    data !== null &&
    typeof data === 'object' &&
    data.version === SCHEMA_VERSION &&
    typeof data.teamId === 'string' &&
    typeof data.formation === 'string' &&
    typeof data.tactic === 'string' &&
    Array.isArray(data.lineup) &&
    data.lineup.length === 11
  )
}

export function savePreset(teamId, preset) {
  try {
    const data = { ...preset, version: SCHEMA_VERSION, teamId, savedAt: new Date().toISOString() }
    localStorage.setItem(STORAGE_PREFIX + teamId, JSON.stringify(data))
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

export function loadPreset(teamId) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + teamId)
    if (!raw) return null
    const data = JSON.parse(raw)
    return isValidPreset(data) ? data : null
  } catch {
    return null
  }
}

export function deletePreset(teamId) {
  localStorage.removeItem(STORAGE_PREFIX + teamId)
}

export function listPresets() {
  const results = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (!key?.startsWith(STORAGE_PREFIX)) continue
    try {
      const data = JSON.parse(localStorage.getItem(key))
      if (isValidPreset(data)) results.push(data)
    } catch { /* skip */ }
  }
  return results.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt))
}

export function hasPreset(teamId) {
  return loadPreset(teamId) !== null
}

// lineup内の選手IDをallPlayersと照合し、欠損スロットをnullに置き換える
export function resolveLineup(lineup, allPlayers) {
  const byId = new Map(allPlayers.map(p => [p.id, p]))
  let missing = 0
  const resolved = lineup.map(snapshot => {
    if (snapshot === null) return null
    const found = byId.get(snapshot.id)
    if (!found) { missing++; return null }
    return found
  })
  return { resolved, missing }
}
