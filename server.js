// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path'); // 👈 ADD THIS

const chatRoutes = require('./routes/chat');
const leadRoutes = require('./routes/lead');
const appointmentRoutes = require('./routes/appointment');
const whatsappWebhook = require('./routes/whatsappWebhook');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Serve static files from the 'public' folder (absolute path)
app.use(express.static(path.join(__dirname, 'public')));

// Explicit route for widget.js (ensures it's served)
app.get('/widget.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'widget.js'));
});

// Routes
app.use('/api/chat', chatRoutes);
app.use('/api/lead', leadRoutes);
app.use('/api/appointment', appointmentRoutes);
app.use('/webhook/whatsapp', whatsappWebhook);

// Root route – send index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check
app.get('/health', (req, res) => res.send('OK'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));