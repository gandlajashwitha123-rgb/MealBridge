
const API_URL = "http://localhost:5000/api";
const token = localStorage.getItem("token");

let currentUser = {};
try {
  currentUser = JSON.parse(localStorage.getItem("user") || "{}");
} catch {
  currentUser = {};
}

if (!token) {
  window.location.href = "login.html";
}

if (currentUser.role && currentUser.role !== "ngo") {
  window.location.href =
    currentUser.role === "mess" ? "mess-dashboard.html" : "login.html";
}

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${token}`
};

const $ = (id) => document.getElementById(id);

function safe(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function showMessage(message) {
  const box = $("message");
  if (!box) return;

  box.textContent = message;
  box.hidden = false;
}

async function apiGet(path) {
  const response = await fetch(`${API_URL}${path}`, { headers });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

async function loadDashboard() {
  if ($("ngoName")) {
    $("ngoName").textContent = currentUser.name || "Partner";
  }

  try {
    const [foodData, requestData] = await Promise.all([
      apiGet("/food/available"),
      apiGet("/food/my-requests")
    ]);

    // FIX: The backend returns available food in foodData.food.
    const foods = Array.isArray(foodData)
      ? foodData
      : foodData.food ||
        foodData.foods ||
        foodData.data ||
        [];

    // Support the request response formats used by the backend.
    const requests = Array.isArray(requestData)
      ? requestData
      : requestData.requests ||
        requestData.food ||
        requestData.data ||
        [];

    
$("availableCount").textContent = foods.length;

// Count requests by their current status.
$("requestCount").textContent = requests.length;

$("acceptedCount").textContent =
  requests.filter(request =>
    String(request.status || "").toLowerCase() === "accepted"
  ).length;

$("completedCount").textContent =
  requests.filter(request =>
    String(request.status || "").toLowerCase() === "completed"
  ).length;

    renderFoods(foods.slice(0, 6));
    renderRequests(requests.slice(0, 5));

  } catch (error) {
    showMessage(
      `${error.message}. Check that the backend is running and your NGO account is logged in.`
    );

    $("foodList").innerHTML =
      '<p class="empty">Could not load food listings.</p>';

    $("recentRequests").innerHTML =
      '<p class="empty">Could not load requests.</p>';
  }
}

function renderFoods(foods) {
  const list = $("foodList");

  if (!foods.length) {
    list.innerHTML =
      '<p class="empty">No food donations are available right now. Please check again later.</p>';
    return;
  }

  list.innerHTML = foods.map(food => `
    <article class="food-card">
      <span class="food-tag">${safe(food.category || "Food donation")}</span>
      <h3>${safe(food.foodName)}</h3>
      <p>📦 Quantity: ${safe(food.quantity)} ${safe(food.unit || "")}</p>
      <p>📍 Pickup: ${safe(food.pickupLocation || "Contact donor")}</p>
      <p>⏰ Expires: ${safe(formatDate(food.expiryTime))}</p>
      <p>🏠 Donor: ${safe(food.postedBy?.name || "MealBridge partner")}</p>
      <button type="button" class="card-btn"
              data-food-id="${safe(food._id || food.id)}">
        Request Food
      </button>
    </article>
  `).join("");

  list.querySelectorAll("[data-food-id]").forEach(button => {
    button.addEventListener("click", () => {
      requestFood(button.dataset.foodId);
    });
  });
}

function renderRequests(requests) {
  const list = $("recentRequests");

  if (!requests.length) {
    list.innerHTML =
      '<p class="empty">You have not made any food requests yet.</p>';
    return;
  }

  list.innerHTML = requests.map(request => `
    <article class="request-card">
      <div>
        <h3>${safe(request.foodName || "Food request")}</h3>
        <p>Quantity: ${safe(request.quantity)} ${safe(request.unit || "")}</p>
        <p>Requested: ${safe(formatDate(request.requestedAt))}</p>
        ${request.pickupTime
          ? `<p>Pickup time: ${safe(formatDate(request.pickupTime))}</p>`
          : ""}
      </div>
      <span class="status ${safe(request.status)}">
        ${safe(request.status || "pending")}
      </span>
    </article>
  `).join("");
}

async function requestFood(foodId) {
  const quantityText = prompt("Enter the quantity you need:");

  if (quantityText === null) return;

  const quantity = Number(quantityText);

  if (!Number.isInteger(quantity) || quantity < 1) {
    alert("Enter a valid whole-number quantity.");
    return;
  }

  const message = prompt("Optional message for the donor:") || "";

  try {
    const response = await fetch(`${API_URL}/food/${foodId}/request`, {
      method: "POST",
      headers,
      body: JSON.stringify({ quantity, message })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Could not submit food request.");
    }

    alert("Food request submitted successfully!");
    await loadDashboard();

  } catch (error) {
    alert(error.message);
  }
}

function formatDate(value) {
  if (!value) return "Not specified";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Not specified"
    : date.toLocaleString();
}

/* LOGOUT FIX */
$("logoutBtn")?.addEventListener("click", function () {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
  window.location.replace("login.html");
});

loadDashboard();




//$("availableCount").textContent = foods.length;
//$("requestCount").textContent = requests.length;

//$("acceptedCount").textContent =
  //requests.filter(request => request.status === "accepted").length;

//$("completedCount").textContent =
  //requests.filter(request => request.status === "completed").length;