const Food = require("../models/Food");

// Quantity already picked up is represented by requests with status "completed".
// Pending and accepted requests reserve food so multiple NGOs cannot overbook it.
const getCompletedQuantity = (food, exceptRequestId = null) =>
    food.requests
        .filter(r => r.status === "completed" && (!exceptRequestId || r._id.toString() !== exceptRequestId))
        .reduce((sum, r) => sum + Number(r.quantity || 0), 0);

const getReservedQuantity = (food, exceptRequestId = null) =>
    food.requests
        .filter(r => ["pending", "accepted"].includes(r.status) && (!exceptRequestId || r._id.toString() !== exceptRequestId))
        .reduce((sum, r) => sum + Number(r.quantity || 0), 0);

const getRequestableQuantity = (food, exceptRequestId = null) =>
    Math.max(0, Number(food.quantity || 0) - getCompletedQuantity(food) - getReservedQuantity(food, exceptRequestId));

const refreshFoodStatus = (food) => {
    if (new Date(food.expiryTime) <= new Date()) {
        food.status = "expired";
        return;
    }
    const consumed = getCompletedQuantity(food);
    const accepted = food.requests.filter(r => r.status === "accepted").reduce((sum, r) => sum + Number(r.quantity || 0), 0);
    if (consumed + accepted >= Number(food.quantity)) food.status = "claimed";
    else if (consumed + accepted > 0) food.status = "partially_claimed";
    else food.status = "available";
};

// POST FOOD
const createFood = async (req, res) => {
    try {
        const { foodName, category, quantity, unit, description, preparedAt, expiryTime, pickupLocation, contactNumber } = req.body;
        if (!foodName || !category || quantity === undefined || quantity === "" || !unit || !preparedAt || !expiryTime || !pickupLocation || !contactNumber) {
            return res.status(400).json({ success: false, message: "Please fill all required fields." });
        }
        const amount = Number(quantity);
        if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount < 1) {
            return res.status(400).json({ success: false, message: "Quantity must be a whole number greater than zero." });
        }
        const expiry = new Date(expiryTime);
        const prepared = new Date(preparedAt);
        if (Number.isNaN(expiry.getTime()) || Number.isNaN(prepared.getTime())) {
            return res.status(400).json({ success: false, message: "Please provide valid preparation and expiry times." });
        }
        if (expiry <= prepared) return res.status(400).json({ success: false, message: "Expiry time must be after preparation time." });
        if (expiry <= new Date()) return res.status(400).json({ success: false, message: "Food expiry time must be in the future." });

        const food = await Food.create({ foodName, category, quantity: amount, unit, description, preparedAt: prepared, expiryTime: expiry, pickupLocation, contactNumber, postedBy: req.user.id });
        return res.status(201).json({ success: true, message: "Food donation posted successfully!", food });
    } catch (error) {
        console.error("createFood:", error);
        return res.status(500).json({ success: false, message: "Failed to post food." });
    }
};

// GET MESS STAFF'S FOOD
const getMyFood = async (req, res) => {
    try {
        const food = await Food.find({ postedBy: req.user.id }).populate("postedBy", "name email phone").sort({ createdAt: -1 });
        const result = food.map(item => {
            const data = item.toObject();
            data.completedQuantity = getCompletedQuantity(item);
            data.reservedQuantity = getReservedQuantity(item);
            data.remainingQuantity = Math.max(0, Number(item.quantity) - data.completedQuantity - data.reservedQuantity);
            return data;
        });
        return res.json({ success: true, food: result });
    } catch (error) {
        console.error("getMyFood:", error);
        return res.status(500).json({ success: false, message: "Failed to load your food." });
    }
};

// GET AVAILABLE FOOD FOR NGO
const getAvailableFood = async (req, res) => {
    try {
        const now = new Date();
        await Food.updateMany({ expiryTime: { $lte: now }, status: { $in: ["available", "partially_claimed"] } }, { $set: { status: "expired" } });
        const foods = await Food.find({isRemoved: { $ne: true }, status: { $in: ["available", "partially_claimed"] }, expiryTime: { $gt: now } }).populate("postedBy", "name phone").sort({ expiryTime: 1 });
        const food = foods.map(item => {
            const data = item.toObject();
            data.completedQuantity = getCompletedQuantity(item);
            data.reservedQuantity = getReservedQuantity(item);
            data.remainingQuantity = Math.max(0, Number(item.quantity) - data.completedQuantity - data.reservedQuantity);
            return data;
        }).filter(item => item.remainingQuantity > 0);
        return res.json({ success: true, food });
    } catch (error) {
        console.error("getAvailableFood:", error);
        return res.status(500).json({ success: false, message: "Failed to load available food." });
    }
};

// NGO REQUESTS FOOD
const requestFood = async (req, res) => {
    try {
        const { quantity, message } = req.body;
        const amount = Number(quantity);
        if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount < 1) {
            return res.status(400).json({ success: false, message: "Enter a valid whole-number quantity greater than zero." });
        }
        const food = await Food.findById(req.params.id);
        if (!food) return res.status(404).json({ success: false, message: "Food donation not found." });
        if (new Date(food.expiryTime) <= new Date()) {
            food.status = "expired";
            await food.save();
            return res.status(400).json({ success: false, message: "This food has expired." });
        }
        if (!["available", "partially_claimed"].includes(food.status)) {
            return res.status(400).json({ success: false, message: "This food is no longer available." });
        }
        const duplicatePending = food.requests.some(r => r.ngo.toString() === req.user.id && r.status === "pending");
        if (duplicatePending) return res.status(400).json({ success: false, message: "You already have a pending request for this food." });

        const remaining = getRequestableQuantity(food);
        if (amount > remaining) return res.status(400).json({ success: false, message: `Only ${remaining} ${food.unit} currently available to request.` });

        food.requests.push({ ngo: req.user.id, quantity: amount, message: String(message || "").trim() });
        await food.save();
        return res.status(201).json({ success: true, message: "Food request submitted successfully!", remainingQuantity: getRequestableQuantity(food) });
    } catch (error) {
        console.error("requestFood:", error);
        return res.status(500).json({ success: false, message: "Failed to request food." });
    }
};

// NGO'S REQUEST HISTORY
const getMyRequests = async (req, res) => {
    try {
        const foods = await Food.find({ "requests.ngo": req.user.id }).populate("postedBy", "name phone").populate("requests.ngo", "name email phone").sort({ createdAt: -1 });
        const requests = [];
        foods.forEach(item => item.requests.forEach(request => {
            if (request.ngo && request.ngo._id.toString() === req.user.id) {
                requests.push({
                    requestId: request._id,
                    foodId: item._id,
                    foodName: item.foodName,
                    category: item.category,
                    unit: item.unit,
                    pickupLocation: item.pickupLocation,
                    contactNumber: item.contactNumber,
                    postedBy: item.postedBy,
                    expiryTime: item.expiryTime,
                    originalQuantity: item.quantity,
                    quantity: request.quantity,
                    message: request.message,
                    status: request.status,
                    requestedAt: request.requestedAt,
                    pickupTime: request.pickupTime
                });
            }
        }));
        return res.json({ success: true, requests });
    } catch (error) {
        console.error("getMyRequests:", error);
        return res.status(500).json({ success: false, message: "Failed to load requests." });
    }
};

// INCOMING REQUESTS FOR MESS STAFF
const getIncomingRequests = async (req, res) => {
    try {
        const foods = await Food.find({ postedBy: req.user.id, "requests.0": { $exists: true } }).populate("requests.ngo", "name email phone").sort({ createdAt: -1 });
        const requests = [];
        foods.forEach(item => item.requests.forEach(request => requests.push({
            requestId: request._id,
            foodId: item._id,
            foodName: item.foodName,
            category: item.category,
            unit: item.unit,
            quantity: request.quantity,
            originalQuantity: item.quantity,
            remainingQuantity: getRequestableQuantity(item),
            pickupLocation: item.pickupLocation,
            contactNumber: item.contactNumber,
            message: request.message,
            status: request.status,
            requestedAt: request.requestedAt,
            pickupTime: request.pickupTime,
            ngo: request.ngo
        })));
        return res.json({ success: true, requests });
    } catch (error) {
        console.error("getIncomingRequests:", error);
        return res.status(500).json({ success: false, message: "Failed to load incoming requests." });
    }
};

// ACCEPT / REJECT / COMPLETE A REQUEST
const updateRequestStatus = async (req, res) => {
    try {
        const { status, pickupTime } = req.body;
        if (!["accepted", "rejected", "completed"].includes(status)) {
            return res.status(400).json({ success: false, message: "Invalid request status." });
        }
        const food = await Food.findOne({ _id: req.params.foodId, postedBy: req.user.id });
        if (!food) return res.status(404).json({ success: false, message: "Food donation not found." });
        const request = food.requests.id(req.params.requestId);
        if (!request) return res.status(404).json({ success: false, message: "Request not found." });

        if (status === "accepted") {
            if (request.status !== "pending") return res.status(400).json({ success: false, message: `Only pending requests can be accepted. This request is ${request.status}.` });
            if (new Date(food.expiryTime) <= new Date()) {
                food.status = "expired";
                await food.save();
                return res.status(400).json({ success: false, message: "This food has expired; the request cannot be accepted." });
            }
            const availableForThisRequest = getRequestableQuantity(food, request._id.toString());
            if (request.quantity > availableForThisRequest) {
                return res.status(400).json({ success: false, message: `Not enough unreserved food remains. Only ${availableForThisRequest} ${food.unit} can be accepted.` });
            }
            if (!pickupTime || Number.isNaN(new Date(pickupTime).getTime())) {
                return res.status(400).json({ success: false, message: "Please assign a valid pickup time before accepting." });
            }
            request.status = "accepted";
            request.pickupTime = new Date(pickupTime);
        } else if (status === "rejected") {
            if (request.status !== "pending") return res.status(400).json({ success: false, message: "Only pending requests can be rejected." });
            request.status = "rejected";
        } else {
            if (request.status !== "accepted") return res.status(400).json({ success: false, message: "Only accepted requests can be marked as completed." });
            // Changing accepted -> completed transfers this quantity from reserved to consumed.
            // Since the request status changes once, repeat completion cannot deduct it twice.
            request.status = "completed";
        }

        refreshFoodStatus(food);
        await food.save();
        return res.json({ success: true, message: `Request ${status} successfully.`, requestId: request._id, foodStatus: food.status, remainingQuantity: getRequestableQuantity(food) });
    } catch (error) {
        console.error("updateRequestStatus:", error);
        return res.status(500).json({ success: false, message: "Failed to update request." });
    }
};

module.exports = { createFood, getMyFood, getAvailableFood, requestFood, getMyRequests, getIncomingRequests, updateRequestStatus };
