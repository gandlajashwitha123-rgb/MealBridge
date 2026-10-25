const API_URL = "http://localhost:5000/api";
const token = localStorage.getItem("token");

let user = {};
try {
  user = JSON.parse(localStorage.getItem("user") || "{}");
} catch {
  user = {};
}

if (!token) window.location.href = "login.html";
if (user.role && user.role !== "ngo") {
  window.location.href = "login.html";
}

const requestList = document.getElementById("requestList");
const messageBox = document.getElementById("message");

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&#39;"
  })[c]);
}

function dateText(value) {
  if (!value) return "Not assigned";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not assigned" : date.toLocaleString();
}

async function loadRequests() {
  messageBox.hidden = true;
  requestList.innerHTML = '<p class="empty">Loading requests...</p>';

  try {
    const response = await fetch(`${API_URL}/food/my-requests`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Could not load your requests.");
    }

    const requests = Array.isArray(data)
      ? data
      : data.requests || data.data || [];

    if (!requests.length) {
      requestList.innerHTML = `
        <article class="request-card">
          <div>
            <h3>No requests yet</h3>
            <p>Browse available food and submit your first request.</p>
            <p><a href="available-food.html">Browse available food →</a></p>
          </div>
        </article>`;
      return;
    }

    requestList.innerHTML = requests.map(request => `
      <article class="request-card">
        <div>
          <h3>${escapeHTML(request.foodName || "Food donation")}</h3>
          <p>Category: ${escapeHTML(request.category || "Not specified")}</p>
          <p>Quantity requested: ${escapeHTML(request.quantity)} ${escapeHTML(request.unit || "")}</p>
          <p>Pickup location: ${escapeHTML(request.pickupLocation || "Not specified")}</p>
          <p>Donor: ${escapeHTML(request.postedBy?.name || "MealBridge partner")}</p>
          <p>Requested on: ${escapeHTML(dateText(request.requestedAt))}</p>
          <p>Pickup time: ${escapeHTML(dateText(request.pickupTime))}</p>
          ${request.message
            ? `<p>Message: ${escapeHTML(request.message)}</p>`
            : ""}
        </div>
        <span class="status ${escapeHTML(request.status)}">
          ${escapeHTML(request.status || "pending")}
        </span>
      </article>
    `).join("");
  } catch (error) {
    requestList.innerHTML = '<p class="empty">Could not load requests.</p>';
    messageBox.textContent =
      `${error.message} Check your login and backend connection.`;
    messageBox.hidden = false;
  }
}

document.getElementById("refreshBtn").addEventListener("click", loadRequests);

document.getElementById("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.href = "login.html";
});

loadRequests();
