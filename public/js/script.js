// จำลองเวลาในการโหลด
setTimeout(() => document.getElementById('loadingOverlay').style.display = 'none', 1500); // รอ 1.5 วินาทีแล้วซ่อนหน้าจอการโหลด (loadingOverlay)

// กำหนดตัวแปร barsData ให้เป็น null เพื่อเก็บข้อมูล GeoJSON ที่ดึงมา
let barsData = null;

// ดึงข้อมูล GeoJSON จากเซิร์ฟเวอร์
fetch('/data/bars.geojson')
    .then(response => response.ok ? response.json() : Promise.reject('ไม่สามารถโหลดข้อมูล GeoJSON ได้')) // ถ้าตรวจสอบว่าโหลดสำเร็จจึงแปลงเป็น JSON
    .then(data => {
        // เมื่อข้อมูลโหลดเสร็จแล้วจะเก็บข้อมูลลงใน barsData
        barsData = data;

        // ตรวจสอบว่า barsData มีข้อมูลหรือไม่
        if (!barsData || !barsData.features || barsData.features.length === 0) {
            throw new Error('ไม่มีข้อมูลร้าน'); // ถ้าไม่มีข้อมูลร้านแสดงข้อความผิดพลาด
        }

        // เรียกใช้ฟังก์ชันต่างๆ เพื่อแสดงผลข้อมูล
        displayPopularBars();
        displayBars();
        setupReservationModal();
        setupSearch();
    })
    .catch(error => {
        // หากเกิดข้อผิดพลาดในการโหลดข้อมูล
        console.error('Error loading GeoJSON:', error);
        showNotification('เกิดข้อผิดพลาดในการโหลดข้อมูลร้าน');
        const barList = document.getElementById('barList');
        barList.innerHTML = '<p style="text-align: center; color: #666;">ไม่สามารถโหลดข้อมูลร้านได้</p>';
    });

// แสดงร้านยอดนิยม (คะแนน >= 4.5)
function displayPopularBars() {
    const popularBars = document.getElementById('popularBars');
    popularBars.innerHTML = '';  // ล้างข้อมูลที่มีอยู่ก่อนหน้า
    
    // กรองร้านที่มีคะแนนมากกว่า 4.5
    const popular = barsData.features.filter(bar => bar.properties.rating >= 4.5);

    // ถ้าไม่มีร้านยอดนิยม
    if (popular.length === 0) {
        popularBars.innerHTML = '<p style="text-align: center; color: #666;">ไม่มีร้านยอดนิยมในขณะนี้</p>';
        return;
    }
    // แสดงร้านยอดนิยม
    popular.forEach(addBarItem.bind(null, popularBars));
}

// แสดงร้านทั้งหมด
function displayBars(filteredBars = barsData.features) {
    const barList = document.getElementById('barList');
    barList.innerHTML = '';  // ล้างข้อมูลที่มีอยู่ก่อนหน้า
    
    // ถ้าไม่มีร้านที่ตรงกับคำค้นหา
    if (filteredBars.length === 0) {
        barList.innerHTML = '<p style="text-align: center; color: #666;">ไม่พบร้านที่ตรงกับคำค้นหา</p>';
        return;
    }
    
    // แสดงร้านทั้งหมด
    filteredBars.forEach(feature => addBarItem(barList, feature));
}

// เพิ่มร้านลงใน container
function addBarItem(container, feature) {
    // ดึงข้อมูลร้านจาก properties ของ feature
    const { name, description, opening_hours, rating, tags, thumbnail } = feature.properties;
    
    // สร้าง element ใหม่สำหรับแต่ละร้าน
    const barItem = document.createElement('div');
    barItem.className = 'bar-item';
    barItem.setAttribute('data-name', name); // เพิ่ม data-name เพื่อใช้ในการค้นหา
    
    // สร้าง HTML ของแต่ละร้าน
    barItem.innerHTML = `
        <img src="${thumbnail}" class="bar-image" alt="${name}">
        <div class="bar-content">
            <strong>${name}</strong>
            <p>${description}</p>
            <div class="bar-meta">
                <span>${opening_hours}</span>
                <span class="ratings">${'★'.repeat(Math.round(rating))} (${rating})</span>
            </div>
            <div class="bar-tags">${tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>
        </div>
    `;
    
    // เมื่อคลิกที่ร้านจะนำไปที่หน้ารายละเอียดของร้าน
    barItem.addEventListener('click', () => {
        window.location.href = `map.html?bar=${encodeURIComponent(name)}`;
    });
    
    // เพิ่ม barItem ลงใน container
    container.appendChild(barItem);
}

// ตั้งค่าฟังก์ชันค้นหา
function setupSearch() {
    // ดึง input และ suggestions จาก DOM
    const searchInput = document.getElementById('searchInput');
    const autocompleteSuggestions = document.getElementById('autocompleteSuggestions');
    
    // ถ้าไม่พบ element จะหยุดการทำงาน
    if (!searchInput || !autocompleteSuggestions) {
        console.error('ไม่พบ element: searchInput หรือ autocompleteSuggestions');
        return;
    }

    // ฟังก์ชันการค้นหาจากคำที่พิมพ์
    function performSearch(query) {
        if (!barsData || !barsData.features) {
            console.error('ไม่มีข้อมูล barsData');
            return;
        }

        // กรองบาร์ที่ตรงกับคำค้นหาจากชื่อร้าน
        const filteredBars = barsData.features.filter(feature => {
            const { name } = feature.properties;
            return name && name.toLowerCase().includes(query.toLowerCase());
        });

        // อัปเดต barList ด้วยร้านที่ค้นพบ
        displayBars(filteredBars);

        // อัปเดต Autocomplete Suggestions
        updateAutocompleteSuggestions(query, filteredBars);
    }

    // ฟังก์ชันอัปเดตคำแนะนำใน autocomplete
    function updateAutocompleteSuggestions(query, filteredBars) {
        autocompleteSuggestions.innerHTML = '';
        
        // ถ้าคำค้นหาว่างหรือไม่มีร้านที่ตรงกับคำค้นหา ให้ซ่อน autocomplete
        if (query.length === 0 || filteredBars.length === 0) {
            autocompleteSuggestions.classList.remove('show');
            return;
        }

        // เพิ่มคำแนะนำ 5 อันดับแรก
        filteredBars.slice(0, 5).forEach(feature => {
            const { name } = feature.properties;
            const suggestionItem = document.createElement('div');
            suggestionItem.className = 'suggestion-item';
            suggestionItem.textContent = name;
            
            // เมื่อคลิกที่คำแนะนำให้เติมค่าในช่องค้นหาและเลื่อนไปที่ร้าน
            suggestionItem.addEventListener('click', () => {
                searchInput.value = name;
                scrollToBar(name);  // เลื่อนไปยังร้านที่เลือก
                autocompleteSuggestions.classList.remove('show');  // ซ่อนคำแนะนำ
            });
            autocompleteSuggestions.appendChild(suggestionItem);
        });

        // แสดงคำแนะนำ
        autocompleteSuggestions.classList.add('show');
    }

    // ฟังก์ชันเลื่อนไปที่ร้านที่เลือก
    function scrollToBar(barName) {
        const barList = document.getElementById('barList');
        const barItems = barList.getElementsByClassName('bar-item');
        
        // ลบ highlight จากร้านก่อนหน้า
        Array.from(barItems).forEach(item => item.classList.remove('highlight'));

        // ค้นหาร้านที่ตรงกับชื่อ
        const targetBar = Array.from(barItems).find(item => 
            item.getAttribute('data-name').toLowerCase() === barName.toLowerCase()
        );

        if (targetBar) {
            // เพิ่ม highlight ให้ร้านที่เลือก
            targetBar.classList.add('highlight');
            // เลื่อนไปที่ร้าน
            targetBar.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            showNotification('ไม่พบร้านในรายการ');
        }
    }

    // ค้นหาแบบเรียลไทม์เมื่อพิมพ์
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        performSearch(query);
    });

    // ปิด Autocomplete เมื่อคลิกนอกช่องค้นหา
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !autocompleteSuggestions.contains(e.target)) {
            autocompleteSuggestions.classList.remove('show');
        }
    });

    // เพิ่มการกด Enter เพื่อเลื่อนไปที่ร้าน
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = searchInput.value.trim();
            const filteredBars = barsData.features.filter(feature => {
                const { name } = feature.properties;
                return name && name.toLowerCase().includes(query.toLowerCase());
            });

            if (filteredBars.length > 0) {
                const barName = filteredBars[0].properties.name; // เลือกร้านแรก
                scrollToBar(barName);  // เลื่อนไปที่ร้าน
                autocompleteSuggestions.classList.remove('show'); // ซ่อน Autocomplete
            } else {
                showNotification('ไม่พบร้านที่ตรงกับคำค้นหา');
            }
        }
    });
}



// ฟังก์ชันสำหรับจัดการ Modal การจองโต๊ะ
function setupReservationModal() {
    const reservationModal = document.getElementById('reservationModal'); // ดึงอิลิเมนต์ของ modal การจอง
    const barSelect = document.getElementById('barSelect'); // ดึงอิลิเมนต์ของ select สำหรับเลือกบาร์
    const reservationForm = document.getElementById('reservationForm'); // ดึงอิลิเมนต์ของฟอร์มการจอง
    const closeModal = document.querySelector('#reservationModal .close'); // ดึงปุ่มปิด modal

    // ฟังก์ชันสำหรับโหลดข้อมูลบาร์เข้าไปใน select dropdown
    function loadBarsIntoSelect() {
        if (barsData && barSelect) {
            barsData.features.forEach(feature => {
                const barName = feature.properties.name; // ชื่อของบาร์จากข้อมูล
                const option = document.createElement('option'); // สร้าง option สำหรับ select
                option.value = barName;
                option.textContent = barName; // ตั้งชื่อบาร์ให้แสดงใน dropdown
                barSelect.appendChild(option); // เพิ่ม option เข้าไปใน select
            });
        }
    }

    // เปิด modal การจอง
    window.openReservationModal = function() {
        if (reservationModal) {
            barSelect.innerHTML = '<option value="">-- เลือกร้าน --</option>'; // รีเซ็ตค่า select
            loadBarsIntoSelect(); // โหลดข้อมูลบาร์ไปใน select
            reservationModal.style.display = 'flex'; // แสดง modal
        } else {
            console.error('ไม่พบ element: reservationModal'); // ถ้าไม่พบ modal แสดงข้อความผิดพลาด
        }
    };

    // ปิด modal การจอง
    window.closeReservationModal = function() {
        if (reservationModal) {
            reservationModal.style.display = 'none'; // ซ่อน modal
        }
    };

    // ปิด modal เมื่อคลิกนอก modal
    window.addEventListener('click', (event) => {
        if (event.target === reservationModal) {
            reservationModal.style.display = 'none'; // ซ่อน modal
        }
    });

    // ถ้ามีฟอร์มการจอง ให้ทำการส่งข้อมูลเมื่อกรอกครบ
    if (reservationForm) {
        reservationForm.addEventListener('submit', async (e) => {
            e.preventDefault(); // หยุดการทำงานแบบปกติของฟอร์ม
            const barName = document.getElementById('barSelect').value; // ดึงชื่อบาร์จาก select
            const reservationName = document.getElementById('reservationName').value; // ดึงชื่อผู้จอง
            const reservationDateTime = document.getElementById('reservationDateTime').value; // ดึงวันที่และเวลา
            const numberOfPeople = document.getElementById('numberOfPeople').value; // ดึงจำนวนคน
            const phoneNumber = document.getElementById('phoneNumber').value; // ดึงเบอร์โทรศัพท์

            // ตรวจสอบข้อมูลที่กรอก
            if (!barName || !reservationName || !reservationDateTime || !numberOfPeople || !phoneNumber) {
                showNotification('กรุณากรอกข้อมูลให้ครบถ้วน'); // ถ้ากรอกไม่ครบ แจ้งเตือน
                return;
            }

            // ตรวจสอบรูปแบบเบอร์โทรศัพท์
            const phonePattern = /^\d{10}$/;
            if (!phonePattern.test(phoneNumber)) {
                showNotification('เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก'); // ถ้าเบอร์ไม่ถูกต้อง แจ้งเตือน
                return;
            }

            try {
                // ส่งข้อมูลการจองไปที่ API
                const response = await fetch('/api/reserve', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        barName: barName,
                        reservationName: reservationName,
                        reservationDate: reservationDateTime,
                        numberOfPeople: parseInt(numberOfPeople),
                        phoneNumber: phoneNumber
                    })
                });

                // ถ้าการจองสำเร็จ
                if (response.ok) {
                    showNotification(`จองโต๊ะที่ ${barName} สำเร็จ! ชื่อ: ${reservationName}, จำนวน: ${numberOfPeople} คน, เบอร์: ${phoneNumber}`);
                    reservationModal.style.display = 'none'; // ปิด modal
                    reservationForm.reset(); // รีเซ็ตฟอร์มการจอง
                } else {
                    const errorData = await response.json(); // ดึงข้อมูลข้อผิดพลาดจาก API
                    showNotification(`เกิดข้อผิดพลาด: ${errorData.error}`); // แจ้งข้อผิดพลาด
                }
            } catch (error) {
                console.error('Error:', error); // ถ้ามีข้อผิดพลาดในการส่งข้อมูล
                showNotification('เกิดข้อผิดพลาดในการจองโต๊ะ');
            }
        });
    }
}

// การแสดงวงล้อหมุนเมื่อคลิกปุ่ม
document.getElementById('spinWheelButton').addEventListener('click', () => {
    const wheelContainer = document.getElementById('wheelContainer');
    wheelContainer.style.display = 'flex'; // แสดงวงล้อหมุน
});

// ปิดวงล้อหมุนเมื่อคลิกปุ่มปิด
document.getElementById('closeWheelButton').addEventListener('click', () => {
    const wheelContainer = document.getElementById('wheelContainer');
    wheelContainer.style.display = 'none'; // ซ่อนวงล้อหมุน
});

// ปุ่มสำรวจ (เลื่อนไปที่รายการบาร์)
document.getElementById('exploreButton').addEventListener('click', () => {
    document.querySelector('.bar-list-section').scrollIntoView({ behavior: 'smooth' }); // เลื่อนไปยังรายการบาร์
});

// ฟังก์ชันแจ้งเตือน
function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message; // แสดงข้อความแจ้งเตือน
    notification.classList.add('show'); // เพิ่มคลาสเพื่อแสดง
    setTimeout(() => notification.classList.remove('show'), 3000); // ซ่อนแจ้งเตือนหลังจาก 3 วินาที
}
