// Simulate loading time
setTimeout(() => document.getElementById('loadingOverlay').style.display = 'none', 1500);

let barsData = null;

// Fetch GeoJSON data
fetch('/api/bars')
    .then(response => response.ok ? response.json() : Promise.reject('ไม่สามารถโหลดข้อมูล GeoJSON ได้'))
    .then(data => {
        barsData = data;
        if (!barsData || !barsData.features || barsData.features.length === 0) {
            throw new Error('ไม่มีข้อมูลร้าน');
        }
        displayPopularBars();
        displayBars();
        setupReservationModal();
        setupSearch();
    })
    .catch(error => {
        console.error('Error loading GeoJSON:', error);
        showNotification('เกิดข้อผิดพลาดในการโหลดข้อมูลร้าน');
        const barList = document.getElementById('barList');
        barList.innerHTML = '<p style="text-align: center; color: #666;">ไม่สามารถโหลดข้อมูลร้านได้</p>';
    });

// Display popular bars (rating >= 4.5)
function displayPopularBars() {
    const popularBars = document.getElementById('popularBars');
    popularBars.innerHTML = '';
    
    const popular = barsData.features.filter(bar => bar.properties.rating >= 4.5);
    if (popular.length === 0) {
        popularBars.innerHTML = '<p style="text-align: center; color: #666;">ไม่มีร้านยอดนิยมในขณะนี้</p>';
        return;
    }
    popular.forEach(addBarItem.bind(null, popularBars));
}

// Display all bars
function displayBars(filteredBars = barsData.features) {
    const barList = document.getElementById('barList');
    barList.innerHTML = '';
    
    if (filteredBars.length === 0) {
        barList.innerHTML = '<p style="text-align: center; color: #666;">ไม่พบร้านที่ตรงกับคำค้นหา</p>';
        return;
    }
    
    filteredBars.forEach(feature => addBarItem(barList, feature));
}

// Add bar item to a container
function addBarItem(container, feature) {
    const { name, description, opening_hours, rating, tags, thumbnail } = feature.properties;
    const barItem = document.createElement('div');
    barItem.className = 'bar-item';
    barItem.setAttribute('data-name', name); // เพิ่ม data-name เพื่อใช้ในการค้นหา
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
    barItem.addEventListener('click', () => {
        window.location.href = `map.html?bar=${encodeURIComponent(name)}`;
    });
    container.appendChild(barItem);
}

// Setup search functionality
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    const autocompleteSuggestions = document.getElementById('autocompleteSuggestions');
    if (!searchInput || !autocompleteSuggestions) {
        console.error('ไม่พบ element: searchInput หรือ autocompleteSuggestions');
        return;
    }

    function performSearch(query) {
        if (!barsData || !barsData.features) {
            console.error('ไม่มีข้อมูล barsData');
            return;
        }

        const filteredBars = barsData.features.filter(feature => {
            const { name } = feature.properties;
            return name && name.toLowerCase().includes(query.toLowerCase());
        });

        // อัปเดต barList
        displayBars(filteredBars);

        // อัปเดต Autocomplete Suggestions
        updateAutocompleteSuggestions(query, filteredBars);
    }

    function updateAutocompleteSuggestions(query, filteredBars) {
        autocompleteSuggestions.innerHTML = '';
        if (query.length === 0 || filteredBars.length === 0) {
            autocompleteSuggestions.classList.remove('show');
            return;
        }

        filteredBars.slice(0, 5).forEach(feature => { // จำกัดที่ 5 รายการ
            const { name } = feature.properties;
            const suggestionItem = document.createElement('div');
            suggestionItem.className = 'suggestion-item';
            suggestionItem.textContent = name;
            suggestionItem.addEventListener('click', () => {
                searchInput.value = name;
                scrollToBar(name);
                autocompleteSuggestions.classList.remove('show');
            });
            autocompleteSuggestions.appendChild(suggestionItem);
        });

        autocompleteSuggestions.classList.add('show');
    }

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
                scrollToBar(barName);
                autocompleteSuggestions.classList.remove('show');
            } else {
                showNotification('ไม่พบร้านที่ตรงกับคำค้นหา');
            }
        }
    });
}

// Reservation Modal functionality
function setupReservationModal() {
    const reservationModal = document.getElementById('reservationModal');
    const barSelect = document.getElementById('barSelect');
    const reservationForm = document.getElementById('reservationForm');
    const closeModal = document.querySelector('#reservationModal .close');

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

    window.openReservationModal = function() {
        if (reservationModal) {
            barSelect.innerHTML = '<option value="">-- เลือกร้าน --</option>';
            loadBarsIntoSelect();
            reservationModal.style.display = 'flex';
        } else {
            console.error('ไม่พบ element: reservationModal');
        }
    };

    window.closeReservationModal = function() {
        if (reservationModal) {
            reservationModal.style.display = 'none';
        }
    };

    window.addEventListener('click', (event) => {
        if (event.target === reservationModal) {
            reservationModal.style.display = 'none';
        }
    });

    if (reservationForm) {
        reservationForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const barName = document.getElementById('barSelect').value;
            const reservationName = document.getElementById('reservationName').value;
            const reservationDateTime = document.getElementById('reservationDateTime').value;
            const numberOfPeople = document.getElementById('numberOfPeople').value;
            const phoneNumber = document.getElementById('phoneNumber').value;

            if (!barName || !reservationName || !reservationDateTime || !numberOfPeople || !phoneNumber) {
                showNotification('กรุณากรอกข้อมูลให้ครบถ้วน');
                return;
            }

            const phonePattern = /^\d{10}$/;
            if (!phonePattern.test(phoneNumber)) {
                showNotification('เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก');
                return;
            }

            try {
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

// Toggle wheel visibility
document.getElementById('spinWheelButton').addEventListener('click', () => {
    const wheelContainer = document.getElementById('wheelContainer');
    wheelContainer.style.display = 'flex';
});

// Close wheel
document.getElementById('closeWheelButton').addEventListener('click', () => {
    const wheelContainer = document.getElementById('wheelContainer');
    wheelContainer.style.display = 'none';
});

// Explore button (scroll to bar list)
document.getElementById('exploreButton').addEventListener('click', () => {
    document.querySelector('.bar-list-section').scrollIntoView({ behavior: 'smooth' });
});

// Notification function
function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.add('show');
    setTimeout(() => notification.classList.remove('show'), 3000);
}