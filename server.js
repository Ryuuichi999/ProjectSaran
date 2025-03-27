// นำเข้า library ที่จำเป็น
const express = require('express'); // Express framework สำหรับการสร้างเซิร์ฟเวอร์
const mongoose = require('mongoose'); // mongoose สำหรับการทำงานกับ MongoDB
const bcrypt = require('bcryptjs'); // bcrypt สำหรับการเข้ารหัสรหัสผ่าน
const fs = require('fs').promises; // ใช้ fs สำหรับการจัดการไฟล์ (อ่านไฟล์)
const path = require('path'); // ใช้ path สำหรับการจัดการเส้นทางไฟล์
const cors = require('cors'); // CORS (Cross-Origin Resource Sharing) สำหรับอนุญาตให้ frontend เรียก API
require('dotenv').config(); // โหลดค่าตัวแปรจากไฟล์ .env

// สร้างแอปพลิเคชัน Express
const app = express();
const PORT = process.env.PORT || 3000; // กำหนดพอร์ตสำหรับเซิร์ฟเวอร์

// Middleware
app.use(express.json());  // ใช้ express.json() เพื่อให้ Express สามารถรับข้อมูลในรูปแบบ JSON ได้
app.use(cors()); // ใช้ CORS เพื่ออนุญาตให้ frontend ที่มาจากที่ต่าง ๆ เรียก API นี้ได้
app.use(express.static(path.join(__dirname, 'public'))); // เสิร์ฟไฟล์ static จากโฟลเดอร์ 'public'

// เชื่อมต่อกับ MongoDB
mongoose.connect(process.env.MONGODB_URI) // ใช้ตัวแปร MONGODB_URI จาก .env
    .then(() => console.log('Connected to MongoDB')) // ถ้าเชื่อมต่อสำเร็จ
    .catch(err => console.error('MongoDB connection error:', err)); // ถ้าเกิดข้อผิดพลาดในการเชื่อมต่อ

// สร้าง schema และ model สำหรับ User
const userSchema = new mongoose.Schema({
    username: String, // ชื่อผู้ใช้
    email: String, // อีเมล
    password: String, // รหัสผ่าน
});
const User = mongoose.model('User', userSchema); // สร้างโมเดล User จาก schema

// สร้าง schema และ model สำหรับ Reservation
const reservationSchema = new mongoose.Schema({
    barName: { type: String, required: true }, // ชื่อร้านที่จอง
    reservationName: { type: String, required: true }, // ชื่อผู้จอง
    reservationDate: { type: Date, required: true }, // วันที่และเวลาที่จอง
    numberOfPeople: { type: Number, required: true }, // จำนวนคน
    phoneNumber: { type: String, required: true }, // เบอร์โทรศัพท์
    createdAt: { type: Date, default: Date.now }, // เวลาในการจอง
    status: { type: String, default: 'pending', enum: ['pending', 'confirmed', 'cancelled'] } // สถานะการจอง (รอการยืนยัน, ยืนยันแล้ว, ยกเลิก)
});
const Reservation = mongoose.model('Reservation', reservationSchema); // สร้างโมเดล Reservation จาก schema

// เส้นทาง GET สำหรับหน้าแรก
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html')); // ส่งไฟล์ index.html จากโฟลเดอร์ 'public'
});

// เส้นทาง GET สำหรับหน้า login
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html')); // ส่งไฟล์ login.html จากโฟลเดอร์ 'public'
});

// เส้นทาง GET สำหรับหน้า register
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html')); // ส่งไฟล์ register.html จากโฟลเดอร์ 'public'
});

// เส้นทาง GET สำหรับหน้า map
app.get('/map', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'map.html')); // ส่งไฟล์ map.html จากโฟลเดอร์ 'public'
});

// เส้นทาง POST สำหรับการล็อกอิน
app.post('/login', async (req, res) => {
    try {
        const username = req.body.username; // รับค่า username จาก body
        const password = req.body.password; // รับค่า password จาก body

        const user = await User.findOne({ username }); // ค้นหาผู้ใช้จาก username
        if (user && await bcrypt.compare(password, user.password)) { // เช็คว่ารหัสผ่านถูกต้องไหม
            res.json({ message: 'Login successful!' }); // ส่งข้อความ "Login successful!" ถ้าล็อกอินสำเร็จ
        } else {
            res.status(401).json({ message: 'Invalid credentials' }); // ถ้าข้อมูลไม่ถูกต้อง
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Server error during login' }); // ส่งข้อผิดพลาดถ้าเกิด error
    }
});

// เส้นทาง POST สำหรับการสมัครสมาชิก
app.post('/register', async (req, res) => {
    try {
        const username = req.body.username; // รับค่า username จาก body
        const email = req.body.email; // รับค่า email จาก body
        const password = req.body.password; // รับค่า password จาก body

        const existingUser = await User.findOne({ username }); // เช็คว่ามี username นี้อยู่ในระบบหรือไม่
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' }); // ถ้ามี user นี้อยู่แล้ว ให้แสดงข้อผิดพลาด
        }

        const hashedPassword = await bcrypt.hash(password, 10); // เข้ารหัสรหัสผ่านก่อนบันทึก
        const newUser = new User({
            username,
            email,
            password: hashedPassword,
        });
        await newUser.save(); // บันทึกผู้ใช้ใหม่ลงใน MongoDB

        res.json({ message: 'Registration successful!' }); // ส่งข้อความ "Registration successful!"
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ message: 'Server error during registration' }); // ส่งข้อผิดพลาดถ้าเกิด error
    }
});

// API เพื่อดึงข้อมูลร้านจาก GeoJSON
app.get('/api/bars', async (req, res) => {
    try {
        const geojsonPath = path.join(__dirname, 'public', 'data', 'bars.geojson'); // กำหนดเส้นทางไฟล์ GeoJSON
        await fs.access(geojsonPath); // ตรวจสอบว่าไฟล์มีอยู่จริง
        const geojsonData = await fs.readFile(geojsonPath, 'utf8'); // อ่านข้อมูลจากไฟล์ GeoJSON
        res.json(JSON.parse(geojsonData)); // ส่งข้อมูล GeoJSON กลับไปที่ frontend
    } catch (error) {
        if (error.code === 'ENOENT') { // ถ้าไฟล์ไม่พบ
            console.error('GeoJSON file not found:', error);
            res.status(404).json({ error: 'GeoJSON file not found' }); // ส่งข้อผิดพลาดไฟล์ไม่พบ
        } else {
            console.error('Error reading GeoJSON:', error);
            res.status(500).json({ error: 'Failed to load bars data' }); // ส่งข้อผิดพลาดการอ่านไฟล์
        }
    }
});

// API เพื่อบันทึกการจอง
app.post('/api/reserve', async (req, res) => {
    try {
        const { barName, reservationName, reservationDate, numberOfPeople, phoneNumber } = req.body; // รับข้อมูลการจอง

        // ตรวจสอบว่าได้รับข้อมูลครบถ้วนหรือไม่
        if (!barName || !reservationName || !reservationDate || !numberOfPeople || !phoneNumber) {
            return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' }); // ถ้าข้อมูลไม่ครบ
        }

        const reservation = new Reservation({
            barName,
            reservationName,
            reservationDate,
            numberOfPeople,
            phoneNumber
        });

        await reservation.save(); // บันทึกข้อมูลการจองลงในฐานข้อมูล MongoDB
        res.status(201).json({ message: 'จองโต๊ะสำเร็จ' }); // ส่งข้อความ "จองโต๊ะสำเร็จ"
    } catch (error) {
        console.error('Error saving reservation:', error);
        res.status(500).json({ error: 'เกิดข้อผิดพลาดในการจองโต๊ะ' }); // ส่งข้อผิดพลาดการจอง
    }
});

// เริ่มเซิร์ฟเวอร์
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`); // เซิร์ฟเวอร์กำลังรันที่พอร์ตที่กำหนด
});
