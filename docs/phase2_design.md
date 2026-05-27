# Phase 2 設計ドキュメント

> orefoot - サッカー戦術ゲーム  
> 作成日: 2026-05-27  
> フェーズ: Phase 2（シングルプレイヤー MVP）

---

## 1. コンポーネント構成図

```
App
├── Router
│   ├── LobbyPage
│   │   ├── DifficultySelector
│   │   └── StartButton
│   ├── TeamSelectPage
│   │   ├── StepIndicator          # ステップ1〜4の進捗表示
│   │   ├── Step1_TeamSelect       # チーム選択
│   │   │   └── TeamCard
│   │   ├── Step2_FormationSelect  # フォーメーション選択
│   │   │   ├── FormationOption
│   │   │   └── PitchPreview
│   │   ├── Step3_TacticSelect     # 戦術選択
│   │   │   └── TacticCard
│   │   ├── Step4_LineupConfirm    # ラインナップ確認
│   │   │   ├── PitchDisplay
│   │   │   └── PlayerMarker
│   │   └── NavigationButtons
│   ├── MatchPage
│   │   ├── ScoreBoard             # スコア・試合分数表示
│   │   ├── PitchDisplay           # ピッチ描画（共通コンポーネント）
│   │   │   └── PlayerMarker
│   │   ├── EventFeed              # 試合イベントログ
│   │   │   └── EventItem
│   │   └── SimulationController   # 開始/一時停止ボタン
│   └── ResultPage
│       ├── ResultHeader           # 勝敗・スコア表示
│       ├── TabBar                 # タブ切替
│       ├── Tab_Summary            # 試合サマリー
│       ├── Tab_Stats              # 統計情報
│       ├── Tab_Events             # 全イベントログ
│       └── ReturnToLobbyButton
└── GlobalComponents
    ├── LoadingSpinner
    └── ErrorBoundary
```

---

## 2. 画面遷移フロー

```
LobbyPage
  │  渡す state: { difficulty: 'easy' | 'normal' | 'hard' }
  ▼
TeamSelectPage (step 1〜4)
  │  渡す state:
  │    {
  │      difficulty: string,
  │      selectedTeam: Team,
  │      formation: Formation,
  │      tactic: Tactic,
  │      lineup: Player[]
  │    }
  ▼
MatchPage
  │  渡す state:
  │    {
  │      matchResult: MatchResult,   # simulate API レスポンス全体
  │      playerTeam: Team,
  │      opponentTeam: Team,
  │      formation: Formation,
  │      tactic: Tactic
  │    }
  ▼
ResultPage
  │  渡す state:
  │    {
  │      matchResult: MatchResult,
  │      playerTeam: Team,
  │      difficulty: string
  │    }
  ▼
LobbyPage  # ← ReturnToLobbyButton で state リセット
```

### 遷移の実装方針

- `react-router-dom` v6 の `useNavigate` + `state` オプションを使用
- 各ページは `useLocation().state` で受け取り
- state が存在しない場合（直接URLアクセス等）は LobbyPage へリダイレクト

---

## 3. ステート設計

### LobbyPage

| state 名 | 型 | 初期値 | 説明 |
|---|---|---|---|
| `difficulty` | `'easy' \| 'normal' \| 'hard'` | `'normal'` | 選択中の難易度 |

```typescript
const [difficulty, setDifficulty] = useState<Difficulty>('normal');
```

---

### TeamSelectPage

| state 名 | 型 | 初期値 | 説明 |
|---|---|---|---|
| `step` | `1 \| 2 \| 3 \| 4` | `1` | 現在のステップ番号 |
| `selectedTeam` | `Team \| null` | `null` | Step1 で選んだチーム |
| `formation` | `Formation \| null` | `null` | Step2 で選んだフォーメーション |
| `tactic` | `Tactic \| null` | `null` | Step3 で選んだ戦術 |
| `lineup` | `Player[]` | `[]` | Step4 で確定したラインナップ |

```typescript
const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
const [formation, setFormation] = useState<Formation | null>(null);
const [tactic, setTactic] = useState<Tactic | null>(null);
const [lineup, setLineup] = useState<Player[]>([]);
```

---

### MatchPage

| state 名 | 型 | 初期値 | 説明 |
|---|---|---|---|
| `gameMinute` | `number` | `0` | 現在のゲーム内分数（0〜90） |
| `displayScore` | `{ home: number, away: number }` | `{ home: 0, away: 0 }` | 現在表示中のスコア |
| `visibleEvents` | `MatchEvent[]` | `[]` | 表示済みのイベント一覧 |
| `isSimulating` | `boolean` | `false` | アニメーション実行中かどうか |
| `matchResult` | `MatchResult \| null` | `null` | API から取得した試合結果全体 |

```typescript
const [gameMinute, setGameMinute] = useState(0);
const [displayScore, setDisplayScore] = useState({ home: 0, away: 0 });
const [visibleEvents, setVisibleEvents] = useState<MatchEvent[]>([]);
const [isSimulating, setIsSimulating] = useState(false);
const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
```

---

### ResultPage

| state 名 | 型 | 初期値 | 説明 |
|---|---|---|---|
| `activeTab` | `'summary' \| 'stats' \| 'events'` | `'summary'` | 現在表示中のタブ |

```typescript
const [activeTab, setActiveTab] = useState<TabType>('summary');
```

---

## 4. API コントラクト

### ベース URL

```
http://localhost:8000/api
```

---

### GET /teams

チーム一覧取得

**Request**
```
GET /api/teams
```

**Response 200**
```json
{
  "teams": [
    {
      "id": "japan",
      "name": "日本代表",
      "country": "JPN",
      "overall": 72,
      "attack": 70,
      "defense": 73,
      "players": [
        {
          "id": "player_001",
          "name": "鈴木一郎",
          "position": "FW",
          "number": 9,
          "overall": 78,
          "speed": 82,
          "shooting": 75,
          "passing": 70,
          "defense": 40,
          "stamina": 80
        }
      ]
    }
  ]
}
```

---

### GET /formations

フォーメーション一覧取得

**Request**
```
GET /api/formations
```

**Response 200**
```json
{
  "formations": [
    {
      "id": "4-3-3",
      "label": "4-3-3",
      "description": "攻撃的なフォーメーション。ウィングが高い位置を取る。",
      "positions": [
        { "role": "GK", "slot": 0 },
        { "role": "LB", "slot": 1 },
        { "role": "CB", "slot": 2 },
        { "role": "CB", "slot": 3 },
        { "role": "RB", "slot": 4 },
        { "role": "CM", "slot": 5 },
        { "role": "CM", "slot": 6 },
        { "role": "CM", "slot": 7 },
        { "role": "LW", "slot": 8 },
        { "role": "ST", "slot": 9 },
        { "role": "RW", "slot": 10 }
      ]
    }
  ]
}
```

---

### GET /tactics

戦術一覧取得

**Request**
```
GET /api/tactics
```

**Response 200**
```json
{
  "tactics": [
    {
      "id": "tiki-taka",
      "name": "ティキタカ",
      "description": "細かいパスワークで支配するスタイル",
      "bonuses": {
        "possession": +10,
        "passingAccuracy": +8,
        "pressingIntensity": -5
      }
    },
    {
      "id": "counter-attack",
      "name": "カウンターアタック",
      "description": "守備から素早く攻撃に転じるスタイル",
      "bonuses": {
        "counterSpeed": +15,
        "defense": +5,
        "possession": -10
      }
    },
    {
      "id": "high-press",
      "name": "ハイプレス",
      "description": "高い位置から積極的にボールを奪うスタイル",
      "bonuses": {
        "pressingIntensity": +15,
        "ballRecovery": +10,
        "stamina": -8
      }
    }
  ]
}
```

---

### POST /match/simulate

試合シミュレーション実行

**Request**
```json
{
  "playerTeam": {
    "id": "japan",
    "formation": "4-3-3",
    "tactic": "tiki-taka",
    "lineup": ["player_001", "player_002", "..."]  // 11人分のplayer id
  },
  "opponentTeam": {
    "id": "brazil"
  },
  "difficulty": "normal"
}
```

**Response 200**
```json
{
  "matchId": "match_20260527_001",
  "finalScore": {
    "home": 2,
    "away": 1
  },
  "result": "win",  // "win" | "draw" | "loss"
  "events": [
    {
      "id": "evt_001",
      "minute": 23,
      "type": "goal",       // "goal" | "yellowCard" | "redCard" | "substitution" | "save" | "miss"
      "team": "home",       // "home" | "away"
      "playerId": "player_001",
      "playerName": "鈴木一郎",
      "description": "右サイドからのクロスに合わせてゴール！",
      "scoreAfter": { "home": 1, "away": 0 }
    },
    {
      "id": "evt_002",
      "minute": 45,
      "type": "goal",
      "team": "away",
      "playerId": "opp_player_010",
      "playerName": "ネイマール",
      "description": "フリーキックから直接ゴール",
      "scoreAfter": { "home": 1, "away": 1 }
    }
  ],
  "stats": {
    "home": {
      "possession": 58,
      "shots": 14,
      "shotsOnTarget": 6,
      "passes": 432,
      "passAccuracy": 87,
      "fouls": 11,
      "yellowCards": 1,
      "redCards": 0,
      "corners": 7,
      "offsides": 3
    },
    "away": {
      "possession": 42,
      "shots": 9,
      "shotsOnTarget": 4,
      "passes": 312,
      "passAccuracy": 79,
      "fouls": 14,
      "yellowCards": 2,
      "redCards": 0,
      "corners": 4,
      "offsides": 2
    }
  },
  "playerRatings": [
    {
      "playerId": "player_001",
      "playerName": "鈴木一郎",
      "rating": 8.2,
      "goals": 1,
      "assists": 0
    }
  ]
}
```

**Response 400**
```json
{
  "error": "INVALID_LINEUP",
  "message": "ラインナップに11人が必要です"
}
```

**Response 500**
```json
{
  "error": "SIMULATION_FAILED",
  "message": "試合シミュレーションに失敗しました"
}
```

---

## 5. CSS デザインシステム

### カラーパレット

```css
:root {
  /* Primary - ピッチグリーン系 */
  --color-primary-900: #064e3b;
  --color-primary-800: #065f46;
  --color-primary-700: #047857;
  --color-primary-600: #059669;
  --color-primary-500: #10b981;  /* メインブランドカラー */
  --color-primary-400: #34d399;
  --color-primary-300: #6ee7b7;
  --color-primary-200: #a7f3d0;
  --color-primary-100: #d1fae5;

  /* Accent - アクセント（ゴールイエロー） */
  --color-accent-500: #f59e0b;
  --color-accent-400: #fbbf24;
  --color-accent-300: #fcd34d;

  /* Danger - レッドカード・敗北 */
  --color-danger-600: #dc2626;
  --color-danger-500: #ef4444;
  --color-danger-300: #fca5a5;

  /* Neutral - UI ベース */
  --color-neutral-950: #0a0a0a;
  --color-neutral-900: #171717;
  --color-neutral-800: #262626;
  --color-neutral-700: #404040;
  --color-neutral-600: #525252;
  --color-neutral-400: #a3a3a3;
  --color-neutral-200: #e5e5e5;
  --color-neutral-100: #f5f5f5;
  --color-neutral-50:  #fafafa;

  /* Semantic */
  --color-bg:          var(--color-neutral-950);
  --color-surface:     var(--color-neutral-900);
  --color-surface-2:   var(--color-neutral-800);
  --color-border:      var(--color-neutral-700);
  --color-text:        var(--color-neutral-100);
  --color-text-muted:  var(--color-neutral-400);
  --color-success:     var(--color-primary-500);
  --color-warning:     var(--color-accent-500);
  --color-error:       var(--color-danger-500);
}
```

---

### タイポグラフィ

```css
:root {
  /* Font Family */
  --font-sans:  'Noto Sans JP', 'Inter', system-ui, sans-serif;
  --font-mono:  'JetBrains Mono', 'Fira Code', monospace;
  --font-score: 'Oswald', 'Anton', var(--font-sans);  /* スコアボード用 */

  /* Font Size */
  --text-xs:   0.75rem;   /*  12px */
  --text-sm:   0.875rem;  /*  14px */
  --text-base: 1rem;      /*  16px */
  --text-lg:   1.125rem;  /*  18px */
  --text-xl:   1.25rem;   /*  20px */
  --text-2xl:  1.5rem;    /*  24px */
  --text-3xl:  1.875rem;  /*  30px */
  --text-4xl:  2.25rem;   /*  36px */
  --text-5xl:  3rem;      /*  48px */  /* スコア表示用 */

  /* Font Weight */
  --font-normal:   400;
  --font-medium:   500;
  --font-semibold: 600;
  --font-bold:     700;
  --font-black:    900;

  /* Line Height */
  --leading-tight:  1.25;
  --leading-normal: 1.5;
  --leading-loose:  1.75;
}
```

---

### スペーシング

```css
:root {
  --space-1:  0.25rem;   /*  4px */
  --space-2:  0.5rem;    /*  8px */
  --space-3:  0.75rem;   /* 12px */
  --space-4:  1rem;      /* 16px */
  --space-5:  1.25rem;   /* 20px */
  --space-6:  1.5rem;    /* 24px */
  --space-8:  2rem;      /* 32px */
  --space-10: 2.5rem;    /* 40px */
  --space-12: 3rem;      /* 48px */
  --space-16: 4rem;      /* 64px */
  --space-20: 5rem;      /* 80px */
  --space-24: 6rem;      /* 96px */
}
```

---

### ボーダー・シャドウ・角丸

```css
:root {
  /* Border Radius */
  --radius-sm:   0.25rem;
  --radius-md:   0.5rem;
  --radius-lg:   0.75rem;
  --radius-xl:   1rem;
  --radius-full: 9999px;

  /* Box Shadow */
  --shadow-sm:  0 1px 2px rgba(0,0,0,0.5);
  --shadow-md:  0 4px 6px rgba(0,0,0,0.5);
  --shadow-lg:  0 10px 15px rgba(0,0,0,0.5);
  --shadow-glow-green: 0 0 20px rgba(16,185,129,0.4);
  --shadow-glow-gold:  0 0 20px rgba(245,158,11,0.4);

  /* Transition */
  --transition-fast:   150ms ease;
  --transition-normal: 250ms ease;
  --transition-slow:   400ms ease;
}
```

---

### コンポーネントスタイル定義

#### ボタン

```css
/* Primary Button */
.btn-primary {
  background: var(--color-primary-500);
  color: white;
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-md);
  font-weight: var(--font-semibold);
  font-size: var(--text-base);
  border: none;
  cursor: pointer;
  transition: background var(--transition-fast);
}
.btn-primary:hover { background: var(--color-primary-400); }
.btn-primary:disabled { background: var(--color-neutral-700); cursor: not-allowed; }

/* Secondary Button */
.btn-secondary {
  background: transparent;
  color: var(--color-primary-400);
  padding: var(--space-3) var(--space-6);
  border-radius: var(--radius-md);
  font-weight: var(--font-semibold);
  border: 1px solid var(--color-primary-500);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.btn-secondary:hover {
  background: var(--color-primary-900);
}
```

#### カード

```css
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: var(--space-6);
}
.card:hover {
  border-color: var(--color-primary-500);
  box-shadow: var(--shadow-glow-green);
}
.card.selected {
  border-color: var(--color-primary-400);
  background: var(--color-primary-900);
  box-shadow: var(--shadow-glow-green);
}
```

#### スコアボード

```css
.scoreboard {
  font-family: var(--font-score);
  font-size: var(--text-5xl);
  font-weight: var(--font-black);
  color: white;
  letter-spacing: 0.05em;
  text-shadow: var(--shadow-glow-gold);
}
```

---

## 6. ピッチ表示設計

ピッチは `position: relative` なコンテナ内に、選手を `position: absolute` で配置する。  
座標は左上を `(0%, 0%)` とし、**left / top のパーセンテージ**で指定。

### 座標マッピング規則

- `left`: ピッチの横位置（0% = 左端, 50% = 中央, 100% = 右端）
- `top`: ピッチの縦位置（0% = 自陣ゴール前, 100% = 敵陣ゴール前）

選手マーカーは自身の中心が座標に来るよう `transform: translate(-50%, -50%)` を適用。

---

### フォーメーション別座標マップ

#### 4-3-3

```typescript
const formations = {
  "4-3-3": [
    { role: "GK",  left: "50%", top: "8%"  },
    { role: "LB",  left: "15%", top: "25%" },
    { role: "CB",  left: "35%", top: "22%" },
    { role: "CB",  left: "65%", top: "22%" },
    { role: "RB",  left: "85%", top: "25%" },
    { role: "LCM", left: "20%", top: "50%" },
    { role: "CM",  left: "50%", top: "45%" },
    { role: "RCM", left: "80%", top: "50%" },
    { role: "LW",  left: "15%", top: "75%" },
    { role: "ST",  left: "50%", top: "82%" },
    { role: "RW",  left: "85%", top: "75%" },
  ],

  "4-4-2": [
    { role: "GK",  left: "50%", top: "8%"  },
    { role: "LB",  left: "15%", top: "25%" },
    { role: "CB",  left: "35%", top: "22%" },
    { role: "CB",  left: "65%", top: "22%" },
    { role: "RB",  left: "85%", top: "25%" },
    { role: "LM",  left: "15%", top: "52%" },
    { role: "LCM", left: "38%", top: "48%" },
    { role: "RCM", left: "62%", top: "48%" },
    { role: "RM",  left: "85%", top: "52%" },
    { role: "ST",  left: "35%", top: "80%" },
    { role: "ST",  left: "65%", top: "80%" },
  ],

  "3-5-2": [
    { role: "GK",  left: "50%", top: "8%"  },
    { role: "CB",  left: "25%", top: "23%" },
    { role: "CB",  left: "50%", top: "20%" },
    { role: "CB",  left: "75%", top: "23%" },
    { role: "LWB", left: "10%", top: "48%" },
    { role: "LCM", left: "30%", top: "50%" },
    { role: "CM",  left: "50%", top: "46%" },
    { role: "RCM", left: "70%", top: "50%" },
    { role: "RWB", left: "90%", top: "48%" },
    { role: "ST",  left: "35%", top: "80%" },
    { role: "ST",  left: "65%", top: "80%" },
  ],

  "4-2-3-1": [
    { role: "GK",  left: "50%", top: "8%"  },
    { role: "LB",  left: "15%", top: "25%" },
    { role: "CB",  left: "35%", top: "22%" },
    { role: "CB",  left: "65%", top: "22%" },
    { role: "RB",  left: "85%", top: "25%" },
    { role: "LDM", left: "35%", top: "42%" },
    { role: "RDM", left: "65%", top: "42%" },
    { role: "LAM", left: "20%", top: "62%" },
    { role: "CAM", left: "50%", top: "60%" },
    { role: "RAM", left: "80%", top: "62%" },
    { role: "ST",  left: "50%", top: "82%" },
  ],

  "3-4-3": [
    { role: "GK",  left: "50%", top: "8%"  },
    { role: "CB",  left: "25%", top: "23%" },
    { role: "CB",  left: "50%", top: "20%" },
    { role: "CB",  left: "75%", top: "23%" },
    { role: "LM",  left: "12%", top: "52%" },
    { role: "LCM", left: "36%", top: "48%" },
    { role: "RCM", left: "64%", top: "48%" },
    { role: "RM",  left: "88%", top: "52%" },
    { role: "LW",  left: "18%", top: "78%" },
    { role: "ST",  left: "50%", top: "83%" },
    { role: "RW",  left: "82%", top: "78%" },
  ],
}
```

---

## 7. 試合アニメーション設計

### 概要

試合は合計 **実時間30秒** で 90分間を表現する。

```
実時間 1秒 = ゲーム内 3分
実時間 30秒 = ゲーム内 90分
```

### タイマーロジック

```typescript
const REAL_DURATION_MS = 30_000;   // 実時間 30秒
const GAME_MINUTES = 90;            // ゲーム内 90分
const TICK_INTERVAL_MS = 100;       // 100ms ごとに更新

// ゲーム内分数への変換
const toGameMinute = (elapsedMs: number): number =>
  Math.floor((elapsedMs / REAL_DURATION_MS) * GAME_MINUTES);
```

### 実装例（useMatchSimulation カスタムフック）

```typescript
function useMatchSimulation(matchResult: MatchResult) {
  const [gameMinute, setGameMinute] = useState(0);
  const [displayScore, setDisplayScore] = useState({ home: 0, away: 0 });
  const [visibleEvents, setVisibleEvents] = useState<MatchEvent[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const navigate = useNavigate();

  const startSimulation = useCallback(() => {
    setIsSimulating(true);
    const startTime = Date.now();

    const tick = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const currentMinute = toGameMinute(elapsed);

      setGameMinute(Math.min(currentMinute, 90));

      // 現在分数までのイベントを表示
      const newEvents = matchResult.events.filter(
        (e) => e.minute <= currentMinute
      );
      setVisibleEvents(newEvents);

      // スコア更新
      const latestGoals = newEvents.filter((e) => e.type === 'goal');
      setDisplayScore({
        home: latestGoals.filter((e) => e.team === 'home').length,
        away: latestGoals.filter((e) => e.team === 'away').length,
      });

      // 90分到達 → 2秒後にリザルト遷移
      if (elapsed >= REAL_DURATION_MS) {
        clearInterval(tick);
        setGameMinute(90);
        setIsSimulating(false);

        setTimeout(() => {
          navigate('/result', {
            state: { matchResult, /* ... */ },
          });
        }, 2_000);  // 2秒後に遷移
      }
    }, TICK_INTERVAL_MS);

    return () => clearInterval(tick);
  }, [matchResult, navigate]);

  return { gameMinute, displayScore, visibleEvents, isSimulating, startSimulation };
}
```

### イベント発火タイミング

| イベント種別 | 発火条件 |
|---|---|
| ゴール | `event.minute <= currentGameMinute` |
| イエローカード | `event.minute <= currentGameMinute` |
| レッドカード | `event.minute <= currentGameMinute` |
| セーブ / ミス | `event.minute <= currentGameMinute` |
| ハーフタイム表示 | `currentGameMinute === 45`（一度のみ） |
| 試合終了表示 | `currentGameMinute === 90` |

### アニメーション後のリザルト遷移シーケンス

```
gameMinute: 90 到達
  └─ isSimulating: false にセット
  └─ "試合終了" 演出を表示（2秒間）
       └─ setTimeout(2000ms)
            └─ navigate('/result', { state: matchResult })
```

---

## 8. Phase 3 以降の課題

### 8.1 PvP 実装の設計考慮事項

Phase 2 のシングルプレイヤー実装を PvP に拡張する際の設計上の注意点:

- **チーム選択の排他制御**: 同一チームを複数プレイヤーが選択できないよう、選択中のチームを PENDING 状態として管理する仕組みが必要
- **対戦相手マッチング**: ランダムマッチングかフレンド対戦かでフローが分岐。ロビー待ち受け状態の UI を設計に含める
- **シミュレーション同期**: PvP ではサーバー側でシミュレーションを実行し、結果のみを両プレイヤーに同時配信する必要がある
- **タイムアウト処理**: 相手が準備完了しない場合の強制開始 / キャンセル処理を定義すること

### 8.2 ソケット通信の設計

WebSocket（Socket.IO）を用いたリアルタイム通信の設計:

```
クライアント A  <──WebSocket──>  サーバー  <──WebSocket──>  クライアント B

主要イベント:
  matchmaking:join      # マッチング待機列に追加
  matchmaking:matched   # 対戦相手が見つかった
  match:ready           # 両者の準備完了
  match:start           # 試合開始（結果データを同時配信）
  match:event           # 試合イベントのリアルタイム配信（オプション）
  match:result          # 試合結果配信
  room:disconnect       # 切断時の処理
```

**実装方針**:
- バックエンドは FastAPI + `python-socketio` または Node.js + `socket.io` で実装
- 接続ルームは `matchId` ベースで管理
- 再接続時は `matchId` + `playerId` で状態を復元

### 8.3 ランキングシステムの構想

**レーティング方式**: Elo レーティング（1500 を基準値として採用）

| 要素 | 内容 |
|---|---|
| 初期レーティング | 1500 |
| 勝利時の加算 | 相手レーティングに応じて +10〜+32 |
| 敗北時の減算 | 相手レーティングに応じて -10〜-32 |
| シーズン制 | 3ヶ月ごとにリセット（ソフトリセット: 中央値方向に圧縮） |

**ランクティア**:
```
ブロンズ   : 0    〜 1199
シルバー   : 1200 〜 1399
ゴールド   : 1400 〜 1599
プラチナ   : 1600 〜 1799
ダイヤモンド: 1800 〜 1999
チャンピオン: 2000 〜
```

**データベース設計（追加テーブル）**:
```sql
-- ランキングテーブル
CREATE TABLE player_rankings (
  player_id   TEXT PRIMARY KEY,
  rating      INTEGER DEFAULT 1500,
  wins        INTEGER DEFAULT 0,
  losses      INTEGER DEFAULT 0,
  draws       INTEGER DEFAULT 0,
  season      INTEGER DEFAULT 1,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 対戦履歴テーブル（PvP）
CREATE TABLE match_history (
  match_id      TEXT PRIMARY KEY,
  player1_id    TEXT NOT NULL,
  player2_id    TEXT NOT NULL,
  winner_id     TEXT,              -- NULL = 引き分け
  score_p1      INTEGER,
  score_p2      INTEGER,
  rating_delta  INTEGER,           -- player1 のレーティング変動
  played_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 変更履歴

| 日付 | バージョン | 内容 |
|---|---|---|
| 2026-05-27 | 1.0.0 | Phase 2 設計ドキュメント初版作成 |
