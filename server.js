const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(cors()); // เพิ่ม CORS เพื่อให้ frontend สามารถเรียก API ได้
app.use(express.static(path.join(__dirname, 'public'))); // เสิร์ฟไฟล์ static จากโฟลเดอร์ public

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Define User schema and model
const userSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
});
const User = mongoose.model('User', userSchema);

// Define Reservation schema and model
const reservationSchema = new mongoose.Schema({
    barName: { type: String, required: true },
    reservationName: { type: String, required: true },
    reservationDate: { type: Date, required: true },
    numberOfPeople: { type: Number, required: true },
    phoneNumber: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    status: { type: String, default: 'pending', enum: ['pending', 'confirmed', 'cancelled'] }
});
const Reservation = mongoose.model('Reservation', reservationSchema);

// GET route for home page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// GET route for login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// GET route for register page
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});

// GET route for map page
app.get('/map', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'map.html'));
});

// POST route for login
app.post('/login', async (req, res) => {
    try {
        const username = req.body.username;
        const password = req.body.password;

        const user = await User.findOne({ username });
        if (user && await bcrypt.compare(password, user.password)) {
            res.json({ message: 'Login successful!' });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// POST route for register
app.post('/register', async (req, res) => {
    try {
        const username = req.body.username;
        const email = req.body.email;
        const password = req.body.password;

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
        });
        await newUser.save();

        res.json({ message: 'Registration successful!' });
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
});

// API เพื่อดึงข้อมูลร้านจาก GeoJSON
app.get('/api/bars', async (req, res) => {
    try {
        const geojsonPath = path.join(__dirname, 'public', 'data', 'bars.geojson'); // ปรับ path ให้ถูกต้อง
        await fs.access(geojsonPath); // ตรวจสอบว่าไฟล์มีอยู่
        const geojsonData = await fs.readFile(geojsonPath, 'utf8');
        res.json(JSON.parse(geojsonData));
    } catch (error) {
        if (error.code === 'ENOENT') {
            console.error('GeoJSON file not found:', error);
            res.status(404).json({ error: 'GeoJSON file not found' });
        } else {
            console.error('Error reading GeoJSON:', error);
            res.status(500).json({ error: 'Failed to load bars data' });
        }
    }
});

// API เพื่อบันทึกการจอง
app.post('/api/reserve', async (req, res) => {
    try {
        const { barName, reservationName, reservationDate, numberOfPeople, phoneNumber } = req.body;

        if (!barName || !reservationName || !reservationDate || !numberOfPeople || !phoneNumber) {
            return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
        }

        const reservation = new Reservation({
            barName,
            reservationName,
            reservationDate,
            numberOfPeople,
            phoneNumber
            
        });

        await reservation.save();
        res.status(201).json({ message: 'จองโต๊ะสำเร็จ' });
    } catch (error) {
        console.error('Error saving reservation:', error);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการจองโต๊ะ' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});