
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const readline = require("readline");

const User = require("./models/User");

dotenv.config();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function ask(question) {
    return new Promise((resolve) => {
        rl.question(question, resolve);
    });
}

async function createAdmin() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB connected successfully.");

        const name = (await ask("Enter admin name: ")).trim();
        const email = (await ask("Enter admin email: "))
            .trim()
            .toLowerCase();
        const phone = (await ask("Enter admin phone: ")).trim();
        const password = await ask("Enter a strong admin password: ");

        if (!name || !email || !phone || !password) {
            throw new Error("All fields are required.");
        }

        if (password.length < 12) {
            throw new Error(
                "Use a password with at least 12 characters."
            );
        }

        const existingUser = await User.findOne({ email });

        if (existingUser) {
            throw new Error(
                "This email already exists. No account was changed."
            );
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const admin = await User.create({
            name,
            email,
            phone,
            password: hashedPassword,
            role: "admin",
            isActive: true,
            verificationStatus: "verified",
            verifiedAt: new Date()
        });

        console.log("\nAdmin account created successfully!");
        console.log("Name:", admin.name);
        console.log("Email:", admin.email);
        console.log("Role:", admin.role);
        console.log("Active:", admin.isActive);
    } catch (error) {
        console.error("\nAdmin setup failed:", error.message);
    } finally {
        rl.close();
        await mongoose.disconnect();
    }
}

createAdmin();

