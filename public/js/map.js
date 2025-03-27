// จำลองเวลาการโหลด
setTimeout(() => {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) loadingOverlay.style.display = 'none';
}, 1500);

// เริ่มต้นแผนที่
const map = L.map('map').setView([16.4467, 102.8330], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// ตัวแสดงตำแหน่งผู้ใช้
let userMarker = null;
let barsData = null;
let barLayer = null;

// ดึงชื่อบาร์ที่เลือกจากพารามิเตอร์ใน URL
const urlParams = new URLSearchParams(window.location.search);
const selectedBarName = urlParams.get('bar');

// กำหนดไอคอนที่กำหนดเองสำหรับแต่ละประเภท
const barIcon = L.icon({
    iconUrl: 'images/bar-icon.png', // ไอคอนสำหรับบาร์
    iconSize: [32, 32], // ขนาดของไอคอน
    iconAnchor: [16, 32], // จุดยึดของไอคอน (ครึ่งหนึ่งของความกว้าง, ความสูงเต็ม)
    popupAnchor: [0, -32] // จุดยึดของ popup
});

const pubIcon = L.icon({
    iconUrl: 'images/pub-icon.png', // ไอคอนสำหรับผับ
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
});

const restaurantIcon = L.icon({
    iconUrl: 'images/restaurant-icon.png', // ไอคอนสำหรับร้านอาหาร
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
});

// ดึงข้อมูล GeoJSON
fetch('/data/bars.geojson')
    .then(response => {
        if (!response.ok) {
            throw new Error('ไม่สามารถโหลดข้อมูล GeoJSON ได้');
        }
        return response.json();
    })
    .then(data => {
        barsData = data;
        barLayer = addBarsToMap(barsData);
        if (selectedBarName) {
            focusOnBar(selectedBarName); // หากมีชื่อบาร์ที่เลือก ให้โฟกัสไปที่บาร์นั้น
        }
        setupReservationModal(); // ตั้งค่าการจอง
    })
    .catch(error => {
        console.error('Error loading GeoJSON:', error);
        showNotification('เกิดข้อผิดพลาดในการโหลดข้อมูลร้าน');
    });

// สร้างไอคอนมาร์กเกอร์ที่กำหนดเองตามประเภท
function createCustomMarker(feature) {
    const type = feature.properties.type;
    let icon;

    // เลือกไอคอนตามประเภทร้าน
    switch (type) {
        case 'bar':
            icon = barIcon;
            break;
        case 'pub':
            icon = pubIcon;
            break;
        case 'restaurant':
            icon = restaurantIcon;
            break;
        default:
            icon = barIcon; // ใช้ไอคอนบาร์เป็นค่าเริ่มต้น
    }

    // สร้างมาร์กเกอร์โดยใช้ไอคอนที่เลือก
    return L.marker([feature.geometry.coordinates[1], feature.geometry.coordinates[0]], { icon: icon });
}


// เพิ่มบาร์ลงในแผนที่และ sidebar
let activeBarItem = null;
function addBarsToMap(bars) {
    // ล้างข้อมูลเก่าออกก่อน
    const barList = document.getElementById("barList");
    if (barList) barList.innerHTML = '<h3>ร้านนั่งดื่มในขอนแก่น</h3>';
    map.eachLayer(layer => {
        if (layer instanceof L.Marker || layer instanceof L.GeoJSON) map.removeLayer(layer);
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    if (userMarker) map.addLayer(userMarker);

    // สร้าง layer GeoJSON สำหรับบาร์
    const layer = L.geoJSON(bars, {
        pointToLayer: (feature, latlng) => createCustomMarker(feature), // สร้างมาร์กเกอร์ที่กำหนดเอง
        onEachFeature: (feature, layer) => {
            const props = feature.properties;
            const popupContent = `
                    <div class="popup-content">
                        <img src="${props.thumbnail}" class="popup-image" alt="${props.name}" 
                            ${props.photos.length ? 'style="cursor: pointer;" onclick="openPhotoGallery(\'' + props.name + '\')"' : ''}>
                        <h3>${props.name}</h3>
                        <p>${props.description}</p>
                        <p><strong>เวลาเปิด:</strong> ${props.opening_hours}</p>
                        <p><strong>ราคา:</strong> ${'$'.repeat(props.price_level)}</p>
                        <p><strong>คะแนน:</strong> ${props.rating} <span class="ratings">${'★'.repeat(Math.round(props.rating))}</span></p>
                        <div class="popup-footer">
                            <button class="popup-button" onclick="window.open('tel:${props.phone}')">โทร</button>
                            <button class="popup-button" onclick="map.setView([${feature.geometry.coordinates[1]}, ${feature.geometry.coordinates[0]}], 16)">ซูม</button>
                           
                        </div>
                    </div>
                `;
            layer.bindPopup(popupContent); // ผูกข้อมูลกับ popup

            // สร้างรายการบาร์ใน sidebar
            const barItem = document.createElement('div');
            barItem.className = 'bar-item';
            barItem.innerHTML = `
                <strong>${props.name}</strong>
                <p>${props.description}</p>
                <div class="bar-meta">
                    <span>${props.opening_hours}</span>
                    <span class="ratings">${'★'.repeat(Math.round(props.rating))} (${props.rating})</span>
                </div>
                <div class="bar-tags">${props.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>
            `;
            barItem.addEventListener('click', () => {
                // เมื่อคลิกที่รายการใน sidebar ให้ย้ายไปยังร้านนั้น
                if (activeBarItem) activeBarItem.classList.remove('active');
                barItem.classList.add('active');
                activeBarItem = barItem;
                map.setView([feature.geometry.coordinates[1], feature.geometry.coordinates[0]], 15); // ซูมแผนที่ไปยังร้าน
                layer.openPopup(); // เปิด popup ของร้าน
            });
            if (barList) barList.appendChild(barItem); // เพิ่มรายการร้านใน sidebar
        }
    }).addTo(map);

    return layer;
}

// โฟกัสไปที่บาร์ที่เลือก
function focusOnBar(barName) {
    if (!barsData) {
        console.error('ข้อมูลร้านยังไม่โหลด');
        return;
    }

    const bar = barsData.features.find(b => b.properties.name === barName);
    if (bar) {
        const coords = bar.geometry.coordinates;
        map.setView([coords[1], coords[0]], 15); // ซูมแผนที่ไปยังตำแหน่งของร้าน
        if (barLayer) {
            barLayer.eachLayer(layer => {
                if (layer.feature.properties.name === barName) {
                    layer.openPopup(); // เปิด popup ของร้าน
                    // ไฮไลต์ร้านใน sidebar
                    const barItems = document.querySelectorAll('.bar-item');
                    barItems.forEach(item => {
                        if (item.querySelector('strong').textContent === barName) {
                            if (activeBarItem) activeBarItem.classList.remove('active');
                            item.classList.add('active');
                            activeBarItem = item;
                            item.scrollIntoView({ behavior: 'smooth', block: 'center' }); // เลื่อนให้ร้านที่เลือกอยู่กลางหน้า
                        }
                    });
                }
            });
        }
    } else {
        showNotification(`ไม่พบร้าน: ${barName}`); // หากไม่พบร้านที่เลือก
    }
}


// ฟังก์ชันการทำงานของ Photo Gallery
function setupPhotoGallery() {
    const gallery = document.getElementById('photoGallery'); // กรอบของแกลเลอรี
    const galleryImage = document.getElementById('galleryImage'); // รูปภาพในแกลเลอรี
    const closeGallery = document.querySelector('.gallery-close'); // ปุ่มปิดแกลเลอรี
    const prevPhoto = document.getElementById('prevPhoto'); // ปุ่มรูปภาพก่อนหน้า
    const nextPhoto = document.getElementById('nextPhoto'); // ปุ่มรูปภาพถัดไป
    let currentPhotos = [], currentPhotoIndex = 0; // ตัวแปรเก็บภาพที่เลือกและดัชนีภาพ

    // ฟังก์ชันเปิดแกลเลอรีเมื่อคลิกที่ภาพ
    window.openPhotoGallery = function (barName) {
        const bar = barsData.features.find(b => b.properties.name === barName); // ค้นหาร้านที่เลือก
        if (bar && bar.properties.photos) openGallery(bar.properties.photos); // หากร้านมีภาพให้เปิดแกลเลอรี
    };

    // ฟังก์ชันเปิดแกลเลอรี
    function openGallery(photos, index = 0) {
        currentPhotos = photos; // กำหนดภาพที่จะแสดง
        currentPhotoIndex = index; // กำหนดดัชนีของภาพเริ่มต้น
        galleryImage.src = photos[index]; // กำหนดแหล่งที่มาของรูปภาพ
        gallery.style.display = 'flex'; // แสดงแกลเลอรี
        updateGalleryButtons(); // อัปเดตปุ่มก่อนหน้าและถัดไป
    }

    // ฟังก์ชันอัปเดตปุ่มก่อนหน้าและถัดไป
    function updateGalleryButtons() {
        prevPhoto.style.visibility = currentPhotoIndex > 0 ? 'visible' : 'hidden'; // ปุ่มก่อนหน้า
        nextPhoto.style.visibility = currentPhotoIndex < currentPhotos.length - 1 ? 'visible' : 'hidden'; // ปุ่มถัดไป
    }

    // กำหนดการทำงานของปุ่มต่างๆ ในแกลเลอรี
    if (closeGallery) closeGallery.addEventListener('click', () => gallery.style.display = 'none'); // ปิดแกลเลอรี
    if (prevPhoto) prevPhoto.addEventListener('click', () => {
        if (currentPhotoIndex > 0) { // หากยังมีภาพก่อนหน้า
            currentPhotoIndex--;
            galleryImage.src = currentPhotos[currentPhotoIndex]; // เปลี่ยนรูปภาพ
            updateGalleryButtons(); // อัปเดตปุ่ม
        }
    });
    if (nextPhoto) nextPhoto.addEventListener('click', () => {
        if (currentPhotoIndex < currentPhotos.length - 1) { // หากยังมีภาพถัดไป
            currentPhotoIndex++;
            galleryImage.src = currentPhotos[currentPhotoIndex]; // เปลี่ยนรูปภาพ
            updateGalleryButtons(); // อัปเดตปุ่ม
        }
    });
}

// ฟังก์ชันการกรองข้อมูล
function setupFilters() {
    const filterButton = document.getElementById('filterButton'); // ปุ่มกรอง
    const filterOptions = document.getElementById('filterOptions'); // ตัวเลือกกรอง
    const applyFilters = document.getElementById('applyFilters'); // ปุ่มใช้การกรอง

    // หากพบปุ่มกรองและตัวเลือก
    if (filterButton && filterOptions && applyFilters) {
        console.log('Filter elements found:', filterButton, filterOptions, applyFilters); // Debug
        filterButton.addEventListener('click', () => {
            console.log('Filter button clicked, current display:', filterOptions.style.display); // Debug
            filterOptions.style.display = filterOptions.style.display === 'block' ? 'none' : 'block'; // สลับการแสดงตัวเลือก
        });

        // เมื่อคลิกปุ่มใช้การกรอง
        applyFilters.addEventListener('click', () => {
            console.log('Apply filters clicked'); // Debug
            const types = ['typeBar', 'typePub', 'typeRestaurant'].filter(id => document.getElementById(id).checked).map(id => document.getElementById(id).value); // ประเภทบาร์ที่เลือก
            const prices = ['price1', 'price2', 'price3'].filter(id => document.getElementById(id).checked).map(id => parseInt(document.getElementById(id).value)); // ราคา
            const features = ['featureLive', 'featureOutdoor', 'featureParking'].filter(id => document.getElementById(id).checked).map(id => document.getElementById(id).value); // คุณสมบัติพิเศษ

            // กรองบาร์ตามตัวเลือก
            const filteredBars = {
                type: "FeatureCollection",
                features: barsData.features.filter(bar => {
                    const props = bar.properties;
                    return (
                        (!types.length || types.includes(props.type)) && // ประเภทที่เลือก
                        (!prices.length || prices.includes(props.price_level)) && // ราคาที่เลือก
                        (!features.length || features.every(f => props.features.includes(f))) // คุณสมบัติพิเศษที่เลือก
                    );
                })
            };
            barLayer = addBarsToMap(filteredBars); // เพิ่มบาร์ที่กรองแล้วลงในแผนที่
            filterOptions.style.display = 'none'; // ซ่อนตัวเลือกกรอง
        });
    } else {
        console.error('ไม่พบ element: filterButton, filterOptions, หรือ applyFilters'); // ถ้าไม่พบปุ่มหรือรายการกรอง
    }
}

// ฟังก์ชันการค้นหา
function setupSearch() {
    const searchInput = document.getElementById('searchInput'); // กล่องค้นหา
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase(); // คำค้นหาที่ผู้ใช้ป้อน
            // กรองบาร์ตามคำค้นหา
            const filteredBars = {
                type: "FeatureCollection",
                features: barsData.features.filter(bar =>
                    bar.properties.name.toLowerCase().includes(searchTerm) || // ค้นหาจากชื่อ
                    bar.properties.description.toLowerCase().includes(searchTerm) // ค้นหาจากคำอธิบาย
                )
            };
            barLayer = addBarsToMap(filteredBars); // เพิ่มบาร์ที่กรองแล้วลงในแผนที่
        });
    } else {
        console.error('ไม่พบ element: searchInput'); // ถ้าไม่พบกล่องค้นหา
    }
}

// ฟังก์ชันตำแหน่งของผู้ใช้
function setupUserLocation() {
    const userLocationButton = document.getElementById('userLocationButton'); // ปุ่มตำแหน่งผู้ใช้
    if (userLocationButton) {
        userLocationButton.addEventListener('click', () => {
            console.log('User location button clicked'); // Debug
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    position => {
                        console.log('Position received:', position); // Debug
                        const lat = position.coords.latitude; // ละติจูด
                        const lon = position.coords.longitude; // ลองจิจูด
                        if (userMarker) map.removeLayer(userMarker); // ลบมาร์กเกอร์เก่า
                        userMarker = L.marker([lat, lon], { // สร้างมาร์กเกอร์ใหม่
                            icon: L.divIcon({
                                className: 'custom-marker user-marker',
                                iconSize: [16, 16],
                                html: '<i class="fas fa-user"></i>' // ใช้ไอคอนผู้ใช้
                            })
                        }).addTo(map);
                        map.setView([lat, lon], 15); // ซูมแผนที่ไปที่ตำแหน่งของผู้ใช้
                        showNotification('พบตำแหน่งของคุณแล้ว!'); // แสดงข้อความแจ้งเตือน
                    },
                    error => {
                        console.error('Geolocation error:', error); // Debug
                        switch (error.code) {
                            case error.PERMISSION_DENIED:
                                showNotification('คุณไม่อนุญาตให้เข้าถึงตำแหน่ง'); // ถ้าไม่อนุญาต
                                break;
                            case error.POSITION_UNAVAILABLE:
                                showNotification('ไม่สามารถระบุตำแหน่งได้'); // ถ้าระบุตำแหน่งไม่ได้
                                break;
                            case error.TIMEOUT:
                                showNotification('การร้องขอตำแหน่งหมดเวลา'); // ถ้ารอเวลานานเกินไป
                                break;
                            default:
                                showNotification('เกิดข้อผิดพลาดในการระบุตำแหน่ง'); // ข้อผิดพลาดทั่วไป
                                break;
                        }
                    }
                );
            } else {
                showNotification('เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง'); // ถ้าเบราว์เซอร์ไม่รองรับ
            }
        });
    } else {
        console.error('ไม่พบ element: userLocationButton'); // ถ้าไม่พบปุ่มตำแหน่งผู้ใช้
    }
}


// Notification
function showNotification(message) {
    const notification = document.getElementById('notification');
    if (notification) {
        notification.textContent = message;  // ตั้งค่าข้อความการแจ้งเตือน
        notification.classList.add('show');  // เพิ่มคลาส 'show' เพื่อแสดงการแจ้งเตือน
        setTimeout(() => notification.classList.remove('show'), 3000);  // ลบคลาส 'show' หลังจาก 3 วินาที
    }
}

// Reservation Modal functionality
function setupReservationModal() {
    const reservationModal = document.getElementById('reservationModal');
    const barSelect = document.getElementById('barSelect');
    const reservationForm = document.getElementById('reservationForm');
    const closeModal = document.querySelector('#reservationModal .close');

    // โหลดรายการร้านลงใน <select>
    function loadBarsIntoSelect() {
        if (barsData && barSelect) {
            barsData.features.forEach(feature => {
                const barName = feature.properties.name;  // ดึงชื่อร้านจากข้อมูล
                const option = document.createElement('option');  // สร้าง <option> ใหม่
                option.value = barName;
                option.textContent = barName;
                barSelect.appendChild(option);  // เพิ่ม <option> ใน <select>
            });
        }
    }

    // เปิด modal
    window.openReservationModal = function(barName = null) {
        if (reservationModal) {
            barSelect.innerHTML = '<option value="">-- เลือกร้าน --</option>';  // ล้างตัวเลือกใน <select> ก่อน
            loadBarsIntoSelect();  // โหลดรายการร้านลงใน <select>
            if (barName) {
                barSelect.value = barName;  // ถ้ามี barName ที่ส่งมา ให้เลือกอัตโนมัติ
            }
            reservationModal.style.display = 'flex';  // แสดง modal
        } else {
            console.error('ไม่พบ element: reservationModal');
        }
    };

    // ปิด modal
    window.closeReservationModal = function() {
        if (reservationModal) {
            reservationModal.style.display = 'none';  // ซ่อน modal
        }
    };

    // ปิด modal เมื่อคลิกนอก modal
    window.addEventListener('click', (event) => {
        if (event.target === reservationModal) {
            reservationModal.style.display = 'none';  // ซ่อน modal เมื่อคลิกนอก modal
        }
    });

    // จัดการการส่งฟอร์ม
    if (reservationForm) {
        reservationForm.addEventListener('submit', async (e) => {
            e.preventDefault();  // ป้องกันการรีเฟรชหน้าหลังจากส่งฟอร์ม
            const barName = document.getElementById('barSelect').value;
            const reservationName = document.getElementById('reservationName').value;
            const reservationDateTime = document.getElementById('reservationDateTime').value;
            const numberOfPeople = document.getElementById('numberOfPeople').value;
            const phoneNumber = document.getElementById('phoneNumber').value;

            // ตรวจสอบข้อมูลที่กรอก
            if (!barName || !reservationName || !reservationDateTime || !numberOfPeople || !phoneNumber) {
                showNotification('กรุณากรอกข้อมูลให้ครบถ้วน');  // แจ้งเตือนกรอกข้อมูลไม่ครบ
                return;
            }

            // ตรวจสอบรูปแบบเบอร์โทรศัพท์ (ต้องเป็นตัวเลข 10 หลัก)
            const phonePattern = /^\d{10}$/;
            if (!phonePattern.test(phoneNumber)) {
                showNotification('เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก');  // แจ้งเตือนเบอร์โทรศัพท์ไม่ถูกต้อง
                return;
            }

            try {
                // ส่งข้อมูลการจองไปยัง API
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

                if (response.ok) {
                    showNotification(`จองโต๊ะที่ ${barName} สำเร็จ! ชื่อ: ${reservationName}, จำนวน: ${numberOfPeople} คน, เบอร์: ${phoneNumber}`);  // แจ้งเตือนสำเร็จ
                    reservationModal.style.display = 'none';  // ซ่อน modal หลังจากจองเสร็จ
                    reservationForm.reset();  // รีเซ็ตฟอร์ม
                } else {
                    const errorData = await response.json();
                    showNotification(`เกิดข้อผิดพลาด: ${errorData.error}`);  // แจ้งเตือนข้อผิดพลาดจาก API
                }
            } catch (error) {
                console.error('Error:', error);
                showNotification('เกิดข้อผิดพลาดในการจองโต๊ะ');  // แจ้งเตือนข้อผิดพลาด
            }
        });
    }
}

// Initialize everything after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    setupSearch();  // ตั้งค่าฟังก์ชันการค้นหา
    setupFilters();  // ตั้งค่าฟังก์ชันตัวกรอง
    setupPhotoGallery();  // ตั้งค่าฟังก์ชันแกลเลอรี
    setupUserLocation();  // ตั้งค่าฟังก์ชันตำแหน่งผู้ใช้
    setupReservationModal(); // เพิ่มการตั้งค่า Modal การจองโต๊ะ
});
