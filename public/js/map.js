// Simulate loading time
setTimeout(() => {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) loadingOverlay.style.display = 'none';
}, 1500);

// Initialize map
const map = L.map('map').setView([16.4467, 102.8330], 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// User location marker
let userMarker = null;
let barsData = null;
let barLayer = null;

// Get selected bar from query parameter
const urlParams = new URLSearchParams(window.location.search);
const selectedBarName = urlParams.get('bar');

// Define custom icons for each type
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

// Fetch GeoJSON data
fetch('/api/bars')
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
            focusOnBar(selectedBarName);
        }
        setupReservationModal();
    })
    .catch(error => {
        console.error('Error loading GeoJSON:', error);
        showNotification('เกิดข้อผิดพลาดในการโหลดข้อมูลร้าน');
    });

// Create custom marker icon based on type
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

    return L.marker([feature.geometry.coordinates[1], feature.geometry.coordinates[0]], { icon: icon });
}

// Add bars to map and sidebar
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

    const layer = L.geoJSON(bars, {
        pointToLayer: (feature, latlng) => createCustomMarker(feature),
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
                            <button class="popup-button" onclick="openReservationModal('${props.name}')">จองโต๊ะ</button>
                        </div>
                    </div>
                `;
            layer.bindPopup(popupContent);

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
                if (activeBarItem) activeBarItem.classList.remove('active');
                barItem.classList.add('active');
                activeBarItem = barItem;
                map.setView([feature.geometry.coordinates[1], feature.geometry.coordinates[0]], 15);
                layer.openPopup();
            });
            if (barList) barList.appendChild(barItem);
        }
    }).addTo(map);

    return layer;
}

// Focus on a specific bar
function focusOnBar(barName) {
    if (!barsData) {
        console.error('ข้อมูลร้านยังไม่โหลด');
        return;
    }

    const bar = barsData.features.find(b => b.properties.name === barName);
    if (bar) {
        const coords = bar.geometry.coordinates;
        map.setView([coords[1], coords[0]], 15);
        if (barLayer) {
            barLayer.eachLayer(layer => {
                if (layer.feature.properties.name === barName) {
                    layer.openPopup();
                    // ไฮไลต์ร้านใน sidebar
                    const barItems = document.querySelectorAll('.bar-item');
                    barItems.forEach(item => {
                        if (item.querySelector('strong').textContent === barName) {
                            if (activeBarItem) activeBarItem.classList.remove('active');
                            item.classList.add('active');
                            activeBarItem = item;
                            item.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                    });
                }
            });
        }
    } else {
        showNotification(`ไม่พบร้าน: ${barName}`);
    }
}

// Photo gallery functionality
function setupPhotoGallery() {
    const gallery = document.getElementById('photoGallery');
    const galleryImage = document.getElementById('galleryImage');
    const closeGallery = document.querySelector('.gallery-close');
    const prevPhoto = document.getElementById('prevPhoto');
    const nextPhoto = document.getElementById('nextPhoto');
    let currentPhotos = [], currentPhotoIndex = 0;

    window.openPhotoGallery = function (barName) {
        const bar = barsData.features.find(b => b.properties.name === barName);
        if (bar && bar.properties.photos) openGallery(bar.properties.photos);
    };

    function openGallery(photos, index = 0) {
        currentPhotos = photos;
        currentPhotoIndex = index;
        galleryImage.src = photos[index];
        gallery.style.display = 'flex';
        updateGalleryButtons();
    }

    function updateGalleryButtons() {
        prevPhoto.style.visibility = currentPhotoIndex > 0 ? 'visible' : 'hidden';
        nextPhoto.style.visibility = currentPhotoIndex < currentPhotos.length - 1 ? 'visible' : 'hidden';
    }

    if (closeGallery) closeGallery.addEventListener('click', () => gallery.style.display = 'none');
    if (prevPhoto) prevPhoto.addEventListener('click', () => {
        if (currentPhotoIndex > 0) {
            currentPhotoIndex--;
            galleryImage.src = currentPhotos[currentPhotoIndex];
            updateGalleryButtons();
        }
    });
    if (nextPhoto) nextPhoto.addEventListener('click', () => {
        if (currentPhotoIndex < currentPhotos.length - 1) {
            currentPhotoIndex++;
            galleryImage.src = currentPhotos[currentPhotoIndex];
            updateGalleryButtons();
        }
    });
}

// Filter functionality
function setupFilters() {
    const filterButton = document.getElementById('filterButton');
    const filterOptions = document.getElementById('filterOptions');
    const applyFilters = document.getElementById('applyFilters');

    if (filterButton && filterOptions && applyFilters) {
        console.log('Filter elements found:', filterButton, filterOptions, applyFilters); // Debug
        filterButton.addEventListener('click', () => {
            console.log('Filter button clicked, current display:', filterOptions.style.display); // Debug
            filterOptions.style.display = filterOptions.style.display === 'block' ? 'none' : 'block';
        });

        applyFilters.addEventListener('click', () => {
            console.log('Apply filters clicked'); // Debug
            const types = ['typeBar', 'typePub', 'typeRestaurant'].filter(id => document.getElementById(id).checked).map(id => document.getElementById(id).value);
            const prices = ['price1', 'price2', 'price3'].filter(id => document.getElementById(id).checked).map(id => parseInt(document.getElementById(id).value));
            const features = ['featureLive', 'featureOutdoor', 'featureParking'].filter(id => document.getElementById(id).checked).map(id => document.getElementById(id).value);

            const filteredBars = {
                type: "FeatureCollection",
                features: barsData.features.filter(bar => {
                    const props = bar.properties;
                    return (
                        (!types.length || types.includes(props.type)) &&
                        (!prices.length || prices.includes(props.price_level)) &&
                        (!features.length || features.every(f => props.features.includes(f)))
                    );
                })
            };
            barLayer = addBarsToMap(filteredBars);
            filterOptions.style.display = 'none';
        });
    } else {
        console.error('ไม่พบ element: filterButton, filterOptions, หรือ applyFilters');
    }
}

// Search functionality
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const filteredBars = {
                type: "FeatureCollection",
                features: barsData.features.filter(bar =>
                    bar.properties.name.toLowerCase().includes(searchTerm) ||
                    bar.properties.description.toLowerCase().includes(searchTerm)
                )
            };
            barLayer = addBarsToMap(filteredBars);
        });
    } else {
        console.error('ไม่พบ element: searchInput');
    }
}

// User location
function setupUserLocation() {
    const userLocationButton = document.getElementById('userLocationButton');
    if (userLocationButton) {
        userLocationButton.addEventListener('click', () => {
            console.log('User location button clicked'); // Debug
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    position => {
                        console.log('Position received:', position); // Debug
                        const lat = position.coords.latitude;
                        const lon = position.coords.longitude;
                        if (userMarker) map.removeLayer(userMarker);
                        userMarker = L.marker([lat, lon], {
                            icon: L.divIcon({
                                className: 'custom-marker user-marker',
                                iconSize: [16, 16],
                                html: '<i class="fas fa-user"></i>'
                            })
                        }).addTo(map);
                        map.setView([lat, lon], 15);
                        showNotification('พบตำแหน่งของคุณแล้ว!');
                    },
                    error => {
                        console.error('Geolocation error:', error); // Debug
                        switch (error.code) {
                            case error.PERMISSION_DENIED:
                                showNotification('คุณไม่อนุญาตให้เข้าถึงตำแหน่ง');
                                break;
                            case error.POSITION_UNAVAILABLE:
                                showNotification('ไม่สามารถระบุตำแหน่งได้');
                                break;
                            case error.TIMEOUT:
                                showNotification('การร้องขอตำแหน่งหมดเวลา');
                                break;
                            default:
                                showNotification('เกิดข้อผิดพลาดในการระบุตำแหน่ง');
                                break;
                        }
                    }
                );
            } else {
                showNotification('เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง');
            }
        });
    } else {
        console.error('ไม่พบ element: userLocationButton');
    }
}

// Notification
function showNotification(message) {
    const notification = document.getElementById('notification');
    if (notification) {
        notification.textContent = message;
        notification.classList.add('show');
        setTimeout(() => notification.classList.remove('show'), 3000);
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
                const barName = feature.properties.name;
                const option = document.createElement('option');
                option.value = barName;
                option.textContent = barName;
                barSelect.appendChild(option);
            });
        }
    }

    // เปิด modal
    window.openReservationModal = function(barName = null) {
        if (reservationModal) {
            // ล้างตัวเลือกใน <select> ก่อน
            barSelect.innerHTML = '<option value="">-- เลือกร้าน --</option>';
            // โหลดรายการร้าน
            loadBarsIntoSelect();
            // ถ้ามี barName ที่ส่งมา ให้เลือกอัตโนมัติ
            if (barName) {
                barSelect.value = barName;
            }
            reservationModal.style.display = 'flex';
        } else {
            console.error('ไม่พบ element: reservationModal');
        }
    };

    // ปิด modal
    window.closeReservationModal = function() {
        if (reservationModal) {
            reservationModal.style.display = 'none';
        }
    };

    // ปิด modal เมื่อคลิกนอก modal
    window.addEventListener('click', (event) => {
        if (event.target === reservationModal) {
            reservationModal.style.display = 'none';
        }
    });

    // จัดการการส่งฟอร์ม
    if (reservationForm) {
        reservationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const barName = document.getElementById('barSelect').value;
            const reservationName = document.getElementById('reservationName').value;
            const reservationDateTime = document.getElementById('reservationDateTime').value;
            const numberOfPeople = document.getElementById('numberOfPeople').value;
            const phoneNumber = document.getElementById('phoneNumber').value;

            // ตรวจสอบข้อมูล
            if (!barName || !reservationName || !reservationDateTime || !numberOfPeople || !phoneNumber) {
                showNotification('กรุณากรอกข้อมูลให้ครบถ้วน');
                return;
            }

            // ตรวจสอบรูปแบบเบอร์โทรศัพท์ (เช่น ต้องเป็นตัวเลข 10 หลัก)
            const phonePattern = /^\d{10}$/;
            if (!phonePattern.test(phoneNumber)) {
                showNotification('เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก');
                return;
            }

            try {
                // ส่งข้อมูลไปยัง API
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
                    showNotification(`จองโต๊ะที่ ${barName} สำเร็จ! ชื่อ: ${reservationName}, จำนวน: ${numberOfPeople} คน, เบอร์: ${phoneNumber}`);
                    reservationModal.style.display = 'none';
                    reservationForm.reset();
                } else {
                    const errorData = await response.json();
                    showNotification(`เกิดข้อผิดพลาด: ${errorData.error}`);
                }
            } catch (error) {
                console.error('Error:', error);
                showNotification('เกิดข้อผิดพลาดในการจองโต๊ะ');
            }
        });
    }
}

// Initialize everything after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    setupSearch();
    setupFilters();
    setupPhotoGallery();
    setupUserLocation();
    setupReservationModal(); // เพิ่มการตั้งค่า Modal การจองโต๊ะ
});