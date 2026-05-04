const express = require('express');
const cors = require('cors');
require('dotenv').config();
const pool = require('./src/config/db'); // Pastikan file ini juga udah dibikin dan di-save ya

const app = express();
const port = process.env.PORT || 3000;

app.use(cors()); // Ini akan mengizinkan Frontend kamu buat akses API ini
app.use(express.json());

// Middleware
app.use(cors());
app.use(express.json()); 

// routes items API
const itemRoutes = require('./src/routes/itemRoutes');
app.use('/api/items', itemRoutes);

const requestRoutes = require('./src/routes/requestRoutes'); // Sesuaikan path

// Daftarkan endpoint API
app.use('/api/requests', requestRoutes);

// routes users API
const userRoutes = require('./src/routes/userRoutes');
app.use('/api/users', userRoutes);

// Endpoint testing
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to Road Work API!' });
});

// Jalankan server
app.listen(port, () => {
    console.log(`Server jalan kencang di http://localhost:${port}`);
});