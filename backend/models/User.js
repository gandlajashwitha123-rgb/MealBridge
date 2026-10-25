
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        phone: {
            type: String,
            required: true,
            trim: true
        },

        password: {
            type: String,
            required: true
        },

        role: {
            type: String,
            enum: ["mess", "ngo", "admin"],
            required: true
        },

        isActive: {
            type: Boolean,
            default: true
        },

        
        verificationStatus: {
            type: String,
            enum: ["pending", "verified", "rejected"],
            default: "pending"
        },

        verifiedAt: {
            type: Date,
            default: null
        },

        // Sprint 3: Smart recipient matching details
        preferredCategories: {
            type: [String],
            default: []
        },

        dailyCapacity: {
            type: Number,
            min: 0,
            default: 50
        },

        estimatedDistanceKm: {
            type: Number,
            min: 0,
            default: 5
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("User", userSchema);