// ฟังก์ชันอัปเดต user section
function updateUserSection() {
    const userSection = document.getElementById("userSection");
    const username = localStorage.getItem("username");

    if (userSection) {
        if (username) {
            // ถ้ามีผู้ใช้ล็อกอินอยู่
            userSection.innerHTML = `
                <span>สวัสดี, ${username}</span>
                <button onclick="openReservationModal()">จองโต๊ะ</button>
                <button onclick="logout()">ออกจากระบบ</button>
            `;
        } else {
            // ถ้าไม่มีผู้ใช้ล็อกอิน
            userSection.innerHTML = `
                <a href="login.html" class="navbar-link">ล็อกอิน</a>
                <a href="register.html" class="navbar-link">สมัครสมาชิก</a>
                <button onclick="showLoginRequiredMessage()">จองโต๊ะ</button>
            `;
        }
    }
}

// ฟังก์ชันล็อกเอาท์
function logout() {
    localStorage.removeItem("username");
    updateUserSection();
    window.location.href = "/"; // Redirect ไปหน้าแรกหลังล็อกเอาท์
}

// ฟังก์ชันแสดงข้อความเมื่อยังไม่ได้ล็อกอิน
function showLoginRequiredMessage() {
    const notification = document.getElementById("notification");
    if (notification) {
        notification.textContent = "กรุณาล็อกอินก่อนจองโต๊ะ";
        notification.classList.add("show");
        setTimeout(() => notification.classList.remove("show"), 3000);
    }
}

// ฟังก์ชันเปิด modal จองโต๊ะ
function openReservationModal() {
    const modal = document.getElementById("reservationModal");
    const nameInput = document.getElementById("reservationName");
    const username = localStorage.getItem("username");

    if (modal && nameInput) {
        modal.style.display = "flex";
        nameInput.value = username; // ใส่ชื่อผู้ใช้จาก localStorage
    }
}

// ฟังก์ชันปิด modal
function closeReservationModal() {
    const modal = document.getElementById("reservationModal");
    if (modal) {
        modal.style.display = "none";
    }
}

// ฟังก์ชันจัดการการส่งฟอร์มจองโต๊ะ
function handleReservationForm() {
    const form = document.getElementById("reservationForm");
    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            const name = document.getElementById("reservationName").value;
            const dateTime = document.getElementById("reservationDateTime").value;

            // เก็บข้อมูลการจองใน localStorage (ตัวอย่าง)
            const reservations = JSON.parse(localStorage.getItem("reservations")) || [];
            reservations.push({ name, dateTime });
            localStorage.setItem("reservations", JSON.stringify(reservations));

            // แสดงข้อความยืนยัน
            const notification = document.getElementById("notification");
            if (notification) {
                notification.textContent = "จองโต๊ะสำเร็จ!";
                notification.classList.add("show");
                setTimeout(() => notification.classList.remove("show"), 3000);
            }

            // ปิด modal
            closeReservationModal();
        });
    }
}

// เรียกฟังก์ชันเมื่อหน้าโหลด
document.addEventListener("DOMContentLoaded", () => {
    updateUserSection();
    handleReservationForm();
});