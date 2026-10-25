// MealBridge - NGO available food
const API_URL = "http://localhost:5000/api";
const token = localStorage.getItem("token");
const userString = localStorage.getItem("user");

if (!token || !userString) window.location.href = "login.html";

const getUser = () => {
    try { return JSON.parse(userString || "{}"); } catch { return {}; }
};
const authHeaders = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
const dateText = value => value ? new Date(value).toLocaleString() : "Not specified";

function showMessage(message, isError = false) {
    let el = document.getElementById("message");
    if (!el) {
        el = document.createElement("div");
        el.id = "message";
        const list = document.getElementById("foodList") || document.getElementById("foodContainer") || document.getElementById("availableFoodList") || document.getElementById("foodCards");
        (list?.parentElement || document.body).prepend(el);
    }
    el.textContent = message; el.hidden = false; el.className = "message";
    el.style.color = isError ? "#b42318" : "#147d45";
}

function getFoodContainer() {
    return document.getElementById("foodList") || document.getElementById("foodContainer") || document.getElementById("availableFoodList") || document.getElementById("foodCards") || document.getElementById("requestList");
}

async function loadAvailableFood() {
    const container = getFoodContainer();
    if (!container) return;
    container.innerHTML = '<p class="loading-message">Loading available food...</p>';
    try {
        const response = await fetch(`${API_URL}/food/available`, { headers: authHeaders });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Unable to load available food.");
        // Current controller returns { success: true, food: [...] }.
        const foods = Array.isArray(data) ? data : (data.food || data.foods || data.data || []);
        if (!foods.length) {
            container.innerHTML = '<p class="empty-message">No food donations are currently available. Please check again later.</p>';
            return;
        }
        container.innerHTML = foods.map(food => {
            const remaining = Number(food.remainingQuantity ?? food.quantity ?? 0);
            const donor = food.postedBy?.name || "Mess staff";
            const donorPhone = food.postedBy?.phone || food.contactNumber || "Not provided";
            return `<article class="food-card">
                <div class="food-card-content">
                    <h3>${escapeHtml(food.foodName)}</h3>
                    <p><strong>Category:</strong> ${escapeHtml(food.category)}</p>
                    <p><strong>Available quantity:</strong> <span class="available-quantity">${escapeHtml(remaining)} ${escapeHtml(food.unit)}</span></p>
                    <p><strong>Description:</strong> ${escapeHtml(food.description || "No description provided")}</p>
                    <p><strong>Pickup location:</strong> ${escapeHtml(food.pickupLocation || "Not provided")}</p>
                    <p><strong>Mess contact:</strong> ${escapeHtml(donorPhone)}</p>
                    <p><strong>Posted by:</strong> ${escapeHtml(donor)}</p>
                    <p><strong>Expires:</strong> ${escapeHtml(dateText(food.expiryTime))}</p>
                    <button type="button" class="request-food-btn" data-food-id="${escapeHtml(food._id)}" data-max="${remaining}" ${remaining < 1 ? "disabled" : ""}>Request Food</button>
                </div>
            </article>`;
        }).join("");
        container.querySelectorAll(".request-food-btn").forEach(button => button.addEventListener("click", () => requestFood(button.dataset.foodId, Number(button.dataset.max))));
    } catch (error) {
        container.innerHTML = `<p class="error-message">${escapeHtml(error.message)}</p>`;
    }
}

async function requestFood(foodId, maxQuantity) {
    const quantityText = window.prompt(`Enter quantity to request (1 to ${maxQuantity}):`);
    if (quantityText === null) return;
    const quantity = Number(quantityText);
    if (!Number.isInteger(quantity) || quantity < 1) return showMessage("Please enter a whole-number quantity greater than zero.", true);
    if (quantity > maxQuantity) return showMessage(`Only ${maxQuantity} units are currently available to request.`, true);
    const message = window.prompt("Add a message for the mess staff (optional):", "") || "";
    try {
        const response = await fetch(`${API_URL}/food/${encodeURIComponent(foodId)}/request`, {
            method: "POST", headers: authHeaders, body: JSON.stringify({ quantity, message })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Request failed.");
        showMessage(data.message || "Food request submitted successfully!");
        await loadAvailableFood();
    } catch (error) { showMessage(error.message, true); }
}

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "login.html";
}

document.addEventListener("DOMContentLoaded", () => {
    const user = getUser();
    const nameEl = document.getElementById("navUserName");
    if (nameEl) nameEl.textContent = user.name || "NGO";
    document.getElementById("refreshBtn")?.addEventListener("click", loadAvailableFood);
    document.getElementById("logoutBtn")?.addEventListener("click", logout);
    loadAvailableFood();
});
