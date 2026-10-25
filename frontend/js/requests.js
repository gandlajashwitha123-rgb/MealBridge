
 // =========================================================
 // MEALBRIDGE - REQUESTS
 // =========================================================

const API_URL =
    "http://localhost:5000/api";


const token =
    localStorage.getItem("token");


const userString =
    localStorage.getItem("user");


if (!token || !userString) {

    window.location.href =
        "login.html";

}


let user;

try {

    user =
        JSON.parse(userString);

} catch (error) {

    localStorage.clear();

    window.location.href =
        "login.html";

}


if (user && user.role !== "mess") {

    window.location.href =
        "dashboard.html";

}


const username =
    document.getElementById(
        "requestsUserName"
    );


if (username && user) {

    username.textContent =
        user.name || "Mess Staff";

}


document.addEventListener(
    "DOMContentLoaded",
    loadRequests
);


// =========================================================
// LOAD REQUESTS
// =========================================================

async function loadRequests() {

    const container =
        document.getElementById(
            "requestsList"
        );


    try {

        const response =
            await fetch(
                `${API_URL}/food/incoming-requests`,
                {

                    headers: {

                        "Authorization":
                            `Bearer ${token}`

                    }

                }
            );


        if (response.status === 401) {

            logout();

            return;

        }


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Failed to load requests."
            );

        }


        const requests =
            data.requests || [];


        if (!requests.length) {

            container.innerHTML = `

                <div class="request-empty">

                    <div class="request-empty-icon">
                        🤝
                    </div>

                    <h2>
                        No Incoming Requests
                    </h2>

                    <p>
                        NGO requests for your food donations will appear here.
                    </p>

                </div>

            `;

            return;

        }


        container.innerHTML = "";


        requests.forEach(
            function (request) {

                const card =
                    document.createElement("div");


                card.className =
                    "request-full-card";


                const ngo =
                    request.ngo || {};


                const ngoName =
                    ngo.name ||
                    "NGO";


                const status =
                    request.status ||
                    "pending";


                const requestId =
                    request.requestId ||
                    request._id;


                let actions = "";


                if (status === "pending") {

                    actions = `

                        <label
                            class="pickup-time-label"
                            for="pickup-${requestId}">

                            Assign Pickup Time

                            <input
                                type="datetime-local"
                                id="pickup-${requestId}"
                                required
                            >

                        </label>


                        <button
                            class="request-accept"
                            onclick="changeRequestStatus(
                                '${request.foodId}',
                                '${requestId}',
                                'accepted'
                            )">

                            ✓ Accept

                        </button>


                        <button
                            class="request-reject"
                            onclick="changeRequestStatus(
                                '${request.foodId}',
                                '${requestId}',
                                'rejected'
                            )">

                            ✕ Reject

                        </button>

                    `;

                }


                card.innerHTML = `

                    <div class="request-person-icon">
                        🤝
                    </div>


                    <div class="request-full-details">

                        <h2>
                            ${escapeHTML(
                                ngoName
                            )}
                        </h2>

                        <p class="request-food-name">

                            🍱
                            ${escapeHTML(
                                request.foodName || "Food"
                            )}

                        </p>

                        <p>

                            📦
                            Requested:
                            <strong>
                                ${request.quantity || 0}
                                ${escapeHTML(
                                    request.unit || ""
                                )}
                            </strong>

                        </p>

                        <p>

                            📍
                            ${escapeHTML(
                                request.pickupLocation || "-"
                            )}

                        </p>

                        <p>

                            📅
                            Requested:
                            ${formatDate(
                                request.requestedAt
                            )}

                        </p>

                        ${
                            request.message
                            ?
                            `<p>
                                💬 ${escapeHTML(
                                    request.message
                                )}
                            </p>`
                            :
                            ""
                        }

                        ${
                            request.pickupTime
                            ?
                            `<p>
                                🕒 Pickup:
                                ${formatDate(request.pickupTime)}
                            </p>`
                            :
                            ""
                        }

                    </div>


                    <div class="request-full-actions">

                        <span
                            class="request-status ${status}">

                            ${formatStatus(status)}

                        </span>


                        ${actions}

                    </div>

                `;


                container.appendChild(card);

            }
        );


    } catch (error) {

        console.error(error);


        container.innerHTML = `

            <div class="request-empty">

                <div class="request-empty-icon">
                    ⚠️
                </div>

                <h2>
                    Unable to Load Requests
                </h2>

                <p>
                    ${escapeHTML(
                        error.message
                    )}
                </p>

            </div>

        `;

    }

}


// =========================================================
// ACCEPT / REJECT
// =========================================================

async function changeRequestStatus(
    foodId,
    requestId,
    status
) {

    if (!foodId || !requestId) {

        showToast(
            "Request information is missing.",
            "⚠️"
        );

        return;

    }


    let pickupTime = null;


    // Pickup time is required when accepting.

    if (status === "accepted") {

        const pickupInput =
            document.getElementById(
                `pickup-${requestId}`
            );


        if (!pickupInput || !pickupInput.value) {

            showToast(
                "Please assign a pickup date and time.",
                "⚠️"
            );

            return;

        }


        pickupTime =
            new Date(pickupInput.value);


        if (
            Number.isNaN(
                pickupTime.getTime()
            )
        ) {

            showToast(
                "Please select a valid pickup time.",
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


    const action =
        status === "accepted"
            ? "accept"
            : "reject";


    if (
        !confirm(
            `Are you sure you want to ${action} this request?`
        )
    ) {

        return;

    }


    try {

        const body = {
            status: status
        };


        if (status === "accepted") {

            body.pickupTime =
                pickupTime.toISOString();

        }


        const response =
            await fetch(
                `${API_URL}/food/${foodId}/requests/${requestId}`,
                {

                    method: "PATCH",

                    headers: {

                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${token}`

                    },

                    body: JSON.stringify(body)

                }
            );


        if (response.status === 401) {

            logout();

            return;

        }


        const data =
            await response.json();


        if (!response.ok) {

            throw new Error(
                data.message ||
                "Unable to update request."
            );

        }


        showToast(
            data.message ||
            `Request ${status} successfully.`,
            "✓"
        );


        await loadRequests();


    } catch (error) {

        console.error(error);


        showToast(
            error.message ||
            "Failed to update request.",
            "⚠️"
        );

    }

}


// =========================================================
// FORMAT DATE
// =========================================================

function formatDate(date) {

    if (!date) {

        return "-";

    }


    const d =
        new Date(date);


    if (isNaN(d.getTime())) {

        return "-";

    }


    return d.toLocaleString(
        "en-IN",
        {

            day: "2-digit",

            month: "short",

            year: "numeric",

            hour: "2-digit",

            minute: "2-digit",

            hour12: true

        }
    );

}


// =========================================================
// STATUS
// =========================================================

function formatStatus(status) {

    return status
        .replace("_", " ")
        .replace(/\b\w/g, function (letter) {

            return letter.toUpperCase();

        });

}


// =========================================================
// ESCAPE HTML
// =========================================================

function escapeHTML(value) {

    if (value === null ||
        value === undefined) {

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


function showToast(
    message,
    icon
) {

    const toast =
        document.getElementById(
            "requestToast"
        );


    const toastMessage =
        document.getElementById(
            "requestToastMessage"
        );


    const toastIcon =
        document.getElementById(
            "requestToastIcon"
        );


    if (!toast || !toastMessage || !toastIcon) {

        alert(message);

        return;

    }


    toastMessage.textContent =
        message;


    toastIcon.textContent =
        icon;


    toast.classList.add("show");


    clearTimeout(toastTimer);


    toastTimer =
        setTimeout(
            function () {

                toast.classList.remove(
                    "show"
                );

            },
            3000
        );

}


// =========================================================
// LOGOUT
// =========================================================

function logout() {

    localStorage.removeItem("token");

    localStorage.removeItem("user");

    window.location.href =
        "login.html";

}