# 📱 セッション引き継ぎドキュメント
# Soccer Tactics Arena — スマホ Claude Code 向け

**最終更新**: 2026-05-28  
**ステータス**: Phase 2 実装完了、デプロイ待ち

---

## ✅ 現在の完成状態

### 実装済み機能

| 機能 | 状態 |
|------|------|
| ロビー画面（難易度選択） | ✅ ゲーム風ダークテーマ |
| チーム選択（20クラブ） | ✅ |
| Originalチーム（全クラブから選手選択） | ✅ |
| フォーメーション選択（5種類） | ✅ SVGピッチ表示付き |
| 戦術選択（3種類） | ✅ |
| ラインナップ選択 | ✅ ポジション/チームフィルタ付き |
| 試合シミュレーション | ✅ リアルタイムアニメーション |
| 試合介入（最大2回） | ✅ |
| イベント表示（10種類） | ✅ goal/PK/card/save/block等 |
| リザルト画面（5タブ） | ✅ サマリー/統計/選手/タイムライン/得点 |
| CPU難易度（easy/normal/hard） | ✅ 選手能力値に差あり |
| Vite ビルド | ✅ エラーなし |

### 技術スタック
- **Frontend**: React 18 + Vite 5 (port 3000)
- **Backend**: Node.js v26 + Express 4 + Socket.io 4 (port 5000)
- **選手データ**: 20チーム 444名（PL 2025-26）

---

## 📁 リポジトリ構造

```
orefoot/
├── backend/            ← Node.js API サーバー
│   ├── src/engine/     ← ゲームロジック
│   ├── src/routes/     ← REST API
│   └── data/           ← players.json（444名）
├── frontend/           ← React SPA
│   └── src/
│       ├── pages/      ← 4画面
│       ├── components/ ← PitchView, PlayerCard
│       └── api/        ← gameApi.js
└── docs/               ← 仕様書類
```

---

## 🎯 次にやること（デプロイ）

### 最優先: 本番デプロイ

**詳細手順は [DEPLOYMENT.md](./DEPLOYMENT.md) 参照**

1. **Railway**（バックエンド）
   - https://railway.app → GitHub連携
   - Root Directory: `backend`
   - 環境変数: `PORT=5000`, `NODE_ENV=production`, `FRONTEND_URL=<Vercelのurl>`

2. **Vercel**（フロントエンド）
   - https://vercel.com → GitHub連携
   - Root Directory: `frontend`
   - 環境変数: `VITE_API_URL=<Railwayのurl>`
   - **注意**: デプロイ前に `frontend/src/api/gameApi.js` のbaseURLを環境変数から読むよう修正が必要

3. **CORS設定更新**（`backend/src/index.js`）
   - 本番フロントエンドURLをCORS許可リストに追加

### CORS 修正（デプロイ前に必須）

`backend/src/index.js` の以下2箇所を変更:
```javascript
// 変更前
cors: { origin: 'http://localhost:3000' }

// 変更後
const origins = ['http://localhost:3000', process.env.FRONTEND_URL].filter(Boolean)
cors: { origin: origins }
```

### API URL 修正（デプロイ前に必須）

`frontend/src/api/gameApi.js`:
```javascript
// 変更前
const api = axios.create({ baseURL: '/api' })

// 変更後
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api'
})
```

---

## 🔧 ローカル開発コマンド

```bash
# バックエンド起動
cd backend && npm run dev   # → http://localhost:5000

# フロントエンド起動
cd frontend && npm run dev  # → http://localhost:3000
```

---

## 💡 Phase 3 以降のアイデア

- [ ] PvP対戦（Socket.io リアルタイム対戦）
- [ ] ユーザー認証（JWT / ゲストログイン）
- [ ] グローバルランキング
- [ ] チーム編成プリセット保存（最大5つ）
- [ ] モバイルUI最適化
- [ ] バッジ・実績システム
