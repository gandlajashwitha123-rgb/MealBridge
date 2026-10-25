
const Food = require("../models/Food");
const User = require("../models/User");

// GET SMART RECIPIENT RECOMMENDATIONS
const getRecommendations = async (req, res) => {
    try {
        const food = await Food.findOne({
            _id: req.params.foodId,
            postedBy: req.user.id
        });

        if (!food) {
            return res.status(404).json({
                success: false,
                message: "Food donation not found or you do not own it."
            });
        }

        if (new Date(food.expiryTime) <= new Date()) {
            return res.status(400).json({
                success: false,
                message: "This food has expired. Recommendations are unavailable."
            });
        }

        const acceptedQuantity = food.requests
            .filter(request => request.status === "accepted")
            .reduce((total, request) => total + request.quantity, 0);

        const remainingQuantity = Math.max(
            0,
            food.quantity - acceptedQuantity
        );

        if (remainingQuantity <= 0) {
            return res.status(400).json({
                success: false,
                message: "No food quantity remains for recommendation."
            });
        }

        const ngos = await User.find({
            role: "ngo",
            isActive: true
        }).select(
            "name email phone preferredCategories dailyCapacity estimatedDistanceKm"
        );

        const foodCategory = food.category.trim().toLowerCase();

        const recommendations = ngos.map(ngo => {
            const capacity = Math.max(0, ngo.dailyCapacity || 0);
            const distance = Math.max(0, ngo.estimatedDistanceKm || 0);

            // Capacity suitability: can the NGO handle the remaining quantity?
            const capacityScore = capacity >= remainingQuantity
                ? 100
                : Math.round((capacity / remainingQuantity) * 100);

            // Category suitability
            const categories = (ngo.preferredCategories || [])
                .map(category => category.trim().toLowerCase());

            const categoryScore =
                categories.length === 0
                    ? 50
                    : categories.includes(foodCategory)
                        ? 100
                        : 0;

            // Distance suitability: closer NGOs receive higher scores.
            const distanceScore = Math.max(
                0,
                Math.round(100 - distance * 5)
            );

            // Explainable weighted recommendation score
            const score = Math.round(
                capacityScore * 0.35 +
                categoryScore * 0.45 +
                distanceScore * 0.20
            );

            const reasons = [];

            if (capacityScore === 100) {
                reasons.push("Capacity is sufficient");
            } else {
                reasons.push("May not handle the full quantity");
            }

            if (categoryScore === 100) {
                reasons.push("Preferred food category matches");
            } else if (categoryScore === 50) {
                reasons.push("Food preferences are not configured");
            } else {
                reasons.push("Food category is not listed as preferred");
            }

            if (distance <= 5) {
                reasons.push("Located within the demo's 5 km range");
            }

            return {
                ngo: {
                    id: ngo._id,
                    name: ngo.name,
                    email: ngo.email,
                    phone: ngo.phone
                },
                capacity,
                estimatedDistanceKm: distance,
                capacityScore,
                categoryScore,
                distanceScore,
                matchScore: score,
                reasons
            };
        });

        recommendations.sort(
            (a, b) => b.matchScore - a.matchScore
        );

        res.json({
            success: true,
            food: {
                id: food._id,
                foodName: food.foodName,
                category: food.category,
                quantityAvailable: remainingQuantity,
                unit: food.unit,
                expiryTime: food.expiryTime
            },
            scoring: {
                capacityWeight: 35,
                categoryWeight: 45,
                distanceWeight: 20,
                distanceIsEstimated: true
            },
            recommendations
        });
    } catch (error) {
        console.error("Recommendation error:", error);

        res.status(500).json({
            success: false,
            message: "Failed to generate recipient recommendations."
        });
    }
};

module.exports = {
    getRecommendations
};