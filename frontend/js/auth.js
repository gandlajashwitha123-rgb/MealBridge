// ==========================================
// MEALBRIDGE / LEFTOVERLINK AUTHENTICATION
// ==========================================


// ==========================================
// REGISTER USER
// ==========================================

const registerForm = document.getElementById("registerForm");

if (registerForm) {

    registerForm.addEventListener("submit", async function (event) {

        // Stop normal form submission / page refresh
        event.preventDefault();

        // Get values from registration form
        const name = document.getElementById("registerName").value.trim();
        const email = document.getElementById("registerEmail").value.trim();
        const phone = document.getElementById("registerPhone").value.trim();
        const role = document.getElementById("registerRole").value;
        const password = document.getElementById("registerPassword").value;
        const confirmPassword = document.getElementById("confirmPassword").value;

        const registerMessage = document.getElementById("registerMessage");


        // Clear previous message
        registerMessage.textContent = "";
        registerMessage.className = "message";


        // ===============================
        // BASIC VALIDATION
        // ===============================

        if (
            name === "" ||
            email === "" ||
            phone === "" ||
            role === "" ||
            password === "" ||
            confirmPassword === ""
        ) {

            registerMessage.textContent =
                "Please fill all the fields.";

            registerMessage.classList.add("error");

            return;
        }


        // ===============================
        // PASSWORD LENGTH
        // ===============================

        if (password.length < 6) {

            registerMessage.textContent =
                "Password must contain at least 6 characters.";

            registerMessage.classList.add("error");

            return;
        }


        // ===============================
        // CONFIRM PASSWORD
        // ===============================

        if (password !== confirmPassword) {

            registerMessage.textContent =
                "Passwords do not match.";

            registerMessage.classList.add("error");

            return;
        }


        // ===============================
        // PHONE VALIDATION
        // ===============================

        if (!/^[0-9]{10}$/.test(phone)) {

            registerMessage.textContent =
                "Please enter a valid 10-digit phone number.";

            registerMessage.classList.add("error");

            return;
        }


        // ===============================
        // SEND DATA TO BACKEND
        // ===============================

        try {

            const response = await fetch(
                "http://localhost:5000/api/auth/register",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        name: name,
                        email: email,
                        phone: phone,
                        password: password,
                        role: role
                    })
                }
            );


            // Convert backend response to JSON
            const data = await response.json();


            // ===============================
            // REGISTRATION SUCCESS
            // ===============================

            if (response.ok) {

                registerMessage.textContent =
                    "Registration successful! Redirecting to login...";

                registerMessage.classList.add("success");


                // Clear form
                registerForm.reset();


                // Redirect to login page
                setTimeout(function () {

                    window.location.href = "login.html";

                }, 1200);

            }


            // ===============================
            // REGISTRATION FAILED
            // ===============================

            else {

                registerMessage.textContent =
                    data.message || "Registration failed.";

                registerMessage.classList.add("error");
            }


        } catch (error) {

            console.error("Registration Error:", error);

            registerMessage.textContent =
                "Unable to connect to server. Please make sure the backend is running.";

            registerMessage.classList.add("error");
        }

    });
}



// ==========================================
// LOGIN USER
// ==========================================

const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", async function (event) {

        // Prevent page refresh
        event.preventDefault();


        // Get email and password
        const email =
            document.getElementById("loginEmail").value.trim();

        const password =
            document.getElementById("loginPassword").value;


        const loginMessage =
            document.getElementById("loginMessage");


        // Clear previous message
        loginMessage.textContent = "";
        loginMessage.className = "message";


        // ===============================
        // BASIC VALIDATION
        // ===============================

        if (email === "" || password === "") {

            loginMessage.textContent =
                "Please enter email and password.";

            loginMessage.classList.add("error");

            return;
        }


        // ===============================
        // SEND LOGIN REQUEST
        // ===============================

        try {

            const response = await fetch(
                "http://localhost:5000/api/auth/login",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        email: email,
                        password: password
                    })
                }
            );


            // Convert response to JSON
            const data = await response.json();


            // ===============================
            // LOGIN SUCCESS
            // ===============================

            if (response.ok) {

                loginMessage.textContent =
                    "Login successful! Redirecting...";

                loginMessage.classList.add("success");


                // Store JWT token
                if (data.token) {

                    localStorage.setItem(
                        "token",
                        data.token
                    );
                }


                // Store user information
                if (data.user) {

                    localStorage.setItem(
                        "user",
                        JSON.stringify(data.user)
                    );
                }


                // Redirect to dashboard
                setTimeout(() => {

                    if (data.user.role === "mess") {

                        window.location.href =
                             "mess-dashboard.html";

                    }

                    else if (data.user.role === "ngo") {

                         window.location.href =
                            "ngo-dashboard.html";

                    }

                    else {

                        window.location.href =
                            "dashboard.html";

                    }

                }, 800);

            }


            // ===============================
            // LOGIN FAILED
            // ===============================

            else {

                loginMessage.textContent =
                    data.message ||
                    "Invalid email or password.";

                loginMessage.classList.add("error");
            }


        } catch (error) {

            console.error("Login Error:", error);

            loginMessage.textContent =
                "Unable to connect to server. Please make sure the backend is running.";

            loginMessage.classList.add("error");
        }

    });
}