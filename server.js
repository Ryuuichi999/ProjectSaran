const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
require('dotenv').config();


const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Define User schema and model
const userSchema = new mongoose.Schema({
    username: String,
    email: String, // เพิ่ม email ใน schema
    password: String,
});
const User = mongoose.model('User', userSchema);

// GET route for home page
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/index.html');
});

// GET route for login page
app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/public/login.html');
});

// GET route for register page
app.get('/register', (req, res) => {
    res.sendFile(__dirname + '/public/register.html');
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
        const email = req.body.email; // เพิ่ม email
        const password = req.body.password;

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            username,
            email, // บันทึก email
            password: hashedPassword,
        });
        await newUser.save();

        res.json({ message: 'Registration successful!' });
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ message: 'Server error during registration' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});