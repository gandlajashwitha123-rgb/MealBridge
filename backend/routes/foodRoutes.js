const express = require("express");

const router = express.Router();

const {
    createFood,
    getMyFood,
    getAvailableFood,
    requestFood,
    getMyRequests,
    getIncomingRequests,
    updateRequestStatus
} = require("../controllers/foodController");

const {
    protect,
    authorize
} = require("../middleware/authMiddleware");


// ========================================
// MESS
// ========================================

router.post(
    "/",
    protect,
    authorize("mess"),
    createFood
);


router.get(
    "/my-food",
    protect,
    authorize("mess"),
    getMyFood
);


router.get(
    "/incoming-requests",
    protect,
    authorize("mess"),
    getIncomingRequests
);


router.patch(
    "/:foodId/requests/:requestId",
    protect,
    authorize("mess"),
    updateRequestStatus
);


// ========================================
// NGO
// ========================================

router.get(
    "/available",
    protect,
    authorize("ngo"),
    getAvailableFood
);


router.post(
    "/:id/request",
    protect,
    authorize("ngo"),
    requestFood
);


router.get(
    "/my-requests",
    protect,
    authorize("ngo"),
    getMyRequests
);


module.exports = router;