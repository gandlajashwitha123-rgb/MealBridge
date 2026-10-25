// ==========================================
// MEALBRIDGE - MY FOOD DONATIONS
// ==========================================

const API_URL = "http://localhost:5000/api";

// ==========================================
// LOGIN INFORMATION
// ==========================================

const token = localStorage.getItem("token");
const userString = localStorage.getItem("user");

// ==========================================
// CHECK LOGIN
// ==========================================

if (!token || !userString) {

    alert("Please login first.");

    window.location.href = "login.html";

}


// ==========================================
// READ USER
// ==========================================

let user;

try {

    user = JSON.parse(userString);

} catch (error) {

    console.error("User data error:", error);

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.location.href = "login.html";

}


// ==========================================
// CHECK MESS ROLE
// ==========================================

if (user && user.role !== "mess") {

    alert("Only mess staff can access this page.");

    window.location.href = "dashboard.html";

}


// ==========================================
// DISPLAY USER NAME
// ==========================================

const navUserName =
    document.getElementById("navUserName");

if (navUserName && user) {

    navUserName.textContent = user.name;

}


// ==========================================
// LOGOUT
// ==========================================

function logout() {

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.location.href = "index.html";

}


// ==========================================
// GET MY FOOD
// ==========================================

async function loadMyFood() {

    // ==========================================
    // CORRECT HTML IDs
    // ==========================================

    const foodGrid =
        document.getElementById("foodGrid");

    const loading =
        document.getElementById("foodLoading");

    const emptyState =
        document.getElementById("emptyFood");

    const message =
        document.getElementById("foodMessage");

    const totalFood =
        document.getElementById("totalFood");

    const availableFood =
        document.getElementById("availableFood");

    const claimedFood =
        document.getElementById("claimedFood");

    const expiredFood =
        document.getElementById("expiredFood");


    // ==========================================
    // DEBUG
    // ==========================================

    console.log("====================================");
    console.log("MEALBRIDGE - LOADING MY FOOD");
    console.log("====================================");


    // ==========================================
    // RESET PAGE
    // ==========================================

    if (loading) {

        loading.style.display = "block";

    }

    if (emptyState) {

        emptyState.style.display = "none";

    }

    if (message) {

        message.style.display = "none";
        message.textContent = "";

    }

    if (foodGrid) {

        foodGrid.innerHTML = "";

    }


    // ==========================================
    // GET CURRENT TOKEN
    // ==========================================

    const currentToken =
        localStorage.getItem("token");


    if (!currentToken) {

        window.location.href = "login.html";

        return;

    }


    try {

        console.log("Calling API:");
        console.log(`${API_URL}/food/my-food`);


        // ==========================================
        // API REQUEST
        // ==========================================

        const response =
            await fetch(
                `${API_URL}/food/my-food`,
                {

                    method: "GET",

                    headers: {

                        "Authorization":
                            `Bearer ${currentToken}`,

                        "Content-Type":
                            "application/json"

                    }

                }
            );


        console.log(
            "API Status:",
            response.status
        );


        // ==========================================
        // READ RESPONSE
        // ==========================================

        let data = {};

        try {

            data =
                await response.json();

        } catch (error) {

            console.error(
                "Could not read JSON:",
                error
            );

        }


        console.log(
            "My Food API Response:",
            data
        );


        // ==========================================
        // LOGIN ERROR
        // ==========================================

        if (response.status === 401) {

            alert(
                "Your login session has expired. Please login again."
            );

            localStorage.removeItem("token");
            localStorage.removeItem("user");

            window.location.href =
                "login.html";

            return;

        }


        // ==========================================
        // OTHER SERVER ERROR
        // ==========================================

        if (!response.ok) {

            throw new Error(
                data.message ||
                "Failed to load food donations."
            );

        }


        // ==========================================
        // GET FOOD ARRAY
        // ==========================================

        let food = [];


        /*
         * Supports common backend response formats:
         *
         * {
         *     food: [...]
         * }
         *
         * OR
         *
         * {
         *     foods: [...]
         * }
         *
         * OR
         *
         * [...]
         */

        if (Array.isArray(data)) {

            food = data;

        }

        else if (Array.isArray(data.food)) {

            food = data.food;

        }

        else if (Array.isArray(data.foods)) {

            food = data.foods;

        }

        else if (Array.isArray(data.data)) {

            food = data.data;

        }


        console.log(
            "Food donations found:",
            food.length
        );


        // ==========================================
        // UPDATE TOTAL COUNT
        // ==========================================

        if (totalFood) {

            totalFood.textContent =
                food.length;

        }


        // ==========================================
        // AVAILABLE COUNT
        // ==========================================

        const available =
            food.filter(
                item => {

                    const status =
                        String(
                            item.status || ""
                        ).toLowerCase();

                    return (
                        status === "available" ||
                        status === "partially_claimed"
                    );

                }
            ).length;


        // ==========================================
        // CLAIMED COUNT
        // ==========================================

        const claimed =
            food.filter(
                item => {

                    const status =
                        String(
                            item.status || ""
                        ).toLowerCase();

                    return status === "claimed";

                }
            ).length;


        // ==========================================
        // EXPIRED COUNT
        // ==========================================

        const expired =
            food.filter(
                item => {

                    const status =
                        String(
                            item.status || ""
                        ).toLowerCase();

                    return status === "expired";

                }
            ).length;


        // ==========================================
        // UPDATE STATISTICS
        // ==========================================

        if (availableFood) {

            availableFood.textContent =
                available;

        }


        if (claimedFood) {

            claimedFood.textContent =
                claimed;

        }


        if (expiredFood) {

            expiredFood.textContent =
                expired;

        }


        console.log(
            "Total:",
            food.length
        );

        console.log(
            "Available:",
            available
        );

        console.log(
            "Claimed:",
            claimed
        );

        console.log(
            "Expired:",
            expired
        );


        // ==========================================
        // STOP LOADING
        // ==========================================

        if (loading) {

            loading.style.display =
                "none";

        }


        // ==========================================
        // NO FOOD DONATIONS
        // ==========================================

        if (food.length === 0) {

            if (emptyState) {

                emptyState.style.display =
                    "block";

            }

            return;

        }


        // ==========================================
        // DISPLAY FOOD CARDS
        // ==========================================

        if (foodGrid) {

            foodGrid.innerHTML = "";


            food.forEach(
                item => {

                    const card =
                        createFoodCard(item);

                    foodGrid.appendChild(card);

                }
            );

        }

    }


    // ==========================================
    // ERROR
    // ==========================================

    catch (error) {

        console.error(
            "===================================="
        );

        console.error(
            "MY FOOD ERROR:"
        );

        console.error(error);

        console.error(
            "===================================="
        );


        // ==========================================
        // STOP LOADING
        // ==========================================

        if (loading) {

            loading.style.display =
                "none";

        }


        // ==========================================
        // SHOW ERROR
        // ==========================================

        if (message) {

            message.textContent =
                error.message ||
                "Unable to load your food donations.";

            message.style.display =
                "block";

            message.className =
                "message error";

        }

    }

}


// ==========================================
// CREATE FOOD CARD
// ==========================================

function createFoodCard(food) {

    const card =
        document.createElement("div");

    card.className =
        "food-card";


    // ==========================================
    // STATUS
    // ==========================================

    const status =
        food.status || "available";


    const statusClass =
        status;


    const statusText =
        formatStatus(status);


    // ==========================================
    // DATE / TIME
    // ==========================================

    const preparedTime =
        formatDateTime(
            food.preparedAt
        );


    const expiryTime =
        formatDateTime(
            food.expiryTime
        );


    // ==========================================
    // DESCRIPTION
    // ==========================================

    const description =
        food.description &&
        String(food.description).trim()
            ? food.description
            : "No description provided.";


    // ==========================================
    // FOOD NAME
    // ==========================================

    const foodName =
        food.foodName ||
        food.name ||
        "Food Donation";


    // ==========================================
    // CATEGORY
    // ==========================================

    const category =
        food.category ||
        "Food";


    // ==========================================
    // QUANTITY
    // ==========================================

    const quantity =
        food.quantity ||
        0;


    // ==========================================
    // UNIT
    // ==========================================

    const unit =
        food.unit ||
        "";


    // ==========================================
    // LOCATION
    // ==========================================

    const pickupLocation =
        food.pickupLocation ||
        "Not provided";


    // ==========================================
    // CONTACT
    // ==========================================

    const contactNumber =
        food.contactNumber ||
        "Not provided";


    // ==========================================
    // CARD HTML
    // ==========================================

    card.innerHTML = `

        <div class="food-card-top">

            <div style="
                display:flex;
                justify-content:space-between;
                align-items:center;
                gap:10px;
            ">

                <span class="food-category">

                    ${escapeHTML(category)}

                </span>


                <span class="status ${statusClass}">

                    ${statusText}

                </span>

            </div>


            <h3>

                ${escapeHTML(foodName)}

            </h3>

        </div>


        <div class="food-card-body">


            <div class="food-info">

                <span>🍱</span>

                <span>

                    ${escapeHTML(
                        String(quantity)
                    )}

                    ${escapeHTML(
                        String(unit)
                    )}

                </span>

            </div>


            <div class="food-info">

                <span>🕒</span>

                <span>

                    Prepared:
                    ${preparedTime}

                </span>

            </div>


            <div class="food-info">

                <span>📍</span>

                <span>

                    ${escapeHTML(
                        String(pickupLocation)
                    )}

                </span>

            </div>


            <div class="food-info">

                <span>📞</span>

                <span>

                    ${escapeHTML(
                        String(contactNumber)
                    )}

                </span>

            </div>


            <div class="food-expiry">

                ⏰ Expires:
                ${expiryTime}

            </div>


            <p class="food-description">

                ${escapeHTML(
                    String(description)
                )}

            </p>


        </div>

    `;


    return card;

}


// ==========================================
// FORMAT STATUS
// ==========================================

function formatStatus(status) {

    switch (status) {

        case "available":

            return "Available";


        case "partially_claimed":

            return "Partially Claimed";


        case "claimed":

            return "Claimed";


        case "expired":

            return "Expired";


        case "pending":

            return "Pending";


        case "accepted":

            return "Accepted";


        case "rejected":

            return "Rejected";


        case "completed":

            return "Completed";


        default:

            return "Available";

    }

}


// ==========================================
// FORMAT DATE + TIME
// ==========================================

function formatDateTime(value) {

    if (!value) {

        return "Not available";

    }


    const date =
        new Date(value);


    if (isNaN(date.getTime())) {

        return "Invalid date";

    }


    // ==========================================
    // KEEP AM / PM
    // ==========================================

    return date.toLocaleString(
        "en-IN",
        {

            day: "2-digit",

            month: "2-digit",

            year: "numeric",

            hour: "2-digit",

            minute: "2-digit",

            hour12: true

        }
    );

}


// ==========================================
// ESCAPE HTML
// ==========================================

function escapeHTML(value) {

    const div =
        document.createElement("div");

    div.textContent =
        value;

    return div.innerHTML;

}


// ==========================================
// START PAGE
// ==========================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        loadMyFood();

    }
);