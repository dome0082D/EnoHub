const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const bcrypt = require('bcrypt');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// --- CONNESSIONE DATABASE ---
const MONGO_URI = process.env.MONGO_URI || 'IL_TUO_LINK_ATLAS';
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Connesso a MongoDB Atlas'))
    .catch(err => console.error('❌ Errore Auth DB (Verifica password!):', err.message));

// --- SCHEMI DATI ---
const User = mongoose.model('User', new mongoose.Schema({
    nome: String, email: { type: String, unique: true }, password: { type: String },
    tipo: String, bio: { type: String, default: "Membro EnoHub" }
}));

const Message = mongoose.model('Message', new mongoose.Schema({
    from: String, to: String, fromName: String, text: String, time: { type: Date, default: Date.now }
}));

const Media = mongoose.model('Media', new mongoose.Schema({
    ownerId: String, url: String, name: String, type: String, date: { type: Date, default: Date.now }
}));

app.use(cors()); app.use(express.json()); app.use(express.static('public'));
fs.ensureDirSync('public/uploads/media');

const upload = multer({ storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads/media'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
})});

// --- API AUTH ---
app.post('/api/register', async (req, res) => {
    try {
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const newUser = new User({ ...req.body, password: hashedPassword });
        await newUser.save(); res.json({ success: true });
    } catch (e) { res.status(500).json({ success: false, error: "Email già in uso." }); }
});

app.post('/api/login', async (req, res) => {
    const user = await User.findOne({ email: req.body.email });
    if (user && await bcrypt.compare(req.body.password, user.password)) res.json({ success: true, user });
    else res.status(401).json({ success: false });
});

app.put('/api/user/:id', async (req, res) => {
    const updated = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, user: updated });
});

app.get('/api/users', async (req, res) => res.json(await User.find({}, 'nome tipo bio')));

// --- API MEDIA ---
app.post('/api/upload', upload.single('file'), async (req, res) => {
    const media = new Media({ ownerId: req.body.ownerId, url: '/uploads/media/'+req.file.filename, name: req.file.originalname, type: req.file.mimetype });
    await media.save(); res.json(media);
});

app.get('/api/media', async (req, res) => res.json(await Media.find()));

app.delete('/api/media/:id', async (req, res) => {
    const item = await Media.findById(req.params.id);
    if(item) { fs.removeSync(path.join(__dirname, 'public', item.url)); await Media.findByIdAndDelete(req.params.id); }
    res.json({ success: true });
});

// --- CHAT REAL-TIME (ARCHIVIO 2 MESI) ---
io.on('connection', (socket) => {
    socket.on('join', (userId) => socket.join(userId));
    
    socket.on('get_history', async ({ me, to }) => {
        const limit = new Date(); limit.setMonth(limit.getMonth() - 2);
        const history = await Message.find({ 
            $or:[{from:me,to:to},{from:to,to:me}], 
            time:{$gte:limit} 
        }).sort({time:1});
        socket.emit('chat_history', history);
    });

    socket.on('send_msg', async (data) => {
        const newMsg = new Message(data); await newMsg.save();
        io.to(data.to).emit('new_msg', newMsg);
    });
});

server.listen(process.env.PORT || 3000, () => console.log('🚀 EnoHub Enterprise Live'));
