
const express = require("express");
const router = express.Router();

const {
    getRecommendations
} = require("../controllers/recommendationController");

const {
    protect,
    authorize
} = require("../middleware/authMiddleware");

// Only mess users can request recommendations
router.get(
    "/:foodId",
    protect,
    authorize("mess"),
    getRecommendations
);

module.exports = router;