
const express = require("express");
const router = express.Router();

const {
    protect,
    authorize
} = require("../middleware/authMiddleware");

const {
    getStats,
    getUsers,
    updateUserStatus,
    getNGOs,
    updateNGOVerification,
    getFoods,
    getRequests,
    moderateFood
} = require("../controllers/adminController");

// Every route below requires a logged-in admin.
router.use(protect, authorize("admin"));

router.get("/stats", getStats);

router.get("/users", getUsers);
router.patch("/users/:id/status", updateUserStatus);

router.get("/ngos", getNGOs);
router.patch("/ngos/:id/verification", updateNGOVerification);

router.get("/foods", getFoods);
router.patch("/foods/:id/moderation", moderateFood);

router.get("/requests", getRequests);

module.exports = router;