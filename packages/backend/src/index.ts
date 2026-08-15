import express from 'express'
import { Server } from 'colyseus'
import { WebSocketServer } from 'ws'
import { createServer } from 'http'

const PORT = process.env.PORT || 3000

const app = express()
const httpServer = createServer(app)
const gameServer = new Server({
  server: httpServer,
})

app.get('/', (_req, res) => {
  res.send('Echoes of the Abyss - Server running')
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// TODO: Register game rooms
// gameServer.define("match", GameRoom)

httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
})
