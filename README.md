# ⚽ Soccer Tactics Arena

ターンベースのサッカー戦術シミュレーションゲーム。フォーメーションと戦術を選んでCPUと対戦。

## 🎮 ゲーム概要

- **選手**: 20クラブ・444名（PL 2025-26シーズン）
- **フォーメーション**: 5種類（4-3-3 / 4-2-4 / 5-3-2 / 3-5-2 / 4-4-2）
- **戦術**: 3種類（パス主導型 / ロングボール型 / サイド攻撃型）
- **難易度**: Easy / Normal / Hard
- **Originalチーム**: 全クラブから自由に選手を選択可能

## 🚀 ローカル起動

```bash
# バックエンド (ターミナル①)
cd backend && npm install && npm run dev

# フロントエンド (ターミナル②)
cd frontend && npm install && npm run dev
```

- フロントエンド: http://localhost:3000
- バックエンド:   http://localhost:5000

## 📁 プロジェクト構造

```
orefoot/
├── backend/
│   ├── src/
│   │   ├── engine/
│   │   │   ├── simulator.js      # 試合シミュレーション
│   │   │   ├── matchEvents.js    # イベント生成（10種類）
│   │   │   └── cpuGenerator.js   # CPU チーム生成
│   │   ├── routes/
│   │   │   ├── game.js           # /api/game/*
│   │   │   └── players.js        # /api/players/*
│   │   └── index.js              # Express + Socket.io サーバー
│   └── data/
│       └── players.json          # 選手データ（444名）
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── LobbyPage.jsx     # ロビー（難易度選択）
│       │   ├── TeamSelectPage.jsx# チーム・フォーメーション・選手選択
│       │   ├── MatchPage.jsx     # 試合シミュレーション画面
│       │   └── ResultPage.jsx    # リザルト（5タブ）
│       ├── components/
│       │   ├── PitchView.jsx     # SVGピッチ表示
│       │   └── PlayerCard.jsx    # 選手カード
│       └── api/
│           └── gameApi.js        # APIクライアント
└── docs/
    ├── soccer_game_requirements.md
    ├── game_detail_spec_v2.md
    ├── game_system_design.md
    └── phase2_design.md
```

## 🌐 デプロイ

詳細は [DEPLOYMENT.md](./DEPLOYMENT.md) を参照。

### フロントエンド → Vercel（推奨・無料）

```bash
cd frontend
npx vercel --prod
# または GitHub 連携で自動デプロイ
```

### バックエンド → Railway（推奨・無料枠あり）

1. https://railway.app でプロジェクト作成
2. GitHub リポジトリを接続
3. `backend/` ディレクトリをサービスとして追加
4. 環境変数 `PORT=5000`, `NODE_ENV=production` を設定

## 🔧 API エンドポイント

| Method | Path | 説明 |
|--------|------|------|
| GET | `/api/health` | ヘルスチェック |
| GET | `/api/players` | チーム一覧 |
| GET | `/api/players/:teamId` | チームの選手一覧 |
| GET | `/api/players/all-players` | 全選手一覧（444名） |
| GET | `/api/game/cpu-team?difficulty=` | CPU チーム生成 |
| POST | `/api/game/simulate` | 試合シミュレーション |

## 📊 イベントタイプ

試合中に生成されるイベント（10種類）:
`goal` / `pk_goal` / `pk_miss` / `pk_awarded` / `shot_on_target` / `shot_blocked` / `super_save` / `yellow_card` / `red_card` / `near_miss`
