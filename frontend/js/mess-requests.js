
/* MealBridge - Mess Staff Incoming Requests */

const API_URL = "http://localhost:5000/api";
const token = localStorage.getItem("token");

let user = {};

try {
    user = JSON.parse(localStorage.getItem("user") || "{}");
} catch {
    user = {};
}

if (!token || !localStorage.getItem("user")) {
    window.location.href = "login.html";
}

if (user.role && user.role !== "mess") {
    window.location.href = "login.html";
}

const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`
};

const esc = value =>
    String(value ?? "").replace(/[&<>"']/g, ch => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[ch]);

const fmtDate = value => {
    if (!value) return "Not assigned";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? "Not assigned"
        : date.toLocaleString();
};

/*
 * Safely read API responses.
 * This prevents the "Unexpected token '<'" error when
 * the server returns HTML instead of JSON.
 */
async function readResponse(response) {
    const text = await response.text();

    let data;

    try {
        data = JSON.parse(text);
    } catch {
        if (text.trim().startsWith("<")) {
            throw new Error(
                `The server returned an HTML page instead of JSON (HTTP ${response.status}). ` +
                "Check the API URL and backend route."
            );
        }

        throw new Error(
            `The server returned an invalid response (HTTP ${response.status}).`
        );
    }

    if (!response.ok) {
        throw new Error(
            data.message || `Request failed (HTTP ${response.status}).`
        );
    }

    return data;
}

function setMessage(text, error = false) {
    const el = document.getElementById("message");

    if (el) {
        el.textContent = text;
        el.style.color = error ? "#b42318" : "#147d45";
        el.hidden = false;
    }
}

async function loadIncomingRequests() {
    const list = document.getElementById("requestList");

    if (!list) return;

    list.innerHTML = "<p>Loading requests...</p>";

    try {
        const response = await fetch(
            `${API_URL}/food/incoming-requests`,
            { headers }
        );

        const data = await readResponse(response);

        const requests = Array.isArray(data)
            ? data
            : data.requests || data.data || [];

        if (!requests.length) {
            list.innerHTML = "<p>No food requests received yet.</p>";
            return;
        }

        list.innerHTML = requests.map(request => {
            const ngo = request.ngo?.name || "NGO";
            const phone = request.ngo?.phone || "Not provided";

            const foodId =
                request.foodId?._id ||
                request.foodId ||
                request.food?._id ||
                "";

            const requestId =
                request.requestId ||
                request._id ||
                "";

            let actions = "";

            if (request.status === "pending") {
                actions = `
                    <label class="pickup-time-label">
                        Pickup time
                        <input
                            type="datetime-local"
                            class="pickup-time-input"
                            data-request-id="${esc(requestId)}"
                            required
                        >
                    </label>

                    <div class="request-actions">
                        <button
                            type="button"
                            class="accept-request-btn"
                            data-food-id="${esc(foodId)}"
                            data-request-id="${esc(requestId)}"
                        >
                            Accept
                        </button>

                        <button
                            type="button"
                            class="reject-request-btn"
                            data-food-id="${esc(foodId)}"
                            data-request-id="${esc(requestId)}"
                        >
                            Reject
                        </button>
                    </div>
                `;
            } else if (request.status === "accepted") {
                actions = `
                    <p>
                        <strong>Pickup time:</strong>
                        ${esc(fmtDate(request.pickupTime))}
                    </p>

                    <button
                        type="button"
                        class="complete-request-btn"
                        data-food-id="${esc(foodId)}"
                        data-request-id="${esc(requestId)}"
                    >
                        Mark Pickup Completed
                    </button>
                `;
            } else {
                actions = `
                    <p>
                        <strong>Pickup time:</strong>
                        ${esc(fmtDate(request.pickupTime))}
                    </p>
                `;
            }

            return `
                <article class="request-card">
                    <h3>${esc(request.foodName || "Food request")}</h3>

                    <p>
                        <strong>NGO:</strong>
                        ${esc(ngo)}
                    </p>

                    <p>
                        <strong>NGO contact:</strong>
                        ${esc(phone)}
                    </p>

                    <p>
                        <strong>Requested quantity:</strong>
                        ${esc(request.quantity)}
                        ${esc(request.unit || "units")}
                    </p>

                    <p>
                        <strong>Message:</strong>
                        ${esc(request.message || "No message")}
                    </p>

                    <p>
                        <strong>Requested on:</strong>
                        ${esc(fmtDate(request.requestedAt))}
                    </p>

                    <p>
                        <strong>Status:</strong>
                        <span class="status-${esc(request.status)}">
                            ${esc(request.status)}
                        </span>
                    </p>

                    ${actions}
                </article>
            `;
        }).join("");

        list.querySelectorAll(".accept-request-btn").forEach(button => {
            button.addEventListener("click", () => {
                updateStatus(
                    button.dataset.foodId,
                    button.dataset.requestId,
                    "accepted"
                );
            });
        });

        list.querySelectorAll(".reject-request-btn").forEach(button => {
            button.addEventListener("click", () => {
                updateStatus(
                    button.dataset.foodId,
                    button.dataset.requestId,
                    "rejected"
                );
            });
        });

        list.querySelectorAll(".complete-request-btn").forEach(button => {
            button.addEventListener("click", () => {
                if (window.confirm(
                    "Confirm that the NGO has picked up this food?"
                )) {
                    updateStatus(
                        button.dataset.foodId,
                        button.dataset.requestId,
                        "completed"
                    );
                }
            });
        });

    } catch (error) {
        list.innerHTML = `
            <p class="error-message">${esc(error.message)}</p>
        `;

        setMessage(error.message, true);
    }
}


async function updateStatus(foodId, requestId, status) {
    if (!foodId || !requestId) {
        setMessage(
            "Missing food ID or request ID. Please refresh the page and try again.",
            true
        );
        return;
    }

    const body = { status };

    if (status === "accepted") {
        const input = document.querySelector(
            `.pickup-time-input[data-request-id="${CSS.escape(requestId)}"]`
        );

        if (!input || !input.value) {
            setMessage(
                "Please select a pickup time before accepting.",
                true
            );
            return;
        }

        const pickupDate = new Date(input.value);

        if (Number.isNaN(pickupDate.getTime())) {
            setMessage("Please enter a valid pickup time.", true);
            return;
        }

        if (pickupDate.getTime() <= Date.now()) {
            setMessage("Please select a future pickup time.", true);
            return;
        }

        body.pickupTime = pickupDate.toISOString();
    }

    try {
        const url =
            `${API_URL}/food/${encodeURIComponent(foodId)}/requests/${encodeURIComponent(requestId)}`;

        console.log("MealBridge request URL:", url);
        console.log("MealBridge request method: PATCH");

        const response = await fetch(url, {
            method: "PATCH",
            headers,
            body: JSON.stringify(body)
        });

        const text = await response.text();

        let data;

        try {
            data = JSON.parse(text);
        } catch {
            console.error("Non-JSON server response:", text);

            throw new Error(
                `The server returned a non-JSON response (HTTP ${response.status}). ` +
                "Check the Request URL and backend route."
            );
        }

        if (!response.ok) {
            throw new Error(
                data.message || `Could not update request (HTTP ${response.status}).`
            );
        }

        setMessage(
            data.message || `Request ${status} successfully.`
        );

        await loadIncomingRequests();

    } catch (error) {
        console.error("MealBridge update error:", error);
        setMessage(error.message, true);
    }
}

function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.clear();

    window.location.href = "login.html";
}

document.addEventListener("DOMContentLoaded", () => {
    const nameEl = document.getElementById("navUserName");

    if (nameEl) {
        nameEl.textContent = user.name || "Mess Staff";
    }

    document.getElementById("refreshBtn")
        ?.addEventListener("click", loadIncomingRequests);

    document.getElementById("logoutBtn")
        ?.addEventListener("click", logout);

    loadIncomingRequests();
});