
// =========================================================
// MEALBRIDGE - MESS DASHBOARD JAVASCRIPT
// =========================================================

const API_URL = "http://localhost:5000/api";


// =========================================================
// LOGIN INFORMATION
// =========================================================

const token = localStorage.getItem("token");
const userString = localStorage.getItem("user");


// =========================================================
// CHECK LOGIN
// =========================================================

if (!token || !userString) {
    alert("Please login first.");
    window.location.href = "login.html";
}


// =========================================================
// READ USER
// =========================================================

let user = null;

try {
    user = JSON.parse(userString);
} catch (error) {
    console.error("User data error:", error);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "login.html";
}


// =========================================================
// CHECK ROLE
// =========================================================

if (user && user.role !== "mess") {
    alert("Only mess staff can access this dashboard.");
    window.location.href = "dashboard.html";
}


// =========================================================
// DISPLAY USER NAME
// =========================================================

const navUserName = document.getElementById("navUserName");
const welcomeUserName = document.getElementById("welcomeUserName");

if (user) {
    if (navUserName) {
        navUserName.textContent = user.name || "Mess Staff";
    }

    if (welcomeUserName) {
        welcomeUserName.textContent = user.name || "Mess Staff";
    }
}


// =========================================================
// PAGE NAVIGATION
// =========================================================

function openPostFood() {
    window.location.href = "post-food.html";
}

function openMyFood() {
    window.location.href = "my-food.html";
}

function openRequests() {
    window.location.href = "requests.html";
}


// =========================================================
// LOAD DASHBOARD
// =========================================================

document.addEventListener("DOMContentLoaded", function () {
    loadMyFood();
    loadIncomingRequests();
});


// =========================================================
// LOAD MY FOOD
// =========================================================

async function loadMyFood() {
    const container = document.getElementById("recentDonations");

    try {
        const response = await fetch(`${API_URL}/food/my-food`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        if (response.status === 401) {
            logout();
            return;
        }

        const data = await response.json();

        console.log("My Food:", data);

        if (!response.ok) {
            throw new Error(
                data.message || "Failed to load food."
            );
        }

        const foods = data.food || [];

        // -----------------------------------------
        // DONATION COUNT
        // -----------------------------------------

        const donationCount =
            document.getElementById("foodDonationCount");

        if (donationCount) {
            donationCount.textContent = foods.length;
        }

        // -----------------------------------------
        // MEALS RESCUED
        // -----------------------------------------

        let rescuedMeals = 0;

        foods.forEach(function (food) {
            const quantity = Number(food.quantity) || 0;
            rescuedMeals += quantity;
        });

        const rescuedElement =
            document.getElementById("rescuedMealsCount");

        const impactNumber =
            document.getElementById("impactNumber");

        if (rescuedElement) {
            rescuedElement.textContent = rescuedMeals;
        }

        if (impactNumber) {
            impactNumber.textContent = rescuedMeals;
        }

        // -----------------------------------------
        // RECENT DONATIONS
        // -----------------------------------------

        if (!foods.length) {
            container.innerHTML = `
                <div class="empty-dashboard-state">
                    <div class="empty-dashboard-icon">
                        🍱
                    </div>

                    <strong>
                        No food donations yet
                    </strong>

                    <span>
                        Start by posting your surplus food.
                    </span>

                    <button onclick="openPostFood()">
                        + Post Food
                    </button>
                </div>
            `;

            return;
        }

        const recentFoods = foods.slice(0, 3);

        container.innerHTML = "";

        recentFoods.forEach(function (food) {
            const item = document.createElement("div");

            item.className = "recent-food-item";

            const status = food.status || "available";

            item.innerHTML = `
                <div class="food-mini-icon">
                    🍱
                </div>

                <div class="recent-food-details">
                    <h3>
                        ${escapeHTML(food.foodName)}
                    </h3>

                    <p>
                        ${escapeHTML(food.category || "Food")}
                        •
                        ${food.quantity || 0}
                        ${escapeHTML(food.unit || "")}
                    </p>

                    <p class="recent-food-time">
                        📍
                        ${escapeHTML(
                            food.pickupLocation || "Pickup location"
                        )}
                    </p>
                </div>

                <span class="food-status ${status}">
                    ${formatStatus(status)}
                </span>
            `;

            container.appendChild(item);
        });

    } catch (error) {
        console.error("Load My Food Error:", error);

        container.innerHTML = `
            <div class="empty-dashboard-state">
                <div class="empty-dashboard-icon">
                    ⚠️
                </div>

                <strong>
                    Unable to load donations
                </strong>

                <span>
                    Please make sure the backend is running.
                </span>
            </div>
        `;
    }
}


// =========================================================
// LOAD INCOMING REQUESTS
// =========================================================

async function loadIncomingRequests() {
    const container =
        document.getElementById("incomingRequests");

    if (!container) {
        console.error(
            "Element #incomingRequests was not found."
        );
        return;
    }

    try {
        const response = await fetch(
            `${API_URL}/food/incoming-requests`,
            {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        if (response.status === 401) {
            logout();
            return;
        }

        const data = await response.json();

        console.log("Incoming Requests Response:", data);
        console.log("Response Status:", response.status);

        if (!response.ok) {
            throw new Error(
                data.message || `Request failed: ${response.status}`
            );
        }

        const requests = Array.isArray(data.requests)
            ? data.requests
            : [];

        const requestCount =
            document.getElementById("requestCount");

        if (requestCount) {
            requestCount.textContent = requests.length;
        }

        if (requests.length === 0) {
            container.innerHTML = `
                <div class="empty-dashboard-state">
                    <div class="empty-dashboard-icon">
                        🤝
                    </div>

                    <strong>
                        No incoming requests
                    </strong>

                    <span>
                        NGO requests will appear here.
                    </span>
                </div>
            `;

            return;
        }

        // Keep the existing dashboard layout:
        // show the latest 3 requests.
        const recentRequests = requests.slice(0, 3);

        container.innerHTML = "";

        recentRequests.forEach(function (request) {
            const item = document.createElement("div");

            item.className = "recent-request-item";

            const ngo = request.ngo || {};
            const ngoName = ngo.name || "NGO";

            const requestStatus = String(
                request.status || "pending"
            ).toLowerCase();

            const requestId = request.requestId || request._id;
            const foodId = request.foodId;

            let actionHTML = "";

            // -----------------------------------------
            // PENDING: ACCEPT OR REJECT
            // -----------------------------------------

            if (requestStatus === "pending") {
                const hourOptions = Array.from(
                    { length: 12 },
                    (_, i) =>
                        `<option value="${i + 1}">${i + 1}</option>`
                ).join("");

                const minuteOptions = Array.from(
                    { length: 12 },
                    (_, i) => {
                        const minute = String(i * 5).padStart(2, "0");

                        return `
                            <option value="${minute}">
                                ${minute}
                            </option>
                        `;
                    }
                ).join("");

                actionHTML = `
                    <div class="request-buttons">

                        <label for="pickup-date-${requestId}">
                            Pickup date
                        </label>

                        <input
                            type="date"
                            id="pickup-date-${requestId}"
                            required
                        >

                        <label for="pickup-hour-${requestId}">
                            Pickup time
                        </label>

                        <div style="display:flex; gap:6px; flex-wrap:wrap;">
                            <select id="pickup-hour-${requestId}">
                                ${hourOptions}
                            </select>

                            <select id="pickup-minute-${requestId}">
                                ${minuteOptions}
                            </select>

                            <select id="pickup-period-${requestId}">
                                <option value="AM">AM</option>
                                <option value="PM">PM</option>
                            </select>
                        </div>

                        <button
                            class="accept-request-btn"
                            onclick="updateRequest(
                                '${foodId}',
                                '${requestId}',
                                'accepted'
                            )">
                            Accept
                        </button>

                        <button
                            class="reject-request-btn"
                            onclick="updateRequest(
                                '${foodId}',
                                '${requestId}',
                                'rejected'
                            )">
                            Reject
                        </button>

                    </div>
                `;
            }

            // -----------------------------------------
            // ACCEPTED: MARK AS PICKED UP
            // -----------------------------------------

            else if (requestStatus === "accepted") {
                actionHTML = `
                    <div class="request-buttons">

                        <button
                            class="complete-request-btn"
                            onclick="updateRequest(
                                '${foodId}',
                                '${requestId}',
                                'completed'
                            )">
                            ✓ Mark as Picked Up
                        </button>

                    </div>
                `;
            }

            // -----------------------------------------
            // REQUEST STATUS LABELS
            // -----------------------------------------

            const statusLabels = {
                pending: "⏳ Pending",
                accepted: "🕒 Accepted — Pickup Scheduled",
                rejected: "✕ Rejected",
                completed: "✅ Picked Up — Completed"
            };

            const statusLabel =
                statusLabels[requestStatus] || "⏳ Pending";

            // -----------------------------------------
            // PICKUP DATE AND TIME
            // Keep showing it after completion.
            // -----------------------------------------

            const pickupHTML =
                (
                    requestStatus === "accepted" ||
                    requestStatus === "completed"
                ) && request.pickupTime
                    ? `
                        <p class="request-pickup-time">
                            🕒 Pickup: ${formatDate(request.pickupTime)}
                        </p>
                    `
                    : "";

            // -----------------------------------------
            // REQUEST CARD
            // -----------------------------------------

            item.innerHTML = `
                <div class="request-avatar">
                    🤝
                </div>

                <div class="request-details">

                    <h3>
                        ${escapeHTML(ngoName)}
                    </h3>

                    <p>
                        ${escapeHTML(request.foodName || "Food")}
                        •
                        ${escapeHTML(request.quantity ?? 0)}
                        ${escapeHTML(request.unit || "")}
                    </p>

                    <div class="request-status ${escapeHTML(requestStatus)}">
                        ${statusLabel}
                    </div>

                    ${pickupHTML}

                </div>

                ${actionHTML}
            `;

            container.appendChild(item);
        });

    } catch (error) {
        console.error("Load Requests Error:", error);

        container.innerHTML = `
            <div class="empty-dashboard-state">
                <div class="empty-dashboard-icon">
                    ⚠️
                </div>

                <strong>
                    Unable to load requests
                </strong>

                <span>
                    ${escapeHTML(
                        error.message ||
                        "An unexpected error occurred."
                    )}
                </span>
            </div>
        `;
    }
}


// =========================================================
// UPDATE REQUEST
// =========================================================

async function updateRequest(foodId, requestId, status) {

    if (!foodId || !requestId) {
        showToast(
            "Request information is missing.",
            "⚠️"
        );
        return;
    }

    let pickupTime = null;

    // -----------------------------------------
    // VALIDATE PICKUP DATE AND TIME
    // Required only when accepting a request.
    // -----------------------------------------

    if (status === "accepted") {

        const dateInput = document.getElementById(
            `pickup-date-${requestId}`
        );

        const hourInput = document.getElementById(
            `pickup-hour-${requestId}`
        );

        const minuteInput = document.getElementById(
            `pickup-minute-${requestId}`
        );

        const periodInput = document.getElementById(
            `pickup-period-${requestId}`
        );

        if (
            !dateInput || !dateInput.value ||
            !hourInput || !minuteInput || !periodInput
        ) {
            showToast(
                "Please select the pickup date and time.",
                "⚠️"
            );
            return;
        }

        let hour = Number(hourInput.value);

        if (periodInput.value === "AM") {
            if (hour === 12) hour = 0;
        } else {
            if (hour !== 12) hour += 12;
        }

        const [year, month, day] = dateInput.value
            .split("-")
            .map(Number);

        pickupTime = new Date(
            year,
            month - 1,
            day,
            hour,
            Number(minuteInput.value),
            0
        );

        if (
            Number.isNaN(pickupTime.getTime()) ||
            pickupTime.getFullYear() !== year ||
            pickupTime.getMonth() !== month - 1 ||
            pickupTime.getDate() !== day
        ) {
            showToast(
                "Please select a valid pickup date and time.",
                "⚠️"
            );
            return;
        }

        if (pickupTime <= new Date()) {
            showToast(
                "Pickup time must be in the future.",
                "⚠️"
            );
            return;
        }
    }

    // -----------------------------------------
    // CORRECT CONFIRMATION FOR EACH ACTION
    // This fixes the incorrect "reject" message.
    // -----------------------------------------

    const confirmationMessages = {
        accepted:
            "Are you sure you want to accept this request and schedule pickup?",

        rejected:
            "Are you sure you want to reject this request?",

        completed:
            "Have you verified that the NGO has picked up the food? Mark this request as completed?"
    };

    const confirmMessage = confirmationMessages[status];

    if (!confirmMessage) {
        showToast("Invalid request action.", "⚠️");
        return;
    }

    if (!confirm(confirmMessage)) {
        return;
    }

    // -----------------------------------------
    // SEND STATUS UPDATE TO BACKEND
    // -----------------------------------------

    try {

        const body = { status };

        if (status === "accepted") {
            body.pickupTime = pickupTime.toISOString();
        }

        const response = await fetch(
            `${API_URL}/food/${foodId}/requests/${requestId}`,
            {
                method: "PATCH",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },

                body: JSON.stringify(body)
            }
        );

        if (response.status === 401) {
            logout();
            return;
        }

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Failed to update request."
            );
        }

        // -----------------------------------------
        // CORRECT SUCCESS MESSAGE FOR EACH ACTION
        // -----------------------------------------

        const successMessages = {
            accepted:
                "Request accepted and pickup scheduled ✓",

            rejected:
                "Request rejected ✓",

            completed:
                "Pickup confirmed. Request marked as completed ✓"
        };

        showToast(
            successMessages[status] || "Request updated successfully ✓",
            "✓"
        );

        // -----------------------------------------
        // REFRESH STAFF DASHBOARD
        // The latest status is fetched from the backend.
        // Completed requests should now show:
        // "✅ Picked Up — Completed"
        // -----------------------------------------

        await loadIncomingRequests();
        await loadMyFood();

    } catch (error) {

        console.error("Update Request Error:", error);

        showToast(
            error.message || "Unable to update request.",
            "⚠️"
        );
    }
}


// =========================================================
// IMPACT CARD
// =========================================================

function showImpact() {

    const banner = document.getElementById("impactBanner");

    if (banner) {
        banner.scrollIntoView({
            behavior: "smooth",
            block: "center"
        });
    }

    showToast(
        "Every rescued meal makes a difference! ❤️",
        "❤️"
    );
}


// =========================================================
// DATE FORMATTER
// =========================================================

function formatDate(dateValue) {

    if (!dateValue) return "";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "Date unavailable";
    }

    return date.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
    });
}


// =========================================================
// STATUS FORMATTER
// =========================================================

function formatStatus(status) {

    return status
        .replace("_", " ")
        .replace(/\b\w/g, function (letter) {
            return letter.toUpperCase();
        });
}


// =========================================================
// HTML SAFETY
// =========================================================

function escapeHTML(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// =========================================================
// TOAST
// =========================================================

let toastTimer;

function showToast(message, icon = "✓") {

    const toast = document.getElementById("dashboardToast");

    const toastMessage = document.getElementById("toastMessage");

    const toastIcon = document.getElementById("toastIcon");

    if (!toast) {
        return;
    }

    toastMessage.textContent = message;
    toastIcon.textContent = icon;

    toast.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(function () {
        toast.classList.remove("show");
    }, 3000);
}

/* =========================================================
MEALBRIDGE - CUSTOM MODAL HELPERS
========================================================= */


function mbEscape(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (char) {
        const replacements = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return replacements[char];
    });
}

function mbShowModal({
title,
message,
icon = "🌱",
confirmText = "Continue",
cancelText = "Cancel",
danger = false,
formHTML = "",
validate = null
}) {
return new Promise(resolve => {
const oldModal = document.getElementById("mbModalOverlay");
if (oldModal) oldModal.remove();

    const overlay = document.createElement("div");
    overlay.id = "mbModalOverlay";
    overlay.className = "mb-modal-overlay";

    overlay.innerHTML = `
        <section class="mb-modal"
                 role="dialog"
                 aria-modal="true"
                 aria-labelledby="mbModalTitle">

            <div class="mb-modal-icon">${icon}</div>

            <h2 id="mbModalTitle">${mbEscape(title)}</h2>

            <p class="mb-modal-description">${mbEscape(message)}</p>

            ${formHTML}

            <div class="mb-modal-error"
                 id="mbModalError"
                 role="alert"></div>

            <div class="mb-modal-actions">
                <button type="button"
                        class="mb-modal-btn mb-modal-cancel"
                        id="mbModalCancel">
                    ${mbEscape(cancelText)}
                </button>

                <button type="button"
                        class="mb-modal-btn ${danger ? "mb-modal-danger" : "mb-modal-primary"}"
                        id="mbModalConfirm">
                    ${mbEscape(confirmText)}
                </button>
            </div>
        </section>
    `;

    document.body.appendChild(overlay);

    let finished = false;

    function close(result) {
        if (finished) return;
        finished = true;

        document.removeEventListener("keydown", onKeyDown);
        overlay.remove();
        resolve(result);
    }

    function onKeyDown(event) {
        if (event.key === "Escape") close(null);

        if (event.key === "Enter" &&
            event.target.tagName !== "TEXTAREA") {
            event.preventDefault();
            overlay.querySelector("#mbModalConfirm").click();
        }
    }

    overlay.addEventListener("click", event => {
        if (event.target === overlay) close(null);
    });

    overlay.querySelector("#mbModalCancel")
        .addEventListener("click", () => close(null));

    overlay.querySelector("#mbModalConfirm")
        .addEventListener("click", async () => {
            const errorBox = overlay.querySelector("#mbModalError");
            errorBox.textContent = "";

            if (validate) {
                try {
                    const result = await validate(overlay);

                    if (result && result.error) {
                        errorBox.textContent = result.error;
                        return;
                    }

                    close(result);
                } catch (error) {
                    errorBox.textContent =
                        error.message || "Please check your input.";
                }
            } else {
                close(true);
            }
        });

    document.addEventListener("keydown", onKeyDown);

    requestAnimationFrame(() => {
        overlay.classList.add("mb-modal-open");

        const firstInput = overlay.querySelector(
            "input:not([type=hidden]), textarea"
        );

        if (firstInput) firstInput.focus();
        else overlay.querySelector("#mbModalConfirm").focus();
    });
});

}

function mbConfirmAction(status) {
const details = {
accepted: {
title: "Accept this request?",
message: "Are you ready to accept this NGO request and schedule the food pickup?",
icon: "🤝",
confirmText: "Yes, accept",
danger: false
},
rejected: {
title: "Reject this request?",
message: "Are you sure you want to reject this food request? This action will update the request status.",
icon: "⚠️",
confirmText: "Yes, reject",
danger: true
},
completed: {
title: "Confirm food pickup",
message: "Have you verified that the NGO has collected the food? Confirm only when the pickup is complete.",
icon: "📦",
confirmText: "Confirm pickup",
danger: false
}
};

const options = details[status];
if (!options) return Promise.resolve(null);

return mbShowModal(options);

}

// =========================================================
// LOGOUT
// =========================================================

function logout() {

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    window.location.href = "login.html";
}