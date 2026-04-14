const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3000;
const SECRET_KEY = 'vinum_elite_2026_secret';

const USERS_FILE = path.join(__dirname, 'database/users.json');
const CHATS_FILE = path.join(__dirname, 'database/chats.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const readJson = (file) => {
    try { return JSON.parse(fs.readFileSync(file, 'utf-8')); } 
    catch (e) { return []; }
};
const writeJson = (file, data) => fs.writeFileSync(file, JSON.stringify(data, null, 2));

// API Login
app.post('/api/login', async (req, res) => {
    const users = readJson(USERS_FILE);
    const user = users.find(u => u.email === req.body.email);
    if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
        return res.status(401).json({ success: false, error: "Credenziali non valide." });
    }
    const token = jwt.sign({ id: user.id }, SECRET_KEY, { expiresIn: '24h' });
    const { password, ...userSafe } = user;
    res.json({ success: true, token, user: userSafe });
});

// Chat Real-time
io.on('connection', (socket) => {
    socket.on('join', (userId) => socket.join(userId));
    socket.on('private_message', (data) => {
        const chats = readJson(CHATS_FILE);
        chats.push({ ...data, timestamp: new Date() });
        writeJson(CHATS_FILE, chats);
        io.to(data.destinatarioId).emit('new_message', data);
    });
});

server.listen(PORT, () => {
    console.log(`🚀 ENOHUB LIVE: http://localhost:${PORT}`);
    if (!fs.existsSync('database')) fs.mkdirSync('database');
});
