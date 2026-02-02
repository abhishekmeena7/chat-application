import dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import mongoose from 'mongoose';
import User from './model/users.js';
import Message from './model/message.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow same-origin or non-CORS requests (no origin) and explicitly allowed origins
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 204
};

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(cors(corsOptions));
// Handle preflight requests for all routes
app.options('*', cors(corsOptions));
app.use(express.json());

// ---------------- DATABASE SETUP ----------------

const mongoUri = process.env.MONGO_URI;
if (mongoUri) {
  mongoose
    .connect(mongoUri)
    .then(() => console.log('MongoDB connected'))
    .catch(err => {
      console.error('MongoDB connection error:', err.message);
    });
} else {
  console.warn('MONGO_URI not set. Running with in-memory fallback for users.');
}

// Initialize GridFS bucket after Mongo connection opens
let gridfsBucket = null;
if (mongoUri) {
  mongoose.connection.on('open', () => {
    try {
      gridfsBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
      console.log('GridFS bucket initialized');
    } catch (err) {
      console.error('Failed to initialize GridFS:', err.message);
    }
  });
}

// ---------------- UPLOAD SETUP ----------------

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

app.use('/uploads', express.static(uploadsDir));

// Use memory storage; save to GridFS when DB is configured.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

// ---------------- IN-MEMORY DATA (messages only) ----------------
const onlineUsers = {};        // socketId -> user
const userSockets = {};        // userId -> Set(socketIds)
const messages = [];

// ---------------- AUTH & USERS APIs (Mongo-backed when available) ----------------

app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    if (!mongoUri) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const user = new User({ username, password });
    await user.save();
    res.json({ user: { id: user._id.toString(), username: user.username, avatar: user.username[0].toUpperCase() } });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    if (!mongoUri) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const user = await User.findOne({ username, password });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    res.json({ user: { id: user._id.toString(), username: user.username, avatar: user.username[0].toUpperCase() } });
  } catch (err) {
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const { currentUserId } = req.query;

    if (!mongoUri) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    const filter = {};
    if (currentUserId && mongoose.Types.ObjectId.isValid(currentUserId)) {
      filter._id = { $ne: currentUserId };
    }
    const users = await User.find(filter).select('username');
    const mapped = users.map(u => ({
      id: u._id.toString(),
      username: u.username,
      avatar: u.username?.[0]?.toUpperCase() || 'U',
      isOnline: !!userSockets[u._id.toString()]
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users: ' + err.message });
  }
});

app.get('/api/messages/:u1/:u2', async (req, res) => {
  const { u1, u2 } = req.params;
  try {
    if (!mongoUri) {
      return res.json(
        messages.filter(
          m =>
            (m.senderId === u1 && m.receiverId === u2) ||
            (m.senderId === u2 && m.receiverId === u1)
        )
      );
    }

    const docs = await Message.find({
      $or: [
        { senderId: u1, receiverId: u2 },
        { senderId: u2, receiverId: u1 }
      ]
    }).sort({ timestamp: 1 });

    const mapped = docs.map(d => ({
      id: d._id.toString(),
      senderId: d.senderId,
      receiverId: d.receiverId,
      message: d.message,
      type: d.type,
      fileUrl: d.fileUrl,
      fileName: d.fileName,
      timestamp: d.timestamp || d.createdAt
    }));
    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch messages: ' + err.message });
  }
});

// Clear all messages between two users
app.delete('/api/messages/:u1/:u2', async (req, res) => {
  const { u1, u2 } = req.params;
  try {
    if (!mongoUri) {
      // In-memory delete
      const before = messages.length;
      for (let i = messages.length - 1; i >= 0; i--) {
        const m = messages[i];
        if ((m.senderId === u1 && m.receiverId === u2) || (m.senderId === u2 && m.receiverId === u1)) {
          messages.splice(i, 1);
        }
      }
      const removed = before - messages.length;
      return res.json({ deletedCount: removed });
    }

    // Find messages and delete any associated files stored in GridFS
    const toDelete = await Message.find({
      $or: [
        { senderId: u1, receiverId: u2 },
        { senderId: u2, receiverId: u1 }
      ]
    });

    if (gridfsBucket) {
      for (const m of toDelete) {
        if (m.fileId) {
          try {
            const fid = new mongoose.Types.ObjectId(m.fileId);
            await gridfsBucket.delete(fid);
          } catch (err) {
            console.warn('Failed to delete GridFS file:', err.message);
          }
        }
      }
    }

    const result = await Message.deleteMany({
      $or: [
        { senderId: u1, receiverId: u2 },
        { senderId: u2, receiverId: u1 }
      ]
    });
    res.json({ deletedCount: result.deletedCount || 0 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete messages: ' + err.message });
  }
});

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { originalname, mimetype, size, buffer } = req.file;

    // Store in MongoDB GridFS when available
    if (mongoUri && gridfsBucket) {
      const stream = gridfsBucket.openUploadStream(originalname, { contentType: mimetype });
      stream.end(buffer);
      stream.on('error', (err) => {
        console.error('GridFS upload error:', err.message);
        if (!res.headersSent) res.status(500).json({ error: 'Failed to store file in database' });
      });
      // 'finish' does not pass a file document; use stream.id
      stream.on('finish', () => {
        const fileId = stream.id?.toString();
        if (!fileId) {
          // As a fallback, query by filename (unlikely needed) or return generic error
          if (!res.headersSent) res.status(500).json({ error: 'File stored but id unavailable' });
          return;
        }
        if (!res.headersSent) {
          res.json({ fileId, url: `/api/files/${fileId}`, filename: originalname, mimetype, size });
        }
      });
      return;
    }

    // Fallback: save to local disk (for dev without DB)
    const name = Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(originalname);
    const fullPath = path.join(uploadsDir, name);
    await fs.promises.writeFile(fullPath, buffer);
    res.json({ url: `/uploads/${name}`, filename: originalname, mimetype, size });
  } catch (err) {
    console.error('Upload handler error:', err.message);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Stream files from MongoDB GridFS
app.get('/api/files/:id', async (req, res) => {
  try {
    if (!mongoUri || !gridfsBucket) return res.status(500).json({ error: 'Database not configured' });
    const { id } = req.params;
    let objId;
    try {
      objId = new mongoose.Types.ObjectId(id);
    } catch {
      return res.status(400).json({ error: 'Invalid file id' });
    }
    const files = await gridfsBucket.find({ _id: objId }).toArray();
    if (!files || files.length === 0) return res.status(404).json({ error: 'File not found' });
    const meta = files[0];
    res.set('Content-Type', meta.contentType || 'application/octet-stream');
    res.set('Content-Disposition', `inline; filename="${meta.filename}"`);
    const readStream = gridfsBucket.openDownloadStream(objId);
    readStream.on('error', (err) => {
      console.error('GridFS download error:', err.message);
      if (!res.headersSent) res.status(500).end();
    });
    readStream.pipe(res);
  } catch (err) {
    console.error('File stream error:', err.message);
    res.status(500).json({ error: 'Failed to stream file' });
  }
});

// ---------------- SOCKET.IO ----------------

io.on('connection', socket => {
  console.log('Connected:', socket.id);

  socket.on('user_login', ({ userId, username, avatar }) => {
    onlineUsers[socket.id] = { id: userId, username, avatar };

    if (!userSockets[userId]) {
      userSockets[userId] = new Set();
    }
    userSockets[userId].add(socket.id);

    socket.userId = userId;
    socket.username = username;

    io.emit('user_online', { userId, username, avatar });

    socket.emit(
      'online_users',
      Object.keys(userSockets).map(uid => ({
        id: uid,
        isOnline: true
      }))
    );

    console.log(username, 'logged in', socket.id);
  });

  socket.on('private_message', async data => {
    const base = {
      senderId: data.senderId,
      receiverId: data.receiverId,
      message: data.message,
      type: data.type || 'text',
      fileId: data.fileId,
      fileUrl: data.fileUrl,
      fileName: data.fileName,
      timestamp: new Date()
    };

    let msg = { id: Date.now().toString(), ...base };
    if (mongoUri) {
      try {
        const doc = await Message.create(base);
        msg.id = doc._id.toString();
      } catch (err) {
        console.error('Failed to save message:', err.message);
      }
    } else {
      messages.push(msg);
    }

    const sockets = userSockets[data.receiverId];
    if (sockets) {
      sockets.forEach(sid => io.to(sid).emit('receive_message', msg));
    }

    socket.emit('message_sent', msg);
  });

  socket.on('typing', ({ senderId, receiverId, isTyping }) => {
    const sockets = userSockets[receiverId];
    if (sockets) {
      sockets.forEach(sid =>
        io.to(sid).emit('user_typing', {
          userId: senderId,
          username: socket.username,
          isTyping
        })
      );
    }
  });

  socket.on('disconnect', () => {
    const user = onlineUsers[socket.id];
    if (!user) return;

    delete onlineUsers[socket.id];

    if (userSockets[user.id]) {
      userSockets[user.id].delete(socket.id);

      if (userSockets[user.id].size === 0) {
        delete userSockets[user.id];
        io.emit('user_offline', { userId: user.id });
      }
    }

    console.log(user.username, 'disconnected', socket.id);
  });
});

// ---------------- HEALTH ----------------

app.get('/health', (_, res) => {
  const send = (count) => res.json({ status: 'OK', users: count, online: Object.keys(userSockets).length });
  if (mongoUri) {
    User.countDocuments().then(c => send(c)).catch(() => send(0));
  } else {
    send(0);
  }
});

// ---------------- START ----------------

const PORT = process.env.PORT || 5000;
server.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
