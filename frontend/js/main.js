// Simple scroll animation support

document.addEventListener("DOMContentLoaded", () => {

    const statCards =
        document.querySelectorAll(".stat-card");

    statCards.forEach((card, index) => {

        card.style.opacity = "0";

        card.style.transform = "translateY(20px)";

        setTimeout(() => {

            card.style.transition =
                "0.6s ease";

            card.style.opacity = "1";

            card.style.transform =
                "translateY(0)";

        }, 150 * index);

    });

});