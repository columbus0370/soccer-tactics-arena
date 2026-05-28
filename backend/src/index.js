import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import gameRoutes from './routes/game.js'
import playerRoutes from './routes/players.js'

const app = express()
const httpServer = createServer(app)

const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean)

function corsOrigin(origin, callback) {
  // オリジンなし（curl等）、許可リスト、vercel.appのプレビューURLはすべて許可
  if (!origin || ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.vercel.app')) {
    callback(null, true)
  } else {
    callback(new Error('CORS: origin not allowed'))
  }
}

const io = new Server(httpServer, {
  cors: { origin: corsOrigin, methods: ['GET', 'POST'] },
})

const PORT = process.env.PORT || 5000

// Middleware
app.use(cors({ origin: corsOrigin }))
app.use(express.json())

// Routes
app.use('/api/game', gameRoutes)
app.use('/api/players', playerRoutes)

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Socket.io
io.on('connection', (socket) => {
  console.log('クライアント接続:', socket.id)
  socket.on('disconnect', () => {
    console.log('クライアント切断:', socket.id)
  })
})

httpServer.listen(PORT, () => {
  console.log(`サーバー起動: http://localhost:${PORT}`)
})
