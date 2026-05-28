# ⚽ Soccer Tactics Arena

**戦術で勝利を掴め。采配がすべてを決める。**

プレミアリーグ2025-26シーズンの実データを使ったサッカー戦術シミュレーションゲーム。
チーム・フォーメーション・選手を選んでCPUと対戦しよう。スマホ完全対応。

🎮 **[今すぐプレイ → soccer-tactics-arena.vercel.app](https://soccer-tactics-arena.vercel.app)**

---

## 📸 スクリーンショット

<table>
  <tr>
    <td align="center"><b>ロビー</b></td>
    <td align="center"><b>フォーメーション選択</b></td>
    <td align="center"><b>ラインナップ</b></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/01_lobby.png" width="220"/></td>
    <td><img src="docs/screenshots/02_formation.png" width="220"/></td>
    <td><img src="docs/screenshots/03_lineup.png" width="220"/></td>
  </tr>
  <tr>
    <td align="center"><b>試合中継</b></td>
    <td align="center"><b>試合結果</b></td>
    <td></td>
  </tr>
  <tr>
    <td><img src="docs/screenshots/04_match.png" width="220"/></td>
    <td><img src="docs/screenshots/05_result.png" width="220"/></td>
    <td></td>
  </tr>
</table>

---

## 🎮 ゲームの流れ

```
難易度選択 → チーム選択 → フォーメーション & 戦術 → ラインナップ → 試合 → リザルト
```

1. **難易度を選ぶ** — EASY / NORMAL / HARD
2. **チームを選ぶ** — PL20クラブ、またはオリジナルチーム（全クラブから自由選択）、✨ Magic Team（ポジション・重複制限なし）
3. **フォーメーション & 戦術を決める** — 5フォーメーション × 3戦術
4. **スターティング11を編成** — フィールドをタップして選手交代
5. **試合を観戦** — リアルタイムイベントログで試合展開を楽しむ
6. **リザルトを確認** — サマリー / チーム統計 / 選手パフォーマンス / タイムライン / 得点シーン

---

## ⚡ 主な機能

| カテゴリ | 内容 |
|----------|------|
| 🏟️ 選手データ | PL2025-26シーズン **20クラブ・444名** |
| 📊 フォーメーション | 4-3-3 / 4-2-4 / 5-3-2 / 3-5-2 / 4-4-2 |
| 🧠 戦術 | パス主導型 / ロングボール型 / サイド攻撃型 |
| 🤖 CPU難易度 | Easy（下位クラブ）/ Normal（中位）/ Hard（上位クラブ）|
| 🌟 オリジナルチーム | 全クラブから好きな選手を自由に11名選択 |
| ✨ Magic Team | ポジション不問・重複あり。ハーランド11人も可 |
| ⚽ イベント | ゴール / PK / イエロー・レッドカード / ビッグセーブ / ブロック など10種 |
| 📱 スマホ対応 | フィールドをタップして選手交代、モバイルファーストUI |
| 🏆 リザルト | 5タブ詳細結果 + 選手評価カラー（7段階） |

---

## 🚀 ローカル開発

```bash
# バックエンド (port 5000)
cd backend && npm install && npm run dev

# フロントエンド (port 3000)
cd frontend && npm install && npm run dev
```

### 環境変数

**backend/.env**
```
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

**frontend/.env**
```
VITE_API_URL=   # 空欄でOK（開発時はプロキシ経由）
```

---

## 🛠️ 技術スタック

| レイヤー | 技術 |
|----------|------|
| フロントエンド | React 18 + Vite 5 |
| バックエンド | Node.js + Express 4 + Socket.io 4 |
| デプロイ（フロント） | Vercel |
| デプロイ（バック） | Railway |
| データ | players.json（PL2025-26 444名） |

---

## 🌐 API

| Method | エンドポイント | 説明 |
|--------|---------------|------|
| GET | `/api/health` | ヘルスチェック |
| GET | `/api/players` | チーム一覧（20クラブ） |
| GET | `/api/players/:teamId` | チーム別選手一覧 |
| GET | `/api/players/all-players` | 全選手（444名） |
| GET | `/api/game/cpu-team?difficulty=` | CPUチーム生成 |
| POST | `/api/game/simulate` | 試合シミュレーション |

---

## 📁 プロジェクト構造

```
soccer-tactics-arena/
├── backend/
│   ├── src/
│   │   ├── engine/
│   │   │   ├── simulator.js      # 試合シミュレーション
│   │   │   ├── matchEvents.js    # イベント生成（10種）
│   │   │   └── cpuGenerator.js   # CPUチーム生成（実チームデータ使用）
│   │   └── routes/
│   │       ├── game.js
│   │       └── players.js
│   └── data/
│       └── players.json          # 選手データ（444名）
└── frontend/
    └── src/
        ├── pages/
        │   ├── LobbyPage.jsx
        │   ├── TeamSelectPage.jsx
        │   ├── MatchPage.jsx
        │   └── ResultPage.jsx
        └── components/
            ├── PitchView.jsx
            └── PlayerCard.jsx
```

---

## 🗺️ ロードマップ

- [ ] PvP オンライン対戦
- [ ] ユーザー認証 & グローバルランキング
- [ ] チーム編成プリセット保存
- [ ] バッジ・実績システム
- [ ] 試合介入（交代・フォーメーション変更）

---

## 📄 ライセンス

MIT
