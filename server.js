require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');

const connectDB = require('./config/db');
const { uploadDocument } = require('./controllers/uploadController');
const { askQuestion } = require('./controllers/ragController');

const app = express();
const PORT = process.env.PORT || 5001;

connectDB();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed!'), false);
    }
  }
});

const handleUpload = (req, res, next) => {
  upload.single('document')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File size exceeds 10MB limit.' });
        }
        return res.status(400).json({ error: err.message });
      }
      return res.status(400).json({ error: err.message || 'Error uploading file.' });
    }
    next();
  });
};

app.get('/api/health', (req, res) => {
  res.status(200).json({ message: 'AI Knowledge Assistant API is running' });
});

app.post('/api/upload', handleUpload, uploadDocument);
app.post('/api/ask', askQuestion);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
