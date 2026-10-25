const mongoose = require("mongoose");


// =========================================================
// REQUEST SCHEMA
// =========================================================

const foodRequestSchema =
    new mongoose.Schema({

        ngo: {

            type: mongoose.Schema.Types.ObjectId,

            ref: "User",

            required: true

        },


        quantity: {

            type: Number,

            required: true,

            min: 1

        },


        message: {

            type: String,

            default: ""

        },


        status: {

            type: String,

            enum: [
                "pending",
                "accepted",
                "rejected",
                "completed"
            ],

            default: "pending"

        },


        requestedAt: {

            type: Date,

            default: Date.now

        },


        pickupTime: {

            type: Date,

            default: null

        }

    });


// =========================================================
// FOOD SCHEMA
// =========================================================

const foodSchema =
    new mongoose.Schema({

        foodName: {

            type: String,

            required: true,

            trim: true

        },


        category: {

            type: String,

            required: true,

            trim: true

        },


        quantity: {

            type: Number,

            required: true,

            min: 1

        },


        unit: {

            type: String,

            required: true

        },


        description: {

            type: String,

            default: "",

            trim: true

        },


        preparedAt: {

            type: Date,

            required: true

        },


        expiryTime: {

            type: Date,

            required: true

        },


        pickupLocation: {

            type: String,

            required: true,

            trim: true

        },


        contactNumber: {

            type: String,

            required: true,

            trim: true

        },


        postedBy: {

            type: mongoose.Schema.Types.ObjectId,

            ref: "User",

            required: true

        },


        status: {

            type: String,

            enum: [
                "available",
                "partially_claimed",
                "claimed",
                "expired"
            ],

            default: "available"

        },

        
        isRemoved: {
            type: Boolean,
            default: false
        },

        moderationReason: {
            type: String,
            default: ""
        },

        moderatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },

        moderatedAt: {
            type: Date,
            default: null
        },


        requests: {

            type: [foodRequestSchema],

            default: []

        }

    },

    {

        timestamps: true

    });


// =========================================================
// EXPORT
// =========================================================

module.exports =
    mongoose.model(
        "Food",
        foodSchema
    );