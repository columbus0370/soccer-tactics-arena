// 得点シーン説明文パターン
const GOAL_DESCRIPTIONS = [
  'ペナルティエリア内への鋭いスルーパスから、右足で冷静にゴール右隅へ流し込んだ。',
  '左サイドからのドリブル突破後、角度のないところから豪快にゴール上段へ叩き込んだ。',
  'コーナーキックからのヘディングシュート。ニアポストに走り込みDFをブロックして決めた。',
  'ミドルシュート。相手GKがはじいたこぼれ球を素早く押し込んだ。',
  '右サイドのクロスを中央で合わせた。完璧なタイミングのボレーシュート。',
  'ワンツーパスで相手DFを崩し、GKとの1対1を冷静に右足で決めた。',
  'フリーキックから壁の隙間を通す精密なシュートでゴール左隅に突き刺さった。',
  'カウンターアタック。スピードで相手DFを置き去りにし、GKをかわしてゴールへ押し込んだ。',
]

const DESCRIPTIONS = {
  shot_on_target: [
    '{player}が強烈なミドルシュート！GK{gk}が渾身のセーブで弾き出した。',
    '{player}のヘディングシュートをGK{gk}がダイビングキャッチ。',
    'ペナルティエリア内から{player}が巻き足シュート、GK{gk}がギリギリで反応した。',
    '{player}の鋭いシュートをGK{gk}がポスト際でかき出した。',
  ],
  shot_blocked: [
    '{blocker}が{shooter}のシュートを身を挺してブロック！ピンチを救った。',
    'ゴール前での混戦から{shooter}がシュートも{blocker}がコースに入りブロック。',
    '{blocker}の好ポジションがゴールを守った。{shooter}のシュートを足でクリア。',
  ],
  super_save: [
    'GK{gk}がビッグセーブ！ゴールラインで掻き出した超反応セーブ。',
    'まさかのワンハンドセーブ！GK{gk}が上隅への強烈なシュートを指先で弾いた。',
    'GK{gk}がポストに救われながらもリバウンドをがっちりキャッチ。',
  ],
  yellow_card: [
    '{player}が激しいタックルでイエローカード。',
    'ファールを犯した{player}に主審がイエローカードを提示。',
    '{player}が遅延行為でイエローカードを受けた。',
  ],
  red_card: [
    '{player}に2枚目のイエロー、レッドカードで退場！チームは10人に。',
    'レッドカード！{player}の危険なタックルで一発退場。',
  ],
  pk_awarded: [
    'ペナルティエリア内で{fouledBy}が{player}を倒した！PKの判定。',
    'VAR確認の末、{player}へのファールでPKが与えられた。',
    '{player}が相手GKと交錯、主審はPKを指さした。',
  ],
  pk_miss: [
    'GK{gk}がPKをセーブ！{player}のシュートを読み切った。',
    '{player}のPKはクロスバーを直撃！絶好機を逃した。',
  ],
  near_miss: [
    '{player}のシュートはポストを直撃！惜しくもゴールならず。',
    '{player}がフリーでシュートも枠の上を越えてしまった。',
    'ゴール前フリーの{player}が左足で合わせたがサイドネットに外れた。',
  ],
}

function fillTemplate(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] || '?')
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function getGK(players) {
  const gks = players.filter(p => p.position === 'GK')
  return gks[0] || players[0]
}

function getDFs(players) {
  return players.filter(p => p.position === 'DF')
}

function getFWsMFs(players) {
  return players.filter(p => p.position === 'FW' || p.position === 'MF')
}

// 得点者を選ぶ（FW優先）
function pickScorer(players) {
  const fws = players.filter(p => p.position === 'FW')
  const mfs = players.filter(p => p.position === 'MF')
  const candidates = [...fws, ...fws, ...mfs]  // FWを2倍の重みで
  if (candidates.length === 0) return players[0]
  return candidates[Math.floor(Math.random() * candidates.length)]
}

// アシストを選ぶ（MF/FWから得点者以外）
function pickAssist(players, scorerId) {
  const candidates = players.filter(p => p.id !== scorerId && (p.position === 'MF' || p.position === 'FW'))
  if (candidates.length === 0) return null
  return Math.random() < 0.7 ? candidates[Math.floor(Math.random() * candidates.length)] : null
}

function simulatePK(attackTeam, defTeam) {
  const kicker = pickScorer(attackTeam.players || [])
  const gk = getGK(defTeam.players || [])
  const shootingAvg = kicker ? (kicker.stats?.shooting || 70) : 70
  const successRate = 0.55 + (shootingAvg / 100) * 0.20  // 55%〜75%
  const success = Math.random() < successRate
  return { kicker, gk, success }
}

export function generateMatchEvents(player1, player2, result, score, startMinute = 1, endMinute = 90) {
  // player1 = { teamName, players: [{id, skipper_name, position, stats:{...}}], formation, tactic }
  // result = 'player1_win' | 'player2_win' | 'draw'
  // score = { player1: 2, player2: 1 }

  const events = []
  const usedMinutes = new Set()

  function getUniqMinute(min, max) {
    let m, tries = 0
    do {
      m = Math.floor(Math.random() * (max - min + 1)) + min
      tries++
    } while (usedMinutes.has(m) && tries < 50)
    usedMinutes.add(m)
    return m
  }

  function addEvent(evt) { events.push(evt) }

  // ─── ゴール ───────────────────────────────────────
  // player1 のゴール
  for (let i = 0; i < score.player1; i++) {
    const minute = getUniqMinute(Math.max(5, startMinute), Math.min(88, endMinute))
    const scorer = pickScorer(player1.players || [])
    const assist = scorer ? pickAssist(player1.players || [], scorer.id) : null
    addEvent({
      minute,
      type: 'goal',
      team: 'player1',
      teamName: player1.teamName || 'Player 1',
      scorer: scorer ? scorer.skipper_name : 'Unknown',
      scorerId: scorer ? scorer.id : null,
      assist: assist ? assist.skipper_name : null,
      description: GOAL_DESCRIPTIONS[Math.floor(Math.random() * GOAL_DESCRIPTIONS.length)],
    })
  }

  // player2 のゴール
  for (let i = 0; i < score.player2; i++) {
    const minute = getUniqMinute(Math.max(5, startMinute), Math.min(88, endMinute))
    const scorer = pickScorer(player2.players || [])
    const assist = scorer ? pickAssist(player2.players || [], scorer.id) : null
    addEvent({
      minute,
      type: 'goal',
      team: 'player2',
      teamName: player2.teamName || 'Player 2',
      scorer: scorer ? scorer.skipper_name : 'Unknown',
      scorerId: scorer ? scorer.id : null,
      assist: assist ? assist.skipper_name : null,
      description: GOAL_DESCRIPTIONS[Math.floor(Math.random() * GOAL_DESCRIPTIONS.length)],
    })
  }

  // ─── PK ───────────────────────────────────────────
  // 15%の確率で一方のチームにPK
  if (Math.random() < 0.15) {
    const pkTeam = Math.random() < 0.5 ? 'player1' : 'player2'
    const attackP = pkTeam === 'player1' ? player1 : player2
    const defendP = pkTeam === 'player1' ? player2 : player1
    const minute = getUniqMinute(Math.max(10, startMinute), Math.min(88, endMinute))
    const foulVictim = pickScorer(attackP.players || [])
    const dfsForFoul = getDFs(defendP.players || [])
    const fouler = dfsForFoul.length > 0
      ? dfsForFoul[Math.floor(Math.random() * dfsForFoul.length)]
      : (defendP.players || [])[0]

    addEvent({
      minute,
      type: 'pk_awarded',
      team: pkTeam,
      teamName: attackP.teamName || pkTeam,
      player: foulVictim ? foulVictim.skipper_name : 'Unknown',
      fouledBy: fouler ? fouler.skipper_name : 'Unknown',
      description: fillTemplate(
        DESCRIPTIONS.pk_awarded[Math.floor(Math.random() * DESCRIPTIONS.pk_awarded.length)],
        {
          player: foulVictim ? foulVictim.skipper_name : 'Unknown',
          fouledBy: fouler ? fouler.skipper_name : 'Unknown',
        }
      ),
    })

    const { kicker, gk, success } = simulatePK(attackP, defendP)
    const pkMin = Math.min(endMinute, minute + 1)
    usedMinutes.add(pkMin)

    if (success) {
      addEvent({
        minute: pkMin,
        type: 'pk_goal',
        team: pkTeam,
        teamName: attackP.teamName || pkTeam,
        scorer: kicker ? kicker.skipper_name : 'Unknown',
        scorerId: kicker ? kicker.id : null,
        assist: null,
        description: `${kicker ? kicker.skipper_name : 'キッカー'}がPKを右隅に突き刺した！GK${gk ? gk.skipper_name : ''}は逆を突かれた。`,
      })
    } else {
      addEvent({
        minute: pkMin,
        type: 'pk_miss',
        team: pkTeam,
        teamName: attackP.teamName || pkTeam,
        player: kicker ? kicker.skipper_name : 'Unknown',
        gkName: gk ? gk.skipper_name : 'Unknown',
        description: fillTemplate(
          DESCRIPTIONS.pk_miss[Math.floor(Math.random() * DESCRIPTIONS.pk_miss.length)],
          {
            player: kicker ? kicker.skipper_name : 'Unknown',
            gk: gk ? gk.skipper_name : 'Unknown',
          }
        ),
      })
    }
  }

  // ─── 枠内シュート ───────────────────────────────────
  for (const [team, p, opp] of [['player1', player1, player2], ['player2', player2, player1]]) {
    const count = Math.floor(Math.random() * 3) + 2  // 2〜4
    const fwsMfs = getFWsMFs(p.players || [])
    for (let i = 0; i < count; i++) {
      const minute = getUniqMinute(Math.max(3, startMinute), Math.min(90, endMinute))
      const shooter = fwsMfs.length > 0
        ? fwsMfs[Math.floor(Math.random() * fwsMfs.length)]
        : (p.players || [])[0]
      const gk = getGK(opp.players || [])
      const tmpl = DESCRIPTIONS.shot_on_target[Math.floor(Math.random() * DESCRIPTIONS.shot_on_target.length)]
      addEvent({
        minute,
        type: 'shot_on_target',
        team,
        teamName: p.teamName || team,
        player: shooter ? shooter.skipper_name : 'Unknown',
        gkName: gk ? gk.skipper_name : 'Unknown',
        description: fillTemplate(tmpl, {
          player: shooter ? shooter.skipper_name : 'Unknown',
          gk: gk ? gk.skipper_name : 'Unknown',
        }),
      })
    }
  }

  // ─── シュートブロック ────────────────────────────────
  for (const [team, p, opp] of [['player1', player1, player2], ['player2', player2, player1]]) {
    const count = Math.floor(Math.random() * 3) + 1  // 1〜3
    const fwsMfs = getFWsMFs(p.players || [])
    const dfs = getDFs(opp.players || [])
    for (let i = 0; i < count; i++) {
      const minute = getUniqMinute(Math.max(3, startMinute), Math.min(90, endMinute))
      const shooter = fwsMfs.length > 0
        ? fwsMfs[Math.floor(Math.random() * fwsMfs.length)]
        : (p.players || [])[0]
      const blocker = dfs.length > 0
        ? dfs[Math.floor(Math.random() * dfs.length)]
        : (opp.players || [])[0]
      const tmpl = DESCRIPTIONS.shot_blocked[Math.floor(Math.random() * DESCRIPTIONS.shot_blocked.length)]
      addEvent({
        minute,
        type: 'shot_blocked',
        team,
        teamName: p.teamName || team,
        shooter: shooter ? shooter.skipper_name : 'Unknown',
        blocker: blocker ? blocker.skipper_name : 'Unknown',
        description: fillTemplate(tmpl, {
          shooter: shooter ? shooter.skipper_name : 'Unknown',
          blocker: blocker ? blocker.skipper_name : 'Unknown',
        }),
      })
    }
  }

  // ─── スーパーセーブ ──────────────────────────────────
  for (const [team, p] of [['player1', player1], ['player2', player2]]) {
    if (Math.random() < 0.5) {  // 50%で発生
      const minute = getUniqMinute(Math.max(3, startMinute), Math.min(90, endMinute))
      const gk = getGK(p.players || [])
      const tmpl = DESCRIPTIONS.super_save[Math.floor(Math.random() * DESCRIPTIONS.super_save.length)]
      addEvent({
        minute,
        type: 'super_save',
        team,
        teamName: p.teamName || team,
        gkName: gk ? gk.skipper_name : 'Unknown',
        description: fillTemplate(tmpl, { gk: gk ? gk.skipper_name : 'Unknown' }),
      })
    }
  }

  // ─── イエローカード ──────────────────────────────────
  const yellowCards = {}  // playerId → count（レッドカード管理用）
  for (const [team, p] of [['player1', player1], ['player2', player2]]) {
    const count = Math.floor(Math.random() * 4)  // 0〜3
    let redGiven = false
    for (let i = 0; i < count; i++) {
      const minute = getUniqMinute(Math.max(10, startMinute), Math.min(88, endMinute))
      const candidates = (p.players || []).filter(x => x.position !== 'GK')
      if (candidates.length === 0) continue
      const player = candidates[Math.floor(Math.random() * candidates.length)]
      const tmpl = DESCRIPTIONS.yellow_card[Math.floor(Math.random() * DESCRIPTIONS.yellow_card.length)]
      addEvent({
        minute,
        type: 'yellow_card',
        team,
        teamName: p.teamName || team,
        player: player ? player.skipper_name : 'Unknown',
        description: fillTemplate(tmpl, { player: player ? player.skipper_name : 'Unknown' }),
      })

      if (player && player.id) {
        yellowCards[player.id] = (yellowCards[player.id] || 0) + 1
      }

      // 2枚目イエロー → レッドカード、または独立した5%確率
      const isSecondYellow = player && player.id && yellowCards[player.id] >= 2
      const isRandomRed = !redGiven && Math.random() < 0.05
      if ((isSecondYellow || isRandomRed) && !redGiven) {
        const redMinute = Math.min(90, minute + randomInt(1, 5))
        const tmplR = DESCRIPTIONS.red_card[Math.floor(Math.random() * DESCRIPTIONS.red_card.length)]
        addEvent({
          minute: redMinute,
          type: 'red_card',
          team,
          teamName: p.teamName || team,
          player: player ? player.skipper_name : 'Unknown',
          description: fillTemplate(tmplR, { player: player ? player.skipper_name : 'Unknown' }),
        })
        redGiven = true
        break  // 1チーム1枚まで
      }
    }
  }

  // ─── ニアミス ────────────────────────────────────────
  for (const [team, p] of [['player1', player1], ['player2', player2]]) {
    const nearMissCount = Math.floor(Math.random() * 3)  // 0〜2
    const fwsMfs = getFWsMFs(p.players || [])
    for (let i = 0; i < nearMissCount; i++) {
      const minute = getUniqMinute(Math.max(3, startMinute), Math.min(90, endMinute))
      const shooter = fwsMfs.length > 0
        ? fwsMfs[Math.floor(Math.random() * fwsMfs.length)]
        : (p.players || [])[0]
      const tmpl = DESCRIPTIONS.near_miss[Math.floor(Math.random() * DESCRIPTIONS.near_miss.length)]
      addEvent({
        minute,
        type: 'near_miss',
        team,
        teamName: p.teamName || team,
        player: shooter ? shooter.skipper_name : 'Unknown',
        description: fillTemplate(tmpl, { player: shooter ? shooter.skipper_name : 'Unknown' }),
      })
    }
  }

  // 分数でソート
  events.sort((a, b) => a.minute - b.minute)

  return events
}
