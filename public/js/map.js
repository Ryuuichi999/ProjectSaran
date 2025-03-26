// Simulate loading time
setTimeout(() => document.getElementById('loadingOverlay').style.display = 'none', 1500);

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

// Fetch GeoJSON data
fetch('data/bars.geojson')
    .then(response => {
        if (!response.ok) {
            throw new Error('ไม่สามารถโหลดข้อมูล GeoJSON ได้');
        }
        return response.json();
    })
    .then(data => {
        barsData = data;
        // เพิ่มข้อมูลร้านทั้งหมดลงในแผนที่และ sidebar
        barLayer = addBarsToMap(barsData);
        if (selectedBarName) {
            focusOnBar(selectedBarName);
        }
    })
    .catch(error => {
        console.error('Error loading GeoJSON:', error);
        showNotification('เกิดข้อผิดพลาดในการโหลดข้อมูลร้าน');
    });

// Create custom marker icon
function createCustomMarker(feature) {
    const rating = feature.properties.rating || 0;
    let markerClass = 'custom-marker';
    if (rating >= 4.5) markerClass += ' popular';
    else if (feature.properties.features.includes('live')) markerClass += ' featured';
    return L.divIcon({ className: markerClass, iconSize: [16, 16] });
}

// Add bars to map and sidebar
let activeBarItem = null;
function addBarsToMap(bars) {
    // ล้างข้อมูลเก่าออกก่อน
    document.getElementById("barList").innerHTML = '<h3>ร้านนั่งดื่มในขอนแก่น</h3>';
    map.eachLayer(layer => {
        if (layer instanceof L.Marker || layer instanceof L.GeoJSON) map.removeLayer(layer);
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    if (userMarker) map.addLayer(userMarker);

    const layer = L.geoJSON(bars, {
        pointToLayer: (feature, latlng) => L.marker(latlng, { icon: createCustomMarker(feature) }),
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
            document.getElementById('barList').appendChild(barItem);
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
const gallery = document.getElementById('photoGallery');
const galleryImage = document.getElementById('galleryImage');
const closeGallery = document.querySelector('.gallery-close');
const prevPhoto = document.getElementById('prevPhoto');
const nextPhoto = document.getElementById('nextPhoto');
let currentPhotos = [], currentPhotoIndex = 0;

function openPhotoGallery(barName) {
    const bar = barsData.features.find(b => b.properties.name === barName);
    if (bar && bar.properties.photos) openGallery(bar.properties.photos);
}

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

closeGallery.addEventListener('click', () => gallery.style.display = 'none');
prevPhoto.addEventListener('click', () => {
    if (currentPhotoIndex > 0) {
        currentPhotoIndex--;
        galleryImage.src = currentPhotos[currentPhotoIndex];
        updateGalleryButtons();
    }
});
nextPhoto.addEventListener('click', () => {
    if (currentPhotoIndex < currentPhotos.length - 1) {
        currentPhotoIndex++;
        galleryImage.src = currentPhotos[currentPhotoIndex];
        updateGalleryButtons();
    }
});

// Filter functionality
document.addEventListener('DOMContentLoaded', () => {
    const filterButton = document.getElementById('filterButton');
    const filterOptions = document.getElementById('filterOptions');
    const applyFilters = document.getElementById('applyFilters');

    if (filterButton && filterOptions) {
        filterButton.addEventListener('click', () => {
            console.log('Filter button clicked');
            filterOptions.style.display = filterOptions.style.display === 'block' ? 'none' : 'block';
        });

        applyFilters.addEventListener('click', () => {
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
        console.error('ไม่พบ element: filterButton หรือ filterOptions');
    }
});

// Search functionality
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('searchInput').addEventListener('input', (e) => {
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
});

// Sidebar toggle
const toggleSidebar = document.getElementById('toggleSidebar');
const sidebar = document.getElementById('barList');
toggleSidebar.addEventListener('click', () => {
    sidebar.style.display = sidebar.style.display === 'none' ? 'block' : 'none';
});

// User location
document.getElementById('userLocationButton').addEventListener('click', () => {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;
            if (userMarker) map.removeLayer(userMarker);
            userMarker = L.marker([lat, lon], {
                icon: L.divIcon({ className: 'custom-marker', iconSize: [16, 16], html: '<i class="fas fa-user"></i>' })
            }).addTo(map);
            map.setView([lat, lon], 15);
            showNotification('พบตำแหน่งของคุณแล้ว!');
        }, () => showNotification('ไม่สามารถหาตำแหน่งได้'));
    } else {
        showNotification('เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง');
    }
});

// Notification
function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.add('show');
    setTimeout(() => notification.classList.remove('show'), 3000);
}