document.addEventListener('DOMContentLoaded', () => {
    // Start polling immediately
    setInterval(fetchStats, 1000);
    fetchStats(); // Initial call

    // Load Multi-Camera Feeds
    fetch('/api/lanes')
        .then(response => response.json())
        .then(lanes => {
            const grid = document.getElementById('video-grid');
            if (!grid) return;
            grid.innerHTML = ''; // Clear loading text

            if (lanes.length === 0) {
                grid.innerHTML = '<p style="color:white;">No video feeds available.</p>';
                return;
            }

            lanes.forEach(lane => {
                const card = document.createElement('div');
                card.className = 'video-card';
                card.style.background = '#1e1e1e';
                card.style.borderRadius = '10px';
                card.style.overflow = 'hidden';
                card.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
                card.style.position = 'relative';
                // Adjust width for grid (approx 45% for 2 columns with gap)
                card.style.flex = '1 1 45%';
                card.style.minWidth = '400px';

                const title = document.createElement('div');
                title.innerText = lane;
                title.style.padding = '10px';
                title.style.background = '#252526';
                title.style.color = '#ddd';
                title.style.fontWeight = 'bold';
                title.style.borderBottom = '1px solid #333';
                title.style.display = 'flex';
                title.style.justifyContent = 'space-between';

                // Add Live Badge
                const titleText = document.createElement('span');
                titleText.innerText = lane;
                const badge = document.createElement('span');
                badge.innerText = 'LIVE';
                badge.style.background = '#ef4444';
                badge.style.color = 'white';
                badge.style.fontSize = '0.7em';
                badge.style.padding = '2px 5px';
                badge.style.borderRadius = '3px';

                title.appendChild(titleText);
                title.appendChild(badge);

                const img = document.createElement('img');
                img.src = `/video_feed/${lane}`;
                img.alt = `Feed ${lane}`;
                img.style.width = '100%';
                img.style.height = 'auto';
                img.style.display = 'block';

                card.appendChild(title);
                card.appendChild(img);
                grid.appendChild(card);
            });
        })
        .catch(err => console.error('Error loading lanes:', err));
});

// View Switching Logic
function switchView(viewName) {
    // 1. Hide all views
    document.getElementById('view-dashboard').style.display = 'none';
    document.getElementById('view-challans').style.display = 'none';
    document.getElementById('view-analytics').style.display = 'none';
    document.getElementById('view-settings').style.display = 'none';

    // 2. Show selected view
    document.getElementById('view-' + viewName).style.display = 'block';

    // 3. Update Sidebar Active State
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.getElementById('nav-' + viewName).classList.add('active');

    // 4. If switching to Challans, force a refresh of the table
    if (viewName === 'challans') {
        updateChallanTable();
    }
    if (viewName === 'analytics') {
        updateAnalytics();
    }
}

let lastViolationData = [];

function fetchStats() {
    // 1. Fetch Basic Stats
    fetch('/api/stats')
        .then(response => response.json())
        .then(data => {
            if (data.total_vehicles !== undefined) {
                document.getElementById('total-vehicles').innerText = data.total_vehicles;
            }
            if (data.current_speed_avg !== undefined) {
                document.getElementById('avg-speed').innerText = data.current_speed_avg.toFixed(1) + " km/h";
            }
            if (data.violations !== undefined) {
                document.getElementById('total-violations').innerText = data.violations;
            }
        })
        .catch(error => console.error('Error fetching stats:', error));

    // 2. Fetch Violations List
    fetch('/api/violations')
        .then(response => response.json())
        .then(data => {
            lastViolationData = data || []; // Store for use in other views

            // Update Dashboard Table (Recent 5)
            const dashboardTbody = document.getElementById('violations-table');
            if (dashboardTbody) {
                dashboardTbody.innerHTML = '';
                const recent = lastViolationData.slice(0, 5); // Show only top 5 on dashboard

                if (recent.length > 0) {
                    recent.forEach(v => {
                        const displayId = v.plate ? v.plate : `ID: ${v.id}`;
                        const row = `<tr>
                            <td>${v.timestamp.split(' ')[1]}</td>
                            <td>${displayId}</td>
                            <td>${parseFloat(v.speed).toFixed(1)} km/h</td>
                            <td><span class="status-badge">VIOLATION</span></td>
                            <td><a href="#" onclick="alert('Printing Ticket for ${displayId}...')" style="color:#00ffff; text-decoration:none;">Print</a></td>
                        </tr>`;
                        dashboardTbody.innerHTML += row;
                    });
                } else {
                    dashboardTbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color: #888;">No violations recorded</td></tr>';
                }
            }

            // If we are currently viewing Challans, update that table too
            if (document.getElementById('view-challans').style.display === 'block') {
                updateChallanTable();
            }
            // Update analytics if visible
            if (document.getElementById('view-analytics').style.display === 'block') {
                updateAnalytics();
            }
        })
        .catch(error => console.error('Error fetching violations:', error));
}

function updateChallanTable() {
    const tbody = document.querySelector('#full-challan-table tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (lastViolationData.length > 0) {
        lastViolationData.forEach(v => {
            // Escape backslashes for JS strings in onclick
            const safePath = v.challan_path.replace(/\\/g, "\\\\");
            // Extract filename for download link
            const filename = v.challan_path.split(/[/\\]/).pop();
            const displayId = v.plate ? v.plate : v.id;

            const row = `<tr>
                <td>${v.timestamp}</td>
                <td>CH-${v.id}</td>
                <td>${displayId}</td>
                <td>${v.lane}</td>
                <td>${parseFloat(v.speed).toFixed(1)} km/h</td>
                <td>$100.00</td>
                 <td><a href="/download/challan/${filename}" target="_blank" style="background:#007bff; color:white; border:none; padding:5px 10px; cursor:pointer; border-radius:3px; text-decoration:none; display:inline-block;">Download PDF</a></td>
            </tr>`;
            tbody.innerHTML += row;
        });
    } else {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; color: #888;">No challans generated yet.</td></tr>';
    }
}

// Analytics and Charts
let chartLane = null;
let chartSpeed = null;
let chartTime = null;

function updateAnalytics() {
    // 1. Basic Stats
    const total = lastViolationData.length;
    document.getElementById('analytics-total').innerText = total;

    let avgSpeed = 0;
    if (total > 0) {
        const sumSpeed = lastViolationData.reduce((acc, curr) => acc + parseFloat(curr.speed), 0);
        avgSpeed = sumSpeed / total;
    }
    document.getElementById('analytics-avg-speed').innerText = avgSpeed.toFixed(1) + " km/h";

    // 2. Prepare Data for Charts

    // Lane Distribution
    const laneCounts = { 'Lane 1': 0, 'Lane 2': 0 };
    lastViolationData.forEach(v => {
        if (laneCounts[v.lane] !== undefined) {
            laneCounts[v.lane]++;
        } else {
            // Handle unexpected lane names
            laneCounts[v.lane] = (laneCounts[v.lane] || 0) + 1;
        }
    });

    // Speed Distribution (Buckets of 20)
    const speedBuckets = { '0-20': 0, '20-40': 0, '40-60': 0, '60-80': 0, '80-100': 0, '100+': 0 };
    lastViolationData.forEach(v => {
        const s = parseFloat(v.speed);
        if (s < 20) speedBuckets['0-20']++;
        else if (s < 40) speedBuckets['20-40']++;
        else if (s < 60) speedBuckets['40-60']++;
        else if (s < 80) speedBuckets['60-80']++;
        else if (s < 100) speedBuckets['80-100']++;
        else speedBuckets['100+']++;
    });

    // Time Series (Group by Minute)
    const timeCounts = {};
    lastViolationData.forEach(v => {
        // timestamp format: "YYYY-MM-DD HH:MM:SS"
        // Extract HH:MM
        const timePart = v.timestamp.split(' ')[1]; // HH:MM:SS
        const minute = timePart.substring(0, 5); // HH:MM
        timeCounts[minute] = (timeCounts[minute] || 0) + 1;
    });

    // Sort time labels
    const sortedTimes = Object.keys(timeCounts).sort();
    const timeData = sortedTimes.map(t => timeCounts[t]);

    // 3. Render Charts
    renderCharts(laneCounts, speedBuckets, sortedTimes, timeData);
}

function renderCharts(laneCounts, speedBuckets, timeLabels, timeData) {
    Chart.defaults.color = '#a0aec0';
    Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';

    // Lane Chart
    const ctxLane = document.getElementById('chart-options-lane').getContext('2d');
    if (chartLane) chartLane.destroy();

    chartLane = new Chart(ctxLane, {
        type: 'bar',
        data: {
            labels: Object.keys(laneCounts),
            datasets: [{
                label: 'Violations',
                data: Object.values(laneCounts),
                backgroundColor: ['#3b82f6', '#8b5cf6'],
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
        }
    });

    // Speed Chart
    const ctxSpeed = document.getElementById('chart-speed-dist').getContext('2d');
    if (chartSpeed) chartSpeed.destroy();

    chartSpeed = new Chart(ctxSpeed, {
        type: 'bar',
        data: {
            labels: Object.keys(speedBuckets),
            datasets: [{
                label: 'Vehicles',
                data: Object.values(speedBuckets),
                backgroundColor: '#10b981',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
        }
    });

    // Time Series Chart
    const ctxTime = document.getElementById('chart-time-series').getContext('2d');
    if (chartTime) chartTime.destroy();

    chartTime = new Chart(ctxTime, {
        type: 'line',
        data: {
            labels: timeLabels,
            datasets: [{
                label: 'Violations per Minute',
                data: timeData,
                borderColor: '#f59e0b',
                backgroundColor: 'rgba(245, 158, 11, 0.2)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
        }
    });
}

function clearHistory() {
    if (confirm("ARE YOU SURE? This will permanently delete all violation data, challan PDFs, and snapshots. This action cannot be undone.")) {
        fetch('/api/clear_history', {
            method: 'POST'
        })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    alert("System history cleared successfully.");
                    location.reload();
                } else {
                    alert("Error clearing history: " + data.message);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert("Failed to clear history.");
            });
    }
}
