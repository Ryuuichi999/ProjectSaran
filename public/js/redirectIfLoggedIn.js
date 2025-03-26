// ตรวจสอบว่ามีผู้ใช้ล็อกอินอยู่แล้วหรือไม่
document.addEventListener("DOMContentLoaded", () => {
    const username = localStorage.getItem("username");
    if (username) {
        window.location.href = "/"; // Redirect ไปหน้าแรกถ้าล็อกอินอยู่แล้ว
    }
});