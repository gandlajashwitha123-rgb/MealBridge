// ========================================
// LEFTOVERLINK DASHBOARD
// ========================================


// ========================================
// GET LOGGED-IN USER
// ========================================

const token = localStorage.getItem("token");
const userString = localStorage.getItem("user");


// ========================================
// CHECK LOGIN
// ========================================

if (!token || !userString) {

    window.location.href = "login.html";

} else {

    // ========================================
    // CONVERT STORED USER JSON TO OBJECT
    // ========================================

    const user = JSON.parse(userString);


    // ========================================
    // GET HTML ELEMENTS
    // ========================================

    const userName =
        document.getElementById("userName");

    const userRole =
        document.getElementById("userRole");

    const welcomeTitle =
        document.getElementById("welcomeTitle");

    const welcomeText =
        document.getElementById("welcomeText");

    const nextMessage =
        document.getElementById("nextMessage");


    // ========================================
    // DISPLAY USER NAME
    // ========================================

    userName.textContent = user.name;


    // ========================================
    // DISPLAY USER ROLE
    // ========================================

    userRole.textContent =
        user.role.toUpperCase();


    // ========================================
    // WELCOME MESSAGE
    // ========================================

    welcomeTitle.textContent =
        `Welcome, ${user.name}! 👋`;


    // ========================================
    // ROLE-SPECIFIC MESSAGE
    // ========================================

    if (user.role === "mess") {

        welcomeText.textContent =
            "Ready to turn surplus food into meaningful impact?";

        nextMessage.textContent =
            "In Sprint 2, you will be able to post surplus food and manage donation requests.";

    }


    else if (user.role === "ngo") {

        welcomeText.textContent =
            "Ready to rescue surplus food for your community?";

        nextMessage.textContent =
            "In Sprint 2, you will be able to discover available food and submit donation requests.";

    }


    else if (user.role === "admin") {

        welcomeText.textContent =
            "Welcome to the LeftoverLink administration panel.";

        nextMessage.textContent =
            "In Sprint 2, you will be able to verify NGOs and monitor food donations.";

    }

}


// ========================================
// LOGOUT
// ========================================

const logoutButton =
    document.getElementById("logoutButton");


if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        function () {

            // Remove login information
            localStorage.removeItem("token");
            localStorage.removeItem("user");

            // Go back to home
            window.location.href = "index.html";

        }
    );
}