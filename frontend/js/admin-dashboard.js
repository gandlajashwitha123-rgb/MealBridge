
"use strict";

const API_BASE = "http://localhost:5000/api";
const TOKEN_KEY = "token";
const USER_KEY = "user";

let adminToken = "";
let adminUser = {};
let usersCache = [];
let ngosCache = [];
let foodsCache = [];
let requestsCache = [];
let currentSection = "overview";
let noticeTimer;

const $ = (id) => document.getElementById(id);

const sectionTitles = {
  overview: "Platform Overview",
  users: "User Management",
  ngos: "NGO Verification",
  foods: "Food Listings",
  requests: "Donation Requests"
};

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function getName(value) {
  if (!value) return "—";
  if (typeof value === "object") {
    return value.name || value.email || "Unknown";
  }
  return String(value);
}

function getEmail(value) {
  if (!value) return "";
  return typeof value === "object" ? value.email || "" : "";
}

function makeBadge(value) {
  const label = String(value || "unknown");
  const className = label.toLowerCase().replace(/[^a-z0-9_-]/g, "");
  const known = [
    "active", "inactive", "verified", "pending", "rejected",
    "completed", "available", "partially_claimed", "requested",
    "claimed", "removed"
  ];

  return `<span class="badge ${known.includes(className) ? `badge-${className}` : "badge-other"}">${escapeHTML(label.replaceAll("_", " "))}</span>`;
}

function showNotice(message, type = "info") {
  const notice = $("notice");
  notice.textContent = message;
  notice.className = `notice ${type}`;
  notice.hidden = false;

  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => {
    notice.hidden = true;
  }, 5000);
}


function askConfirmation({
  title = "Confirm Action",
  message = "Are you sure you want to continue?",
  confirmText = "Confirm",
  danger = false,
  reason = false
} = {}) {
  return new Promise((resolve) => {
    const modal = $("confirmModal");
    const titleElement = $("modalTitle");
    const messageElement = $("modalMessage");
    const iconElement = $("modalIcon");
    const reasonField = $("reasonField");
    const reasonInput = $("modalReason");
    const confirmButton = $("modalConfirm");
    const cancelButton = $("modalCancel");

    titleElement.textContent = title;
    messageElement.textContent = message;
    confirmButton.textContent = confirmText;
    iconElement.textContent = danger ? "🗑️" : "⚠️";

    confirmButton.classList.toggle("danger", danger);
    reasonField.hidden = !reason;
    reasonInput.value = "";

    modal.hidden = false;

    let finished = false;

    function cleanup(confirmed) {
      if (finished) return;
      finished = true;

      modal.hidden = true;
      confirmButton.removeEventListener("click", onConfirm);
      cancelButton.removeEventListener("click", onCancel);
      modal.removeEventListener("click", onBackdrop);
      document.removeEventListener("keydown", onKeydown);

      resolve({
        confirmed,
        reason: reasonInput.value.trim()
      });
    }

    function onConfirm() {
      if (reason && !reasonInput.value.trim()) {
        reasonInput.focus();
        reasonInput.setCustomValidity("Please enter a reason.");
        reasonInput.reportValidity();
        return;
      }

      reasonInput.setCustomValidity("");
      cleanup(true);
    }

    function onCancel() {
      cleanup(false);
    }

    function onBackdrop(event) {
      if (event.target === modal) cleanup(false);
    }

    function onKeydown(event) {
      if (event.key === "Escape") cleanup(false);
    }

    reasonInput.addEventListener("input", () => {
      reasonInput.setCustomValidity("");
    });

    confirmButton.addEventListener("click", onConfirm);
    cancelButton.addEventListener("click", onCancel);
    modal.addEventListener("click", onBackdrop);
    document.addEventListener("keydown", onKeydown);

    if (reason) {
      reasonInput.focus();
    } else {
      cancelButton.focus();
    }
  });
}

function setTableMessage(id, message, columns = 6) {
  $(id).innerHTML = `
    <tr>
      <td colspan="${columns}" class="empty-cell">${escapeHTML(message)}</td>
    </tr>`;
}

async function apiRequest(path, options = {}) {
  const headers = {
    Authorization: `Bearer ${adminToken}`,
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {})
  };

  let response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers
    });
  } catch (error) {
    throw new Error(
      "Cannot connect to the backend. Make sure your MealBridge server is running on port 5000."
    );
  }

  let data;

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error(
      data.message || "Your admin session is invalid or expired. Please log in again."
    );
  }

  if (!response.ok || data.success === false) {
    throw new Error(data.message || `Request failed (${response.status}).`);
  }

  return data;
}

function getStoredSession() {
  try {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = JSON.parse(localStorage.getItem(USER_KEY) || "{}");

    if (storedToken && storedUser.role === "admin") {
      return { token: storedToken, user: storedUser };
    }
  } catch (error) {
    console.warn("Could not read stored session.", error);
  }

  return null;
}

function updateAdminHeader() {
  const name = adminUser.name || adminUser.email || "Administrator";
  $("adminName").textContent = name;
  document.querySelector(".avatar").textContent =
    name.trim().charAt(0).toUpperCase() || "A";
}

function showSection(section) {
  if (!sectionTitles[section]) return;

  currentSection = section;

  document.querySelectorAll(".content-section").forEach((element) => {
    element.hidden = element.id !== `${section}Section`;
  });

  document.querySelectorAll("[data-section]").forEach((button) => {
    button.classList.toggle(
      "active",
      button.classList.contains("nav-item") &&
      button.dataset.section === section
    );
  });

  $("pageTitle").textContent = sectionTitles[section];

  if (section !== "overview") {
    loadSection(section).catch((error) => showNotice(error.message, "error"));
  }
}

async function loadStats() {
  const data = await apiRequest("/admin/stats");
  const stats = data.stats || {};

  $("totalUsers").textContent = stats.totalUsers ?? 0;
  $("totalMess").textContent = stats.totalMess ?? 0;
  $("totalNGOs").textContent = stats.totalNGOs ?? 0;
  $("totalFoodListings").textContent = stats.totalFoodListings ?? 0;
  $("activeFoodListings").textContent = stats.activeFoodListings ?? 0;
  $("completedDonations").textContent = stats.completedDonations ?? 0;
  $("rejectedRequests").textContent = stats.rejectedRequests ?? 0;

  const rescued = stats.rescuedByUnit || {};
  const entries = Object.entries(rescued);

  $("rescuedByUnit").innerHTML = entries.length
    ? entries.map(([unit, quantity]) =>
        `<div>${escapeHTML(quantity)} <span>${escapeHTML(unit)}</span></div>`
      ).join("")
    : "0";

  return stats;
}

async function loadUsers() {
  setTableMessage("usersTable", "Loading users...", 6);
  const data = await apiRequest("/admin/users");
  usersCache = data.users || [];
  renderUsers();
}

function renderUsers() {
  const query = ($("userSearch").value || "").trim().toLowerCase();

  const list = usersCache.filter((user) =>
    [user.name, user.email, user.role, user.phone]
      .some((value) => String(value || "").toLowerCase().includes(query))
  );

  if (!list.length) {
    setTableMessage("usersTable", "No matching users found.", 6);
    return;
  }

  $("usersTable").innerHTML = list.map((user) => {
    const isActive = user.isActive !== false;
    const isSelf = String(user._id) === String(adminUser._id || adminUser.id);

    return `
      <tr>
        <td><span class="cell-title">${escapeHTML(user.name || "—")}</span></td>
        <td>${escapeHTML(user.email || "—")}</td>
        <td>${makeBadge(user.role)}</td>
        <td>${escapeHTML(user.phone || "—")}</td>
        <td>${makeBadge(isActive ? "active" : "inactive")}</td>
        <td>
          <div class="action-group">
            <button class="small-button ${isActive ? "danger" : ""}"
              data-action="user-status"
              data-id="${escapeHTML(user._id)}"
              data-active="${isActive}"
              ${isSelf ? "disabled title='You cannot deactivate your own account'" : ""}>
              ${isActive ? "Deactivate" : "Activate"}
            </button>
          </div>
        </td>
      </tr>`;
  }).join("");
}


async function changeUserStatus(id, isActive) {
  const answer = await askConfirmation({
    title: isActive ? "Activate User?" : "Deactivate User?",
    message: `Are you sure you want to ${isActive ? "activate" : "deactivate"} this user?`,
    confirmText: isActive ? "Activate User" : "Deactivate User",
    danger: !isActive
  });

  if (!answer.confirmed) return;

  const data = await apiRequest(
    `/admin/users/${encodeURIComponent(id)}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ isActive })
    }
  );

  showNotice(data.message || "User status updated.", "success");
  await Promise.all([loadUsers(), loadStats()]);
}

async function loadNGOs() {
  setTableMessage("ngosTable", "Loading NGO partners...", 5);
  const data = await apiRequest("/admin/ngos");
  ngosCache = data.ngos || [];
  renderNGOs();
}

function renderNGOs() {
  const query = ($("ngoSearch").value || "").trim().toLowerCase();

  const list = ngosCache.filter((ngo) =>
    [ngo.name, ngo.email, ngo.phone]
      .some((value) => String(value || "").toLowerCase().includes(query))
  );

  if (!list.length) {
    setTableMessage("ngosTable", "No matching NGOs found.", 5);
    return;
  }

  $("ngosTable").innerHTML = list.map((ngo) => {
    const status = ngo.verificationStatus || "pending";

    let actions = "";

    if (status !== "verified") {
      actions += `
        <button class="small-button"
          data-action="ngo-status"
          data-id="${escapeHTML(ngo._id)}"
          data-status="verified">Verify</button>`;
    }

    if (status !== "rejected") {
      actions += `
        <button class="small-button danger"
          data-action="ngo-status"
          data-id="${escapeHTML(ngo._id)}"
          data-status="rejected">Reject</button>`;
    }

    if (status !== "pending") {
      actions += `
        <button class="small-button neutral"
          data-action="ngo-status"
          data-id="${escapeHTML(ngo._id)}"
          data-status="pending">Set Pending</button>`;
    }

    return `
      <tr>
        <td><span class="cell-title">${escapeHTML(ngo.name || "—")}</span></td>
        <td>${escapeHTML(ngo.email || "—")}</td>
        <td>${escapeHTML(ngo.phone || "—")}</td>
        <td>${makeBadge(status)}</td>
        <td><div class="action-group">${actions || "—"}</div></td>
      </tr>`;
  }).join("");
}

async function changeNGOStatus(id, verificationStatus) {
  const actionText = verificationStatus === "verified"
    ? "verify"
    : verificationStatus === "rejected"
      ? "reject"
      : "set to pending";

  if (!confirm(`Are you sure you want to ${actionText} this NGO?`)) return;

  const data = await apiRequest(
    `/admin/ngos/${encodeURIComponent(id)}/verification`,
    {
      method: "PATCH",
      body: JSON.stringify({ verificationStatus })
    }
  );

  showNotice(data.message || "NGO verification updated.", "success");
  await Promise.all([loadNGOs(), loadUsers(), loadStats()]);
}

async function loadFoods() {
  setTableMessage("foodsTable", "Loading food listings...", 6);
  const data = await apiRequest("/admin/foods");
  foodsCache = data.foods || [];
  renderFoods();
}

function renderFoods() {
  const query = ($("foodSearch").value || "").trim().toLowerCase();

  const list = foodsCache.filter((food) =>
    [
      food.foodName,
      food.status,
      food.unit,
      food.postedBy?.name,
      food.postedBy?.email
    ].some((value) => String(value || "").toLowerCase().includes(query))
  );

  if (!list.length) {
    setTableMessage("foodsTable", "No matching food listings found.", 6);
    return;
  }

  $("foodsTable").innerHTML = list.map((food) => {
    const removed = food.isRemoved === true;
    const expiry = food.expiryTime || food.expiryDate;
    const expired = expiry && new Date(expiry).getTime() < Date.now();

    let status = removed ? "removed" : (food.status || "unknown");
    if (!removed && expired) status = "expired";

    const action = removed
      ? `<button class="small-button" data-action="food-restore" data-id="${escapeHTML(food._id)}">Restore</button>`
      : `<button class="small-button danger" data-action="food-remove" data-id="${escapeHTML(food._id)}">Remove</button>`;

    return `
      <tr>
        <td>
          <span class="cell-title">${escapeHTML(food.foodName || "Food listing")}</span>
          <span class="cell-subtitle">${escapeHTML(food._id || "")}</span>
        </td>
        <td>${escapeHTML(food.quantity ?? "—")} ${escapeHTML(food.unit || "")}</td>
        <td>
          <span class="cell-title">${escapeHTML(getName(food.postedBy))}</span>
          <span class="cell-subtitle">${escapeHTML(getEmail(food.postedBy))}</span>
        </td>
        <td>${escapeHTML(formatDate(expiry))}</td>
        <td>
          ${makeBadge(status)}
          ${removed && food.moderationReason
            ? `<span class="cell-subtitle">Reason: ${escapeHTML(food.moderationReason)}</span>`
            : ""}
        </td>
        <td><div class="action-group">${action}</div></td>
      </tr>`;
  }).join("");
}


async function moderateFood(id, isRemoved) {
  let reason = "";

  const answer = await askConfirmation({
    title: isRemoved ? "Remove Food Listing?" : "Restore Food Listing?",
    message: isRemoved
      ? "This listing will be removed from public availability. Please provide a reason."
      : "Do you want to restore this food listing?",
    confirmText: isRemoved ? "Remove Listing" : "Restore Listing",
    danger: isRemoved,
    reason: isRemoved
  });

  if (!answer.confirmed) return;

  if (isRemoved) {
    reason = answer.reason;

    if (!reason) {
      showNotice("A reason is required to remove a food listing.", "error");
      return;
    }
  }

  const data = await apiRequest(
    `/admin/foods/${encodeURIComponent(id)}/moderation`,
    {
      method: "PATCH",
      body: JSON.stringify({ isRemoved, reason })
    }
  );

  showNotice(data.message || "Food listing updated.", "success");
  await Promise.all([loadFoods(), loadStats()]);
}

function renderRequests() {
  const query = ($("requestSearch").value || "").trim().toLowerCase();

  const list = requestsCache.filter((request) =>
    [
      request.foodName,
      request.status,
      request.postedBy?.name,
      request.postedBy?.email,
      request.ngo?.name,
      request.ngo?.email
    ].some((value) => String(value || "").toLowerCase().includes(query))
  );

  if (!list.length) {
    setTableMessage("requestsTable", "No matching donation requests found.", 6);
    return;
  }

  $("requestsTable").innerHTML = list.map((request) => `
    <tr>
      <td>
        <span class="cell-title">${escapeHTML(request.foodName || "Food listing")}</span>
        ${request.foodRemoved ? '<span class="cell-subtitle">Listing removed</span>' : ""}
      </td>
      <td>
        <span class="cell-title">${escapeHTML(getName(request.postedBy))}</span>
        <span class="cell-subtitle">${escapeHTML(getEmail(request.postedBy))}</span>
      </td>
      <td>
        <span class="cell-title">${escapeHTML(getName(request.ngo))}</span>
        <span class="cell-subtitle">${escapeHTML(getEmail(request.ngo))}</span>
      </td>
      <td>${escapeHTML(request.quantity ?? "—")} ${escapeHTML(request.foodUnit || "")}</td>
      <td>${makeBadge(request.status || "unknown")}</td>
      <td>${escapeHTML(formatDate(request.requestedAt))}</td>
    </tr>
  `).join("");
}

async function loadSection(section) {
  if (section === "users") return loadUsers();
  if (section === "ngos") return loadNGOs();
  if (section === "foods") return loadFoods();
  if (section === "requests") return loadRequests();
}

async function refreshDashboard() {
  $("refreshBtn").disabled = true;
  $("refreshBtn").textContent = "Refreshing...";

  try {
    await loadStats();

    if (currentSection !== "overview") {
      await loadSection(currentSection);
    }

    showNotice("Dashboard data refreshed successfully.", "success");
  } catch (error) {
    showNotice(error.message, "error");
  } finally {
    $("refreshBtn").disabled = false;
    $("refreshBtn").textContent = "↻ Refresh Data";
  }
}


async function logout() {
  const answer = await askConfirmation({
    title: "Log Out?",
    message: "Are you sure you want to log out of your MealBridge admin account?",
    confirmText: "Log Out",
    danger: true
  });

  if (!answer.confirmed) return;

  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);

  window.location.href = "admin-login-test.html";
}

function bindEvents() {
  document.querySelectorAll("[data-section]").forEach((button) => {
    button.addEventListener("click", () => {
      showSection(button.dataset.section);
    });
  });

  $("refreshBtn").addEventListener("click", refreshDashboard);
  $("logoutBtn").addEventListener("click", logout);

  $("userSearch").addEventListener("input", renderUsers);
  $("ngoSearch").addEventListener("input", renderNGOs);
  $("foodSearch").addEventListener("input", renderFoods);
  $("requestSearch").addEventListener("input", renderRequests);

  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button || button.disabled) return;

    const action = button.dataset.action;
    const id = button.dataset.id;

    button.disabled = true;

    try {
      if (action === "user-status") {
        await changeUserStatus(id, button.dataset.active !== "true");
      } else if (action === "ngo-status") {
        await changeNGOStatus(id, button.dataset.status);
      } else if (action === "food-remove") {
        await moderateFood(id, true);
      } else if (action === "food-restore") {
        await moderateFood(id, false);
      }
    } catch (error) {
      showNotice(error.message, "error");
    } finally {
      button.disabled = false;
    }
  });
}

async function initialiseDashboard() {
  const session = getStoredSession();

  if (!session) {
  window.location.href = "admin-login-test.html";
  return;
}

  adminToken = session.token;
  adminUser = session.user;
  updateAdminHeader();
  bindEvents();

  try {
    await loadStats();
  } catch (error) {
    showNotice(error.message, "error");
  }
}

document.addEventListener("DOMContentLoaded", initialiseDashboard);

