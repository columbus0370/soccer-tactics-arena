# 🚀 デプロイガイド

## 概要

| 層 | サービス | 費用 | URL例 |
|----|---------|------|-------|
| フロントエンド | Vercel | 無料 | `https://soccer-tactics-arena.vercel.app` |
| バックエンド | Railway | 無料枠あり | `https://soccer-tactics-backend.railway.app` |

---

## Step 1: バックエンドを Railway にデプロイ

### 1-1. Railway セットアップ

1. https://railway.app にアクセス → GitHub ログイン
2. **New Project** → **Deploy from GitHub repo**
3. このリポジトリを選択
4. **Add Service** → **GitHub Repo** → Root Directory を `backend` に設定

### 1-2. 環境変数設定

Railway のサービス設定 → **Variables** タブで以下を追加:

```
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://your-frontend.vercel.app   ← Vercel のURL（後で設定）
```

### 1-3. Start Command 確認

`backend/package.json` の `start` スクリプトが `node src/index.js` であることを確認（すでに設定済み）。

### 1-4. デプロイ実行

Railway が自動でビルド・起動。`https://xxxx.railway.app` 形式のURLが発行される。

**動作確認:**
```
curl https://your-backend.railway.app/api/health
```

---

## Step 2: バックエンドの CORS 設定を本番URLに更新

`backend/src/index.js` の CORS 設定を更新:

```javascript
// 変更前（開発用）
const io = new Server(httpServer, {
  cors: { origin: 'http://localhost:3000', methods: ['GET', 'POST'] },
})
app.use(cors({ origin: 'http://localhost:3000' }))

// 変更後（本番 + 開発両対応）
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean)

const io = new Server(httpServer, {
  cors: { origin: ALLOWED_ORIGINS, methods: ['GET', 'POST'] },
})
app.use(cors({ origin: ALLOWED_ORIGINS }))
```

---

## Step 3: フロントエンドを Vercel にデプロイ

### 3-1. Vite の本番 API URL 設定

`frontend/.env.production` を作成:

```
VITE_API_URL=https://your-backend.railway.app
```

`frontend/src/api/gameApi.js` を更新:

```javascript
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
})
```

### 3-2. Vercel デプロイ

```bash
cd frontend
npm install -g vercel  # 初回のみ
vercel login
vercel --prod
```

または GitHub 連携:
1. https://vercel.com → **Import Project**
2. このリポジトリを選択
3. **Root Directory**: `frontend`
4. **Build Command**: `npm run build`
5. **Output Directory**: `dist`
6. **Environment Variables**: `VITE_API_URL = https://your-backend.railway.app`
7. **Deploy**

### 3-3. Railway の FRONTEND_URL を更新

Vercel で発行された URL を Railway の環境変数 `FRONTEND_URL` に設定して再デプロイ。

---

## 環境変数まとめ

### backend/.env（ローカル開発用）
```
PORT=5000
NODE_ENV=development
```

### Railway 環境変数（本番）
```
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://your-app.vercel.app
```

### frontend/.env.production
```
VITE_API_URL=https://your-backend.railway.app
```

---

## よくある問題

### CORS エラーが出る
→ Railway の `FRONTEND_URL` に正確な Vercel URL を設定しているか確認

### API 接続できない
→ `frontend/src/api/gameApi.js` の `baseURL` が正しい本番 URL になっているか確認

### players.json が見つからない
→ Railway のデプロイで `backend/data/players.json` が含まれているか確認（.gitignore に入っていないことを確認）
