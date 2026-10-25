// ========================================
// LEFTOVERLINK - MESS DASHBOARD
// ========================================

const API_URL = "http://localhost:5000/api";


// ========================================
// GET LOGIN INFORMATION
// ========================================

const token = localStorage.getItem("token");
const userString = localStorage.getItem("user");


// ========================================
// CHECK LOGIN
// ========================================

if (!token || !userString) {

    window.location.href = "login.html";

} else {

    const user = JSON.parse(userString);


    // ========================================
    // CHECK ROLE
    // ========================================

    if (user.role !== "mess") {

        alert("Only mess staff can access this dashboard.");

        window.location.href = "dashboard.html";

    } else {

        // ========================================
        // DISPLAY USER NAME
        // ========================================

        const messName =
            document.getElementById("messName");

        const welcomeName =
            document.getElementById("welcomeName");


        if (messName) {

            messName.textContent = user.name;

        }


        if (welcomeName) {

            welcomeName.textContent = user.name;

        }


        // ========================================
        // LOAD DASHBOARD DATA
        // ========================================

        loadDashboard();

    }

}


// ========================================
// LOAD MESS DASHBOARD
// ========================================

async function loadDashboard() {

    try {

        const response = await fetch(
            `${API_URL}/food/my-food`,
            {
                method: "GET",

                headers: {

                    "Authorization":
                        `Bearer ${token}`

                }
            }
        );


        const data = await response.json();


        if (!response.ok) {

            console.error(
                "Dashboard Error:",
                data.message
            );

            return;

        }


        // ========================================
        // DISPLAY FOOD COUNT
        // ========================================

        const totalFood =
            document.getElementById("totalFood");


        if (totalFood) {

            totalFood.textContent =
                data.foods ? data.foods.length : 0;

        }


        // ========================================
        // DISPLAY RECENT FOOD
        // ========================================

        const recentFood =
            document.getElementById("recentFood");


        if (recentFood && data.foods) {

            recentFood.innerHTML = "";


            data.foods.slice(0, 5).forEach(food => {

                const card =
                    document.createElement("div");

                card.className =
                    "dashboard-card";


                card.innerHTML = `

                    <div class="dashboard-card-icon">
                        🍱
                    </div>

                    <h3>
                        ${food.foodName}
                    </h3>

                    <p>
                        Quantity:
                        ${food.quantity}
                        ${food.unit}
                    </p>

                    <p>
                        Category:
                        ${food.category}
                    </p>

                `;


                recentFood.appendChild(card);

            });

        }


    } catch (error) {

        console.error(
            "Dashboard connection error:",
            error
        );

    }

}


// ========================================
// LOGOUT
// ========================================

function logout() {

    localStorage.removeItem("token");

    localStorage.removeItem("user");

    window.location.href = "index.html";

}