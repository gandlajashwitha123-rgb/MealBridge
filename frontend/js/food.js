// ==========================================
// MEALBRIDGE FOOD MANAGEMENT
// ==========================================

const API_URL = "http://localhost:5000/api";


// ==========================================
// GET LOGIN INFORMATION
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

    alert("Only mess staff can post food.");

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
// AM / PM DISPLAY
// ==========================================

function updateAmPm(inputId, displayId) {

    const input =
        document.getElementById(inputId);

    const display =
        document.getElementById(displayId);

    if (!input || !display) {
        return;
    }

    if (!input.value) {

        display.textContent = "--";

        return;

    }

    const date =
        new Date(input.value);

    if (isNaN(date.getTime())) {

        display.textContent = "--";

        return;

    }

    const hours =
        date.getHours();

    if (hours >= 12) {

        display.textContent = "PM";

    } else {

        display.textContent = "AM";

    }

}


// ==========================================
// PREPARED TIME CHANGE
// ==========================================

const preparedInput =
    document.getElementById("preparedAt");

if (preparedInput) {

    preparedInput.addEventListener(
        "change",
        function () {

            updateAmPm(
                "preparedAt",
                "preparedAmPm"
            );

        }
    );

    preparedInput.addEventListener(
        "input",
        function () {

            updateAmPm(
                "preparedAt",
                "preparedAmPm"
            );

        }
    );

}


// ==========================================
// EXPIRY TIME CHANGE
// ==========================================

const expiryInput =
    document.getElementById("expiryTime");

if (expiryInput) {

    expiryInput.addEventListener(
        "change",
        function () {

            updateAmPm(
                "expiryTime",
                "expiryAmPm"
            );

        }
    );

    expiryInput.addEventListener(
        "input",
        function () {

            updateAmPm(
                "expiryTime",
                "expiryAmPm"
            );

        }
    );

}


// ==========================================
// POST FOOD FORM
// ==========================================

const foodForm =
    document.getElementById("foodForm");


if (foodForm) {

    foodForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            // =====================================
            // GET FORM VALUES
            // =====================================

            const foodName =
                document.getElementById("foodName")
                    .value.trim();

            const category =
                document.getElementById("category")
                    .value;

            const quantity =
                Number(
                    document.getElementById("quantity")
                        .value
                );

            const unit =
                document.getElementById("unit")
                    .value;

            const preparedAt =
                document.getElementById("preparedAt")
                    .value;

            const expiryTime =
                document.getElementById("expiryTime")
                    .value;

            const pickupLocation =
                document.getElementById("pickupLocation")
                    .value.trim();

            const contactNumber =
                document.getElementById("contactNumber")
                    .value.trim();

            const description =
                document.getElementById("description")
                    .value.trim();


            const message =
                document.getElementById("foodMessage");


            // =====================================
            // CLEAR MESSAGE
            // =====================================

            message.textContent = "";

            message.className = "message";


            // =====================================
            // VALIDATION
            // =====================================

            if (!foodName) {

                showMessage(
                    message,
                    "Please enter the food name.",
                    "error"
                );

                return;
            }


            if (!category) {

                showMessage(
                    message,
                    "Please select a food category.",
                    "error"
                );

                return;
            }


            if (!quantity || quantity <= 0) {

                showMessage(
                    message,
                    "Quantity must be greater than zero.",
                    "error"
                );

                return;
            }


            if (!unit) {

                showMessage(
                    message,
                    "Please select a unit.",
                    "error"
                );

                return;
            }


            if (!preparedAt) {

                showMessage(
                    message,
                    "Please select the prepared time.",
                    "error"
                );

                return;
            }


            if (!expiryTime) {

                showMessage(
                    message,
                    "Please select the expiry time.",
                    "error"
                );

                return;
            }


            if (!pickupLocation) {

                showMessage(
                    message,
                    "Please enter the pickup location.",
                    "error"
                );

                return;
            }


            // =====================================
            // PHONE VALIDATION
            // =====================================

            if (!/^[0-9]{10}$/.test(contactNumber)) {

                showMessage(
                    message,
                    "Please enter a valid 10-digit contact number.",
                    "error"
                );

                return;
            }


            // =====================================
            // DATE VALIDATION
            // =====================================

            const prepared =
                new Date(preparedAt);

            const expiry =
                new Date(expiryTime);


            if (isNaN(prepared.getTime())) {

                showMessage(
                    message,
                    "Please enter a valid prepared time.",
                    "error"
                );

                return;
            }


            if (isNaN(expiry.getTime())) {

                showMessage(
                    message,
                    "Please enter a valid expiry time.",
                    "error"
                );

                return;
            }


            if (expiry <= prepared) {

                showMessage(
                    message,
                    "Expiry time must be after prepared time.",
                    "error"
                );

                return;
            }


            if (expiry <= new Date()) {

                showMessage(
                    message,
                    "Expiry time must be in the future.",
                    "error"
                );

                return;
            }


            // =====================================
            // CHECK TOKEN
            // =====================================

            const currentToken =
                localStorage.getItem("token");


            if (!currentToken) {

                showMessage(
                    message,
                    "Your login session has expired. Please login again.",
                    "error"
                );

                setTimeout(
                    function () {

                        window.location.href =
                            "login.html";

                    },
                    1500
                );

                return;
            }


            // =====================================
            // SUBMIT BUTTON
            // =====================================

            const submitButton =
                foodForm.querySelector(
                    'button[type="submit"]'
                );


            if (submitButton) {

                submitButton.disabled = true;

                submitButton.innerHTML =
                    "⏳ Publishing Food...";

            }


            // =====================================
            // SEND TO BACKEND
            // =====================================

            try {

                console.log(
                    "Sending food data:",
                    {
                        foodName,
                        category,
                        quantity,
                        unit,
                        preparedAt,
                        expiryTime,
                        pickupLocation,
                        contactNumber,
                        description
                    }
                );


                const response =
                    await fetch(
                        `${API_URL}/food`,
                        {

                            method: "POST",

                            headers: {

                                "Content-Type":
                                    "application/json",

                                "Authorization":
                                    `Bearer ${currentToken}`

                            },

                            body: JSON.stringify({

                                foodName:
                                    foodName,

                                category:
                                    category,

                                quantity:
                                    quantity,

                                unit:
                                    unit,

                                description:
                                    description,

                                preparedAt:
                                    preparedAt,

                                expiryTime:
                                    expiryTime,

                                pickupLocation:
                                    pickupLocation,

                                contactNumber:
                                    contactNumber

                            })

                        }
                    );


                // =====================================
                // RESPONSE
                // =====================================

                let data;

                try {

                    data =
                        await response.json();

                } catch (error) {

                    data = {

                        message:
                            "Invalid response from server."

                    };

                }


                console.log(
                    "Server response:",
                    data
                );


                // =====================================
                // SUCCESS
                // =====================================

                if (response.ok) {

                    showMessage(
                        message,
                        "🎉 Food donation posted successfully!",
                        "success"
                    );


                    foodForm.reset();


                    // Reset AM/PM displays

                    const preparedAmPm =
                        document.getElementById(
                            "preparedAmPm"
                        );

                    const expiryAmPm =
                        document.getElementById(
                            "expiryAmPm"
                        );


                    if (preparedAmPm) {

                        preparedAmPm.textContent =
                            "--";

                    }


                    if (expiryAmPm) {

                        expiryAmPm.textContent =
                            "--";

                    }


                    setTimeout(
                        function () {

                            window.location.href =
                                "mess-dashboard.html";

                        },
                        1500
                    );


                    return;
                }


                // =====================================
                // AUTHENTICATION ERROR
                // =====================================

                if (response.status === 401) {

                    showMessage(
                        message,
                        "Your login session is invalid. Please login again.",
                        "error"
                    );


                    localStorage.removeItem("token");

                    localStorage.removeItem("user");


                    setTimeout(
                        function () {

                            window.location.href =
                                "login.html";

                        },
                        1800
                    );


                    return;
                }


                // =====================================
                // SERVER ERROR
                // =====================================

                showMessage(
                    message,
                    data.message ||
                    "Unable to publish food donation.",
                    "error"
                );


            } catch (error) {

                console.error(
                    "Food Posting Error:",
                    error
                );


                showMessage(
                    message,
                    "Unable to connect to the server. Please make sure the backend is running.",
                    "error"
                );

            }


            // =====================================
            // ENABLE BUTTON AGAIN
            // =====================================

            if (submitButton) {

                submitButton.disabled = false;

                submitButton.innerHTML =
                    "🍱 Publish Food Donation";

            }

        }
    );

}


// ==========================================
// SHOW MESSAGE
// ==========================================

function showMessage(
    element,
    text,
    type
) {

    if (!element) {
        return;
    }


    element.textContent =
        text;


    element.className =
        `message ${type}`;

}


// ==========================================
// LOGOUT
// ==========================================

function logout() {

    localStorage.removeItem("token");

    localStorage.removeItem("user");

    window.location.href =
        "index.html";

}