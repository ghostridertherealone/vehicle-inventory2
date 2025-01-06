let vehicles = [];
let predictor;
let currentDatabase = 'bikes';

// Initialize the page
async function loadDatabaseData(database) {
    try {
        const filename = database === 'bikes' ? 'motorcycles.json' : 'cars.json';
        const response = await fetch(filename);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        vehicles = await response.json();
        predictor = new PricePredictor(vehicles);
        
        updateMakeOptions();
    } catch (error) {
        console.error('Error loading vehicle data:', error);
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

    // Validate inputs
    if (!make || !model || !year || !mileage) {
        alert('Please fill in all fields');
        return;
    }

    const result = predictor.predict(make, model, year, mileage);
    displayResults(result);
}

function displayResults(result) {
    const resultsDiv = document.getElementById('prediction-results');
    const priceRangeDiv = document.getElementById('price-range');
    const confidenceDiv = document.getElementById('confidence-level');
    const dataPointsDiv = document.getElementById('data-points');

    if (result.confidence === "insufficient_data") {
        priceRangeDiv.innerHTML = "Insufficient data for prediction";
        confidenceDiv.innerHTML = "";
        dataPointsDiv.innerHTML = `Based on ${result.dataPoints} similar vehicles`;
    } else {
        priceRangeDiv.innerHTML = `
            Estimated Price Range:<br>
            R ${result.priceRange.low.toLocaleString()} - R ${result.priceRange.high.toLocaleString()}
        `;
        confidenceDiv.innerHTML = `Confidence Level: ${result.confidence.charAt(0).toUpperCase() + result.confidence.slice(1)}`;
        dataPointsDiv.innerHTML = `Based on ${result.dataPoints} similar vehicles`;
    }

    resultsDiv.classList.remove('hidden');
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Set current year as default
    document.getElementById('year').value = new Date().getFullYear();
    
    // Initialize database
    loadDatabaseData('bikes');
    
    // Add event listeners
    document.getElementById('make').addEventListener('change', updateModelOptions);
    document.getElementById('database-toggle').addEventListener('change', (event) => {
        const database = event.target.checked ? 'cars' : 'bikes';
        currentDatabase = database;
        loadDatabaseData(database);
    });
});
document.getElementById('page-toggle').addEventListener('change', function() {
    const transition = document.querySelector('.page-transition');
    transition.classList.add('active');
    
    setTimeout(() => {
      if (!this.checked) {
        window.location.href = 'prediction.html';
      } else {
        window.location.href = 'index.html';
      }
    }, 500); // Wait for fade out before navigation
  });
  
  // Enhanced page load handling
  document.addEventListener('DOMContentLoaded', function() {
    // Set initial toggle state
    const pageToggle = document.getElementById('page-toggle');
    pageToggle.checked = window.location.pathname.includes('index.html') || 
                        window.location.pathname.endsWith('/');
    
    // Handle transition overlay
    const transition = document.querySelector('.page-transition');
    if (transition.classList.contains('active')) {
      // Ensure overlay is removed after page content starts fading in
      setTimeout(() => {
        transition.classList.remove('active');
      }, 100);
    }
  });