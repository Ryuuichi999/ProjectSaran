// Simulate loading time
setTimeout(() => document.getElementById('loadingOverlay').style.display = 'none', 1500);

let barsData = null;

// Fetch GeoJSON data
fetch('./data/bars.geojson')
    .then(response => {
        if (!response.ok) {
            throw new Error('ไม่สามารถโหลดข้อมูล GeoJSON ได้');
        }
        return response.json();
    })
    .then(data => {
        barsData = data;
        displayPopularBars(barsData);
        displayBars(barsData);
        setupWheel(barsData);
    })
    .catch(error => {
        console.error('Error loading GeoJSON:', error);
        showNotification('เกิดข้อผิดพลาดในการโหลดข้อมูลร้าน');
    });

// Display popular bars (rating >= 4.5)
function displayPopularBars(bars) {
    const popularBars = document.getElementById('popularBars');
    const popularFeatures = bars.features.filter(feature => feature.properties.rating >= 4.5);

    popularFeatures.forEach(feature => {
        const props = feature.properties;
        const barItem = document.createElement('div');
        barItem.className = 'bar-item';
        barItem.innerHTML = `
            <img src="${props.thumbnail}" class="bar-image" alt="${props.name}">
            <div class="bar-content">
                <strong>${props.name}</strong>
                <p>${props.description}</p>
                <div class="bar-meta">
                    <span>${props.opening_hours}</span>
                    <span class="ratings">${'★'.repeat(Math.round(props.rating))} (${props.rating})</span>
                </div>
                <div class="bar-tags">${props.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>
            </div>
        `;
        barItem.addEventListener('click', () => {
            window.location.href = `map.html?bar=${encodeURIComponent(props.name)}`;
        });
        popularBars.appendChild(barItem);
    });
}

// Display all bars
function displayBars(bars) {
    const barList = document.getElementById('barList');
    barList.innerHTML = '';

    bars.features.forEach(feature => {
        const props = feature.properties;
        const barItem = document.createElement('div');
        barItem.className = 'bar-item';
        barItem.innerHTML = `
            <img src="${props.thumbnail}" class="bar-image" alt="${props.name}">
            <div class="bar-content">
                <strong>${props.name}</strong>
                <p>${props.description}</p>
                <div class="bar-meta">
                    <span>${props.opening_hours}</span>
                    <span class="ratings">${'★'.repeat(Math.round(props.rating))} (${props.rating})</span>
                </div>
                <div class="bar-tags">${props.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>
            </div>
        `;
        barItem.addEventListener('click', () => {
            window.location.href = `map.html?bar=${encodeURIComponent(props.name)}`;
        });
        barList.appendChild(barItem);
    });
}

// Setup the spinning wheel
function setupWheel(bars) {
    const wheel = document.getElementById('wheel');
    const numBars = bars.features.length;
    const anglePerSegment = 360 / numBars;

    bars.features.forEach((feature, index) => {
        const segment = document.createElement('div');
        segment.className = 'wheel-segment';
        segment.style.transform = `rotate(${index * anglePerSegment}deg)`;
        segment.style.backgroundColor = `hsl(${(index * 360) / numBars}, 70%, 50%)`;
        segment.style.clipPath = `polygon(50% 50%, 50% 0%, ${index === numBars - 1 ? '50%' : '100%'} 0%)`;
        segment.innerHTML = feature.properties.name;
        wheel.appendChild(segment);
    });

    const spinButton = document.getElementById('spinButton');
    let isSpinning = false;

    spinButton.addEventListener('click', () => {
        if (!isSpinning) {
            isSpinning = true;
            const randomAngle = Math.floor(Math.random() * 360) + 720; // หมุน 2 รอบ + มุมสุ่ม
            wheel.style.transform = `rotate(${randomAngle}deg)`;

            setTimeout(() => {
                const selectedIndex = Math.floor(((randomAngle % 360) / anglePerSegment + numBars) % numBars);
                const selectedBar = bars.features[numBars - 1 - selectedIndex].properties.name;
                showNotification(`คุณได้ร้าน: ${selectedBar}!`);
                setTimeout(() => {
                    window.location.href = `map.html?bar=${encodeURIComponent(selectedBar)}`;
                }, 2000);
                isSpinning = false;
            }, 4000);
        }
    });
}

// Toggle wheel visibility
document.getElementById('spinWheelButton').addEventListener('click', () => {
    const wheelContainer = document.getElementById('wheelContainer');
    wheelContainer.style.display = wheelContainer.style.display === 'none' ? 'flex' : 'none';
});

// Show all bars
document.getElementById('showAllBarsButton').addEventListener('click', () => {
    const wheelContainer = document.getElementById('wheelContainer');
    wheelContainer.style.display = 'none';
    displayBars(barsData);
});

// Explore button (scroll to bar list)
document.getElementById('exploreButton').addEventListener('click', () => {
    document.querySelector('.bar-list-section').scrollIntoView({ behavior: 'smooth' });
});

// Notification
function showNotification(message) {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.classList.add('show');
    setTimeout(() => notification.classList.remove('show'), 3000);
}