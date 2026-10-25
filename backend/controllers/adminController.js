
const User = require("../models/User");
const Food = require("../models/Food");

// GET PLATFORM STATISTICS
const getStats = async (req, res) => {
    try {
        const [
            totalUsers,
            totalMess,
            totalNGOs,
            totalFoodListings,
            activeFoodListings,
            completedDonations,
            rejectedRequests,
            foods
        ] = await Promise.all([
            User.countDocuments(),
            User.countDocuments({ role: "mess" }),
            User.countDocuments({ role: "ngo" }),
            Food.countDocuments(),
            Food.countDocuments({
                isRemoved: { $ne: true },
                expiryTime: { $gt: new Date() },
                status: { $in: ["available", "partially_claimed"] }
            }),
            Food.countDocuments({ "requests.status": "completed" }),
            Food.aggregate([
                { $unwind: "$requests" },
                { $match: { "requests.status": "rejected" } },
                { $count: "total" }
            ]),
            Food.find({}, "quantity unit requests")
        ]);

        const rescuedByUnit = {};

        for (const food of foods) {
            for (const request of food.requests) {
                if (request.status === "completed") {
                    rescuedByUnit[food.unit] =
                        (rescuedByUnit[food.unit] || 0) +
                        Number(request.quantity || 0);
                }
            }
        }

        return res.json({
            success: true,
            stats: {
                totalUsers,
                totalMess,
                totalNGOs,
                totalFoodListings,
                activeFoodListings,
                completedDonations,
                rejectedRequests: rejectedRequests[0]?.total || 0,
                rescuedByUnit
            }
        });
    } catch (error) {
        console.error("getStats:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to load platform statistics."
        });
    }
};

// GET USERS
const getUsers = async (req, res) => {
    try {
        const users = await User.find()
            .select("-password")
            .sort({ createdAt: -1 })
            .lean();

        return res.json({
            success: true,
            users: users.map(user => ({
                ...user,
                verificationStatus:
                    user.role === "ngo"
                        ? user.verificationStatus || "pending"
                        : user.verificationStatus
            }))
        });
    } catch (error) {
        console.error("getUsers:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to load users."
        });
    }
};

// ACTIVATE / DEACTIVATE USER
const updateUserStatus = async (req, res) => {
    try {
        const { isActive } = req.body;

        if (typeof isActive !== "boolean") {
            return res.status(400).json({
                success: false,
                message: "isActive must be true or false."
            });
        }

        if (req.params.id === req.user.id && !isActive) {
            return res.status(400).json({
                success: false,
                message: "You cannot deactivate your own account."
            });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { $set: { isActive } },
            { new: true, runValidators: true }
        ).select("-password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found."
            });
        }

        return res.json({
            success: true,
            message: `User ${isActive ? "activated" : "deactivated"} successfully.`,
            user
        });
    } catch (error) {
        console.error("updateUserStatus:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update user status."
        });
    }
};

// GET NGOs
const getNGOs = async (req, res) => {
    try {
        const ngos = await User.find({ role: "ngo" })
            .select("-password")
            .sort({ createdAt: -1 });

        return res.json({
            success: true,
            ngos: ngos.map(ngo => {
                const item = ngo.toObject();
                item.verificationStatus =
                    item.verificationStatus || "pending";
                return item;
            })
        });
    } catch (error) {
        console.error("getNGOs:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to load NGOs."
        });
    }
};

// VERIFY / REJECT NGO
const updateNGOVerification = async (req, res) => {
    try {
        const { verificationStatus } = req.body;

        if (!["pending", "verified", "rejected"].includes(verificationStatus)) {
            return res.status(400).json({
                success: false,
                message: "Invalid verification status."
            });
        }

        const ngo = await User.findOneAndUpdate(
            { _id: req.params.id, role: "ngo" },
            {
                $set: {
                    verificationStatus,
                    verifiedAt:
                        verificationStatus === "verified"
                            ? new Date()
                            : null
                }
            },
            { new: true, runValidators: true }
        ).select("-password");

        if (!ngo) {
            return res.status(404).json({
                success: false,
                message: "NGO not found."
            });
        }

        return res.json({
            success: true,
            message: `NGO status updated to ${verificationStatus}.`,
            ngo
        });
    } catch (error) {
        console.error("updateNGOVerification:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update NGO verification."
        });
    }
};

// GET FOOD LISTINGS
const getFoods = async (req, res) => {
    try {
        const foods = await Food.find()
            .populate("postedBy", "name email role")
            .populate("requests.ngo", "name email")
            .sort({ createdAt: -1 });

        return res.json({
            success: true,
            foods
        });
    } catch (error) {
        console.error("getFoods:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to load food listings."
        });
    }
};

// GET ALL DONATION REQUESTS
const getRequests = async (req, res) => {
    try {
        const foods = await Food.find()
            .populate("postedBy", "name email")
            .populate("requests.ngo", "name email")
            .sort({ createdAt: -1 });

        const requests = [];

        for (const food of foods) {
            for (const request of food.requests) {
                requests.push({
                    requestId: request._id,
                    foodId: food._id,
                    foodName: food.foodName,
                    foodUnit: food.unit,
                    foodQuantity: food.quantity,
                    postedBy: food.postedBy,
                    ngo: request.ngo,
                    quantity: request.quantity,
                    message: request.message,
                    status: request.status,
                    requestedAt: request.requestedAt,
                    pickupTime: request.pickupTime,
                    foodRemoved: food.isRemoved || false
                });
            }
        }

        return res.json({ success: true, requests });
    } catch (error) {
        console.error("getRequests:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to load donation requests."
        });
    }
};

// REMOVE / RESTORE FOOD LISTING WITH REASON
const moderateFood = async (req, res) => {
    try {
        const { isRemoved, reason } = req.body;

        if (typeof isRemoved !== "boolean") {
            return res.status(400).json({
                success: false,
                message: "isRemoved must be true or false."
            });
        }

        const cleanReason = String(reason || "").trim();

        if (isRemoved && !cleanReason) {
            return res.status(400).json({
                success: false,
                message: "A reason is required when removing a listing."
            });
        }

        const food = await Food.findById(req.params.id);

        if (!food) {
            return res.status(404).json({
                success: false,
                message: "Food listing not found."
            });
        }

        food.isRemoved = isRemoved;
        food.moderationReason = isRemoved ? cleanReason : "";
        food.moderatedBy = req.user.id;
        food.moderatedAt = new Date();

        await food.save();

        return res.json({
            success: true,
            message: isRemoved
                ? "Food listing removed from public availability."
                : "Food listing restored.",
            food
        });
    } catch (error) {
        console.error("moderateFood:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to moderate food listing."
        });
    }
};

module.exports = {
    getStats,
    getUsers,
    updateUserStatus,
    getNGOs,
    updateNGOVerification,
    getFoods,
    getRequests,
    moderateFood
};