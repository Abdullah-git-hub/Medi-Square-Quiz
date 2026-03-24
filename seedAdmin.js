const connectDB = require('./src/config/db');
const Admin = require('./src/models/Admin');
const dotenv = require('dotenv');
dotenv.config();

const seed = async () => {
    await connectDB();
    if (process.env.MONGO_URI && !process.env.MONGO_URI.includes('<username>')) {
        const exists = await Admin.findOne({ username: 'admin' });
        if (!exists) {
            await Admin.create({ username: 'MediSquare', password: 'arafat@ungabunga' });
            console.log("Admin seeded: MediSquare / arafat@ungabunga");
        } else {
            console.log("Admin already exists.");
        }
        process.exit();
    }
};
seed();
