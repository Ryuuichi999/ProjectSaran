// Simulate loading time
setTimeout(() => document.getElementById('loadingOverlay').style.display = 'none', 1500);

let barsData = null;

// Fetch GeoJSON data
fetch('./data/bars.geojson')
    .then(response => response.ok ? response.json() : Promise.reject('ไม่สามารถโหลดข้อมูล GeoJSON ได้'))
    .then(data => {
        barsData = data;
        displayPopularBars();
        displayBars();
        setupWheel();
    })
    .catch(error => {
        console.error('Error loading GeoJSON:', error);
        showNotification('เกิดข้อผิดพลาดในการโหลดข้อมูลร้าน');
    });

// Display popular bars (rating >= 4.5)
function displayPopularBars() {
    const popularBars = document.getElementById('popularBars');
    popularBars.innerHTML = '';
    
    barsData.features.filter(bar => bar.properties.rating >= 4.5).forEach(addBarItem.bind(null, popularBars));
}

// Display all bars
function displayBars() {
    const barList = document.getElementById('barList');
    barList.innerHTML = '';
    
    barsData.features.forEach(addBarItem.bind(null, barList));
}

// Add bar item to a container
function addBarItem(container, feature) {
    const { name, description, opening_hours, rating, tags, thumbnail } = feature.properties;
    const barItem = document.createElement('div');
    barItem.className = 'bar-item';
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

// Setup the spinning wheel
function setupWheel() {
    const wheel = document.getElementById('wheel');
    wheel.innerHTML = '';
    const numBars = barsData.features.length;
    const anglePerSegment = 360 / numBars;
    
    barsData.features.forEach((feature, index) => {
        const segment = document.createElement('div');
        segment.className = 'wheel-segment';
        segment.style.transform = `rotate(${index * anglePerSegment}deg)`;
        segment.style.backgroundColor = `hsl(${(index * 360) / numBars}, 70%, 50%)`;
        segment.innerHTML = feature.properties.name;
        wheel.appendChild(segment);
    });

    document.getElementById('spinButton').addEventListener('click', spinWheel);
}

// Spin the wheel
function spinWheel() {
    const wheel = document.getElementById('wheel');
    const numBars = barsData.features.length;
    const anglePerSegment = 360 / numBars;
    const randomAngle = Math.floor(Math.random() * 360) + 720;
    
    wheel.style.transform = `rotate(${randomAngle}deg)`;

    setTimeout(() => {
        const selectedIndex = Math.floor(((randomAngle % 360) / anglePerSegment + numBars) % numBars);
        const selectedBar = barsData.features[numBars - 1 - selectedIndex].properties.name;
        showNotification(`คุณได้ร้าน: ${selectedBar}!`);
        setTimeout(() => window.location.href = `map.html?bar=${encodeURIComponent(selectedBar)}`, 2000);
    }, 4000);
}

// Toggle wheel visibility
document.getElementById('spinWheelButton').addEventListener('click', () => {
    const wheelContainer = document.getElementById('wheelContainer');
    wheelContainer.style.display = wheelContainer.style.display === 'none' ? 'flex' : 'none';
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
