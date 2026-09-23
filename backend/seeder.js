const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Student = require('./models/Student');
const Batch = require('./models/Batch');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const importData = async () => {
    try {
        await User.deleteMany();
        await Student.deleteMany();
        await Batch.deleteMany();

        const admin = await User.create({
            name: 'Admin User',
            email: 'admin@gmail.com',
            password: 'password123',
            role: 'ADMIN',
        });

        const teacher = await User.create({
            name: 'Teacher User',
            email: 'teacher@example.com',
            password: 'password123',
            role: 'TEACHER',
        });

        const parent = await User.create({
            name: 'Parent User',
            email: 'parent@example.com',
            password: 'password123',
            role: 'PARENT',
        });

        const batch = await Batch.create({
            name: 'Batch A',
            timing: '10:00 AM - 12:00 PM',
            teacher: teacher._id,
        });

        const student = await Student.create({
            name: 'Student One',
            email: 'student@example.com',
            parent: parent._id,
            batch: batch._id,
            totalFees: 5000,
        });

        // Link student to batch
        batch.students.push(student._id);
        await batch.save();

        console.log('Data Imported!');
        process.exit();
    } catch (error) {
        console.error(`${error}`);
        process.exit(1);
    }
};

importData();
