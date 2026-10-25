const express = require("express");

const {
    registerUser,
    loginUser
} = require("../controllers/authController");

const router = express.Router();


// ===============================
// REGISTER ROUTE
// ===============================

router.post("/register", registerUser);


// ===============================
// LOGIN ROUTE
// ===============================

router.post("/login", loginUser);


// ===============================
// EXPORT ROUTER
// ===============================

module.exports = router;