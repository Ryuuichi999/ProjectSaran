document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");

    // ตรวจสอบว่ามีฟอร์ม login หรือไม่
    if (loginForm) {
        // ฟังก์ชันที่ทำงานเมื่อฟอร์ม login ถูกส่ง
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();  // ป้องกันการรีเฟรชหน้าเมื่อส่งฟอร์ม

            const username = document.getElementById("username").value;  // ดึงค่า username
            const password = document.getElementById("password").value;  // ดึงค่า password

            try {
                // ส่งข้อมูลไปที่เซิร์ฟเวอร์เพื่อทำการตรวจสอบ login
                const res = await fetch("http://localhost:3000/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, password })  // ส่งข้อมูลในรูปแบบ JSON
                });

                // หากการตอบกลับไม่สำเร็จให้แสดงข้อความผิดพลาด
                if (!res.ok) {
                    const errorData = await res.json();
                    alert(errorData.message || 'เกิดข้อผิดพลาดในการล็อกอิน');  // แจ้งข้อผิดพลาดจากเซิร์ฟเวอร์
                    return;
                }

                const data = await res.json();  // รับข้อมูลจากเซิร์ฟเวอร์
                alert(data.message);  // แสดงข้อความ "Login successful!" เมื่อเข้าสู่ระบบสำเร็จ

                // เก็บข้อมูล username ใน localStorage เพื่อใช้ในภายหลัง
                localStorage.setItem("username", username);

                // Redirect ไปที่หน้าแรกของเว็บไซต์หลังจากล็อกอินสำเร็จ
                window.location.href = "/";
            } catch (error) {
                console.error('Error during login:', error);
                alert('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบว่าเซิร์ฟเวอร์รันอยู่');  // แจ้งข้อผิดพลาดหากเชื่อมต่อกับเซิร์ฟเวอร์ไม่ได้
            }
        });
    }

    // ตรวจสอบว่ามีฟอร์มสมัครสมาชิกหรือไม่
    if (registerForm) {
        // ฟังก์ชันที่ทำงานเมื่อฟอร์ม register ถูกส่ง
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();  // ป้องกันการรีเฟรชหน้าเมื่อส่งฟอร์ม

            const username = document.getElementById("username").value;  // ดึงค่า username
            const email = document.getElementById("email").value;  // ดึงค่า email
            const password = document.getElementById("password").value;  // ดึงค่า password

            try {
                // ส่งข้อมูลไปที่เซิร์ฟเวอร์เพื่อทำการสมัครสมาชิก
                const res = await fetch("http://localhost:3000/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ username, email, password })  // ส่งข้อมูลในรูปแบบ JSON
                });

                // หากการตอบกลับไม่สำเร็จให้แสดงข้อความผิดพลาด
                if (!res.ok) {
                    const errorData = await res.json();
                    alert(errorData.message || 'เกิดข้อผิดพลาดในการสมัครสมาชิก');  // แจ้งข้อผิดพลาดจากเซิร์ฟเวอร์
                    return;
                }

                const data = await res.json();  // รับข้อมูลจากเซิร์ฟเวอร์
                alert(data.message);  // แสดงข้อความ "Registration successful!" เมื่อสมัครสมาชิกสำเร็จ

                // Redirect ไปที่หน้า login หลังจากสมัครสมาชิกสำเร็จ
                window.location.href = "/login";
            } catch (error) {
                console.error('Error during registration:', error);
                alert('ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบว่าเซิร์ฟเวอร์รันอยู่');  // แจ้งข้อผิดพลาดหากเชื่อมต่อกับเซิร์ฟเวอร์ไม่ได้
            }
        });
    }
});
