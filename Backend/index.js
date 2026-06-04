const express = require('express');
const cors = require('cors');
require('dotenv').config();
const path = require('path');

const app = express();

// Middleware Utama
const corsOptions = {
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500', 'http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'],
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json({ limit: '2mb' })); 
app.use(express.urlencoded({ limit: '1mb', extended: true }));

// Route Imports
const itemRoutes = require('./src/routes/itemRoutes');
const requestRoutes = require('./src/routes/requestRoutes');
const userRoutes = require('./src/routes/userRoutes');
const scannerRoutes = require('./src/routes/scanner');
const logRoutes = require('./src/routes/logRoutes');

// Endpoint API
app.use('/api/items', itemRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/users', userRoutes);
app.use('/api/scanner', scannerRoutes);
app.use('/api/inventory-logs', logRoutes);

// Folder Statis (Tetap aktifkan untuk jaga-jaga file lain)
app.use('/uploads', express.static(path.join(__dirname, 'src/uploads')));

app.get('/', (req, res) => res.json({ message: 'WMS Cloud API Active' }));

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server lari di port ${port}`));
