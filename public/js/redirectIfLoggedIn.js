// ตรวจสอบว่ามีผู้ใช้ล็อกอินอยู่แล้วหรือไม่
document.addEventListener("DOMContentLoaded", () => {
    // ดึงข้อมูลชื่อผู้ใช้จาก localStorage
    const username = localStorage.getItem("username");

    // หากมีชื่อผู้ใช้ใน localStorage (หมายความว่าผู้ใช้ล็อกอินอยู่)
    if (username) {
        // เปลี่ยนเส้นทางไปยังหน้าแรก (หน้า home) 
        window.location.href = "/"; // Redirect ไปหน้าแรกถ้าล็อกอินอยู่แล้ว
    }
});
