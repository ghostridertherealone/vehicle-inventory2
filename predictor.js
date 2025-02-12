let vehicles = [];
let predictor;
let currentDatabase = 'motorcycles';

async function loadDatabaseData(database) {
    try {
        console.log("Starting database load for:", database);
        
        predictor = new window.CloudPricePredictor();
        const success = await predictor.initialize(database);
        
        if (!success) {
            console.error('Failed to initialize predictor');
            throw new Error('Failed to initialize predictor');
        }

        vehicles = predictor.vehicles;
        console.log("Loaded vehicles:", vehicles.length);
        
        updateMakeOptions();
        
        const modelSelect = document.getElementById("model");
        if (modelSelect) {
            modelSelect.innerHTML = '<option value="">--Select Model--</option>';
        }
        
        const predictionDiv = document.getElementById('price-prediction');
        if (predictionDiv) {
            predictionDiv.innerHTML = '';
        }
        
    } catch (error) {
        console.error('Error loading vehicle data:', error);
        console.log("Error stack:", error.stack);
        alert('Error loading vehicle data. Please try again later.');
    }
}
function updateMakeOptions() {
    const makeSelect = document.getElementById("make");
    makeSelect.innerHTML = '<option value="">--Select Make--</option>';
    
    const manufacturers = [...new Set(vehicles.map(vehicle => vehicle.Manufacturer))].sort();
    manufacturers.forEach(manufacturer => {
        const option = document.createElement("option");
        option.value = manufacturer;
        option.textContent = manufacturer;
        makeSelect.appendChild(option);
    });
}
function updateModelOptions() {
    const makeSelect = document.getElementById("make");
    const modelSelect = document.getElementById("model");
    const selectedMake = makeSelect.value;

    modelSelect.innerHTML = '<option value="">--Select Model--</option>';

    if (selectedMake) {
        const models = [...new Set(
            vehicles
                .filter(vehicle => vehicle.Manufacturer === selectedMake)
                .map(vehicle => vehicle.Model)
        )].sort();

        models.forEach(model => {
            const option = document.createElement("option");
            option.value = model;
            option.textContent = model;
            modelSelect.appendChild(option);
        });
    }
}

function getPrediction() {
    const make = document.getElementById('make').value;
    const model = document.getElementById('model').value;
    const year = parseInt(document.getElementById('year').value);
    const mileage = parseInt(document.getElementById('mileage').value);

    if (!make || !model || !year || isNaN(year) || !mileage || isNaN(mileage)) {
        alert('Please fill in all fields with valid numbers');
        return;
    }

    predictor.currentPrediction = { make, model, year, mileage };
    const rangeResult = predictor.predict(make, model, year, mileage);
    displayResults(rangeResult);
}

function displayResults(rangeResult) {
    const predictionDiv = document.getElementById('price-prediction');
    
    if (!rangeResult || rangeResult.confidence === "insufficient_data") {
        predictionDiv.innerHTML = `
            <div class="fade-in">
                <div class="prediction-header">Insufficient data for prediction</div>
            </div>`;
        return;
    }

    const nearestMatch = predictor.findNearestMatch(
        predictor.currentPrediction.make,
        predictor.currentPrediction.model,
        predictor.currentPrediction.year,
        predictor.currentPrediction.mileage
    );

    let nearestMatchHtml = '';
    if (nearestMatch) {
        const mileageDiff = Math.abs(
            predictor.getMileageValue(nearestMatch.vehicle["Mileage (km)"]) - 
            predictor.currentPrediction.mileage
        );
        const yearDiff = Math.abs(nearestMatch.vehicle.Year - predictor.currentPrediction.year);
        
        nearestMatchHtml = `
            <div class="nearest-match">
                <div class="nearest-match-header">Nearest Match:</div>
                <div class="nearest-match-details">
                    <div class="match-stat">Year: ${nearestMatch.vehicle.Year} 
                        ${yearDiff ? `(${yearDiff} year ${nearestMatch.vehicle.Year > predictor.currentPrediction.year ? 'newer' : 'older'})` : '(same year)'}
                    </div>
                    <div class="match-stat">Mileage: ${predictor.getMileageValue(nearestMatch.vehicle["Mileage (km)"]).toLocaleString()} km 
                        (±${mileageDiff.toLocaleString()} km)
                    </div>
                    <div class="match-stat">Price: R${nearestMatch.vehicle.Price.toLocaleString()}</div>
                </div>
            </div>`;
    } else {
        nearestMatchHtml = `
            <div class="nearest-match">
                <div class="nearest-match-header">No Close Matches Found</div>
                <div class="nearest-match-details">
                    No vehicles found within:
                    <ul>
                        <li>Same year (±2,000 km)</li>
                        <li>Previous year (±4,000 km)</li>
                        <li>Next year (±2,000 km)</li>
                    </ul>
                </div>
            </div>`;
    }

    predictionDiv.innerHTML = `
        <div class="fade-in">
            <div class="prediction-header">
                R${rangeResult.priceRange.low.toLocaleString()} - R${rangeResult.priceRange.high.toLocaleString()}
            </div>
            <div class="prediction-subtext">
                <div class="confidence ${rangeResult.confidence}">
                    Confidence: ${rangeResult.confidence}
                </div>
                <div class="similar-vehicles-toggle">
                    Based on ${rangeResult.dataPoints} similar vehicles
                </div>
            </div>
            <div class="similar-vehicles-content hidden">
                <div class="sort-info"></div>
                <table class="similar-vehicles">
                    <thead>
                        <tr>
                            <th class="sortable" data-column="Year">Year</th>
                            <th class="sortable" data-column="Mileage">Mileage</th>
                            <th class="sortable" data-column="Price">Price</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                </table>
            </div>
            ${nearestMatchHtml}
        </div>`;

    const sortState = { column: 'Price', direction: 'asc' };
    const toggle = predictionDiv.querySelector('.similar-vehicles-toggle');
    const content = predictionDiv.querySelector('.similar-vehicles-content');
    
    toggle.addEventListener('click', () => {
        content.classList.toggle('hidden');
    });

    const headers = predictionDiv.querySelectorAll('.sortable');
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.column;
            if (sortState.column === column) {
                sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
            } else {
                sortState.column = column;
                sortState.direction = 'asc';
            }
            updateTableContent();
        });
    });

    function updateTableContent() {
        const sortedVehicles = [...rangeResult.similarVehicles].sort((a, b) => {
            let aValue = sortState.column === 'Mileage' ? 
                predictor.getMileageValue(a["Mileage (km)"]) : 
                a[sortState.column === 'Year' ? 'Year' : 'Price'];
            let bValue = sortState.column === 'Mileage' ? 
                predictor.getMileageValue(b["Mileage (km)"]) : 
                b[sortState.column === 'Year' ? 'Year' : 'Price'];
            
            return sortState.direction === 'asc' ? aValue - bValue : bValue - aValue;
        });

        const directionText = sortState.direction === 'asc' ? 'Low to High' : 'High to Low';
        predictionDiv.querySelector('.sort-info').textContent = 
            `Sort: ${sortState.column} (${directionText})`;
        
        predictionDiv.querySelector('tbody').innerHTML = sortedVehicles.map(v => `
            <tr>
                <td>${v.Year}</td>
                <td>${predictor.getMileageValue(v["Mileage (km)"]).toLocaleString()} km</td>
                <td>R${v.Price.toLocaleString()}</td>
            </tr>
        `).join('');
    }

    updateTableContent();

    predictionDiv.querySelectorAll('.sortable')('.sortable').forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.column;
            if (sortState.column === column) {
                sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
            } else {
                sortState.column = column;
                sortState.direction = 'asc';
            }
            updateTableContent();
        });
    });

    updateTableContent();

    if (exactResult && exactResult.price) {
        document.getElementById('exact-price').textContent = 
            `R${exactResult.price.toLocaleString()}`;
        document.getElementById('exact-confidence').textContent = `Confidence: ${exactResult.confidence}`;
        document.getElementById('exact-confidence').className = `confidence ${exactResult.confidence}`;
        document.getElementById('match-type').textContent = 
            exactResult.matchType === 'exact' ? 'Based on exact match' : 'Based on similar vehicles';
    } else {
        document.getElementById('exact-price').textContent = "No exact match found";
        document.getElementById('exact-confidence').textContent = "";
        document.getElementById('match-type').textContent = "";
    }

    resultsDiv.classList.remove('hidden');

    predictionDiv.querySelector('.collapsible').addEventListener('click', function() {
        this.classList.toggle('active');
        const content = this.nextElementSibling;
        content.classList.toggle('hidden');
    });
}

document.addEventListener('DOMContentLoaded', function() {
    updateYearOptions();
    loadDatabaseData('motorcycles');
    document.getElementById('make').addEventListener('change', updateModelOptions);
    document.getElementById('database-toggle').addEventListener('change', (event) => {
        const database = event.target.checked ? 'cars' : 'motorcycles';
        currentDatabase = database;
        loadDatabaseData(database);
    });
});

document.getElementById('page-toggle').addEventListener('change', function() {
    const transition = document.querySelector('.page-transition');
    transition.classList.add('active');
    
    setTimeout(() => {
        window.location.href = this.checked ? 'index.html' : 'prediction.html';
    }, 500);
});

document.addEventListener('DOMContentLoaded', function() {
    const pageToggle = document.getElementById('page-toggle');
    pageToggle.checked = window.location.pathname.includes('index.html') || 
                        window.location.pathname.endsWith('/');
    
    const transition = document.querySelector('.page-transition');
    if (transition.classList.contains('active')) {
        setTimeout(() => transition.classList.remove('active'), 100);
    }
});

function updateYearOptions() {
    const yearSelect = document.getElementById("year");
    yearSelect.innerHTML = '<option value="">--Select Year--</option>';
    
    for (let year = 2025; year >= 1900; year--) {
        const option = document.createElement("option");
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }
}