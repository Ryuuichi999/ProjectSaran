document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");

    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const username = document.getElementById("username").value;
            const password = document.getElementById("password").value;

            try {
                const res = await fetch("http://localhost:3000/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password })
                });

                if (!res.ok) {
                    const errorData = await res.json();
                    alert(errorData.message || 'เกิดข้อผิดพลาดในการล็อกอิน');
                    return;
                }

                const data = await res.json();
                alert(data.message); // แสดง "Login successful!"

                // เก็บ username ใน localStorage
                localStorage.setItem("username", username);

                // Redirect ไปหน้าแรก
                window.location.href = "/";
            } catch (error) {
                console.error('Error during login:', error);
                alert('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบว่าเซิร์ฟเวอร์รันอยู่');
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const username = document.getElementById("username").value;
            const email = document.getElementById("email").value;
            const password = document.getElementById("password").value;

            try {
                const res = await fetch("http://localhost:3000/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, email, password })
                });

                if (!res.ok) {
                    const errorData = await res.json();
                    alert(errorData.message || 'เกิดข้อผิดพลาดในการสมัครสมาชิก');
                    return;
                }

                const data = await res.json();
                alert(data.message); // แสดง "Registration successful!"

                // Redirect ไปหน้า login
                window.location.href = "/login";
            } catch (error) {
                console.error('Error during registration:', error);
                alert('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบว่าเซิร์ฟเวอร์รันอยู่');
            }
        });
    }
});