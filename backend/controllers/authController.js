const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");


// ===============================
// REGISTER USER
// ===============================

const registerUser = async (req, res) => {

    try {

        const {
            name,
            email,
            phone,
            password,
            role
        } = req.body;


        // Check required fields

        if (!name || !email || !phone || !password || !role) {

            return res.status(400).json({
                success: false,
                message: "Please fill all fields."
            });

        }


        // Validate role

        
/* Public registration is only for mess staff and NGOs. */
if (!["mess", "ngo"].includes(role)) {
    return res.status(400).json({
        success: false,
        message: "Invalid user role. Admin accounts cannot be created through public registration."
    });
}


        // Check existing user

        const existingUser = await User.findOne({
            email: email.toLowerCase()
        });

        if (existingUser) {

            return res.status(400).json({
                success: false,
                message: "An account with this email already exists."
            });

        }


        // Hash password

        const hashedPassword = await bcrypt.hash(password, 10);


        // Create user

        const user = await User.create({

            name,

            email: email.toLowerCase(),

            phone,

            password: hashedPassword,

            role

        });


        res.status(201).json({

            success: true,

            message: "Registration successful!",

            user: {

                id: user._id,

                name: user.name,

                email: user.email,

                role: user.role

            }

        });


    } catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message: "Server error during registration."

        });

    }

};


// ===============================
// LOGIN USER
// ===============================

const loginUser = async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;


        if (!email || !password) {

            return res.status(400).json({

                success: false,

                message: "Email and password are required."

            });

        }


        // Find user

        const user = await User.findOne({
            email: email.toLowerCase()
        });


        if (!user) {

            return res.status(401).json({

                success: false,

                message: "Invalid email or password."

            });

        }


        // Check active status

        if (!user.isActive) {

            return res.status(403).json({

                success: false,

                message: "Your account has been disabled."

            });

        }


        // Compare password

        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );


        if (!passwordMatch) {

            return res.status(401).json({

                success: false,

                message: "Invalid email or password."

            });

        }


        // Create JWT

        const token = jwt.sign(

            {
                id: user._id,

                role: user.role

            },

            process.env.JWT_SECRET,

            {
                expiresIn: "1d"
            }

        );


        res.status(200).json({

            success: true,

            message: "Login successful!",

            token,

            user: {

                id: user._id,

                name: user.name,

                email: user.email,

                role: user.role

            }

        });


    } catch (error) {

        console.error(error);

        res.status(500).json({

            success: false,

            message: "Server error during login."

        });

    }

};


module.exports = {

    registerUser,

    loginUser

};