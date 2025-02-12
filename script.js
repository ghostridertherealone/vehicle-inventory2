import { manufacturerThemes } from './manufacturerThemes.js';
import { manufacturerCountries } from './manufacturerThemes.js';
import { findModelYearRange } from './manufacturerThemes.js';
let vehicles = [];
let currentDatabase = 'motorcycles';
let selectedModelDetails = new Map(); 
let isModelsContentExpanded = false;

const COLLECTION_NAME = 'asd32';

async function initializeData() {
  const vehiclesRef = db.collection(COLLECTION_NAME);
  const q = vehiclesRef.where('filename', '==', currentDatabase);
  const querySnapshot = await q.get();
}

initializeData();

async function loadDatabaseData(currentDatabase) {
  try {
    console.log("Starting database load for:", currentDatabase);
    
    const vehiclesRef = db.collection(COLLECTION_NAME);
    

    const allDocs = await vehiclesRef.get();
    console.log("Total documents in collection:", allDocs.size);
    

    allDocs.forEach(doc => {
      console.log("Found document with ID:", doc.id);
      console.log("Document data:", JSON.stringify(doc.data(), null, 2));
    });
    

    console.log("Attempting to filter for filename:", currentDatabase);
    const q = vehiclesRef.where('filename', '==', currentDatabase);
    const querySnapshot = await q.get();
    console.log("Filtered results:", querySnapshot.size);
    
    if (querySnapshot.size === 0) {

      console.log("No results found. Checking all filenames in collection:");
      allDocs.forEach(doc => {
        const data = doc.data();
        console.log("Document filename:", data.filename);
      });
      

      const qInsensitive = vehiclesRef.where('filename', '>=', currentDatabase.toLowerCase())
                                    .where('filename', '<=', currentDatabase.toLowerCase() + '\uf8ff');
      const insensitiveSnapshot = await qInsensitive.get();
      console.log("Case-insensitive search results:", insensitiveSnapshot.size);
    }
    
    vehicles = [];
    
    querySnapshot.forEach((doc) => {
      const vehicleData = doc.data();
      
      if (!vehicleData) {
        console.log("Warning: Empty document data for ID:", doc.id);
        return;
      }
      
      if (!vehicleData.data) {
        console.log("Warning: No 'data' field in document:", doc.id);
        console.log("Document structure:", Object.keys(vehicleData));
        return;
      }
      
      if (!Array.isArray(vehicleData.data)) {
        console.log("Warning: 'data' is not an array in document:", doc.id);
        console.log("Data type:", typeof vehicleData.data);
        return;
      }
      
      console.log(`Processing ${vehicleData.data.length} vehicles from document ${doc.id}`);
      
      vehicleData.data.forEach((vehicle, index) => {
        if (!vehicle) {
          console.log(`Warning: Empty vehicle at index ${index}`);
          return;
        }
        
        const processedVehicle = {
          Manufacturer: vehicle.Manufacturer || '',
          Model: vehicle.Model || '',
          Year: vehicle.Year || '',
          Price: typeof vehicle.Price === 'number' ? vehicle.Price : 
                 parseInt(vehicle.Price) || 0,
          "Mileage": vehicle.Mileage || 'UNVERIFIED',
          Condition: vehicle.Condition || ''
        };
        
        vehicles.push(processedVehicle);
        console.log(`Added vehicle: ${processedVehicle.Manufacturer} ${processedVehicle.Model}`);
      });
    });
    
    console.log("Final vehicles array length:", vehicles.length);
    if (vehicles.length > 0) {
      console.log("Sample first vehicle:", vehicles[0]);
    }

    const manufacturers = [...new Set(vehicles.map(vehicle => vehicle.Manufacturer))]
      .filter(Boolean)
      .sort();
    
    console.log("Unique manufacturers found:", manufacturers);
    
    selectedModelDetails.clear();
    document.getElementById("vehicle-list").innerHTML = '';
    
    const selectedModels = document.getElementById("selected-models");
    if (selectedModels) {
      selectedModels.innerHTML = '';
    }
    
  } catch (error) {
    console.error('Error loading vehicle data:', error);
    console.log("Error stack:", error.stack);
    alert('Error loading vehicle data. Please try again later.');
  }
}

function handleDatabaseToggle(event) {
  const database = event.target.checked ? 'cars' : 'motorcycles';
  currentDatabase = database;
  
  selectedModelDetails.clear();
  document.getElementById('price-sort').value = '';
  document.getElementById('year-sort').value = '';
  
  document.getElementById('vehicle-list').innerHTML = '';
  document.getElementById('summary').innerHTML = '';
  
  const selectedModelsContainer = document.getElementById('selected-models');
  if (selectedModelsContainer) {
    selectedModelsContainer.innerHTML = '';
  }
  
  loadDatabaseData(database);
}

function getMainModel(modelString) {
  return modelString.split(' ')[0];
}

function normalizeManufacturerName(name) {
  return name.trim().toUpperCase().replace(/[\s-]+/g, '_');
}

document.getElementById('page-toggle').addEventListener('change', function() {
  const transition = document.querySelector('.page-transition');
  transition.classList.add('active');
  
  setTimeout(() => {
    if (!this.checked) {
      window.location.href = 'prediction.html';
    } else {
      window.location.href = 'index.html';
    }
  }, 500);
});

document.addEventListener('DOMContentLoaded', function() {

  const pageToggle = document.getElementById('page-toggle');
  pageToggle.checked = window.location.pathname.includes('index.html') || 
                      window.location.pathname.endsWith('/');
  
  const transition = document.querySelector('.page-transition');
  if (transition.classList.contains('active')) {
    setTimeout(() => {
      transition.classList.remove('active');
    }, 100);
  }
});

window.removeModel = function(model) {
  const modelsContent = document.querySelector('.models-content');
  isModelsContentExpanded = !modelsContent?.classList.contains('collapsed');

  selectedModelDetails.delete(model);
  updateSelectedModelsList();
  filterVehicles();
  
  const updatedModelsContent = document.querySelector('.models-content');
  const toggleBtn = document.querySelector('.toggle-models-btn');
  
  if (isModelsContentExpanded && updatedModelsContent) {
    updatedModelsContent.classList.remove('collapsed');
    if (toggleBtn) toggleBtn.textContent = 'See less';
  }
  
  const summaryCards = document.querySelectorAll('.summary-card');
  summaryCards.forEach(card => card.classList.remove('active'));
};

function clearAllModels() {
  selectedModelDetails.clear();
  updateSelectedModelsList();
  filterVehicles();
}

function updateSelectedModelsList() {
  let selectedModelsContainer = document.getElementById("selected-models");
  if (!selectedModelsContainer) {
    selectedModelsContainer = document.createElement("div");
    selectedModelsContainer.id = "selected-models";
    document.querySelector(".sidebar").appendChild(selectedModelsContainer);
  }

  selectedModelsContainer.innerHTML = `
    <div class="models-header">
      <span class="models-count">${selectedModelDetails.size} models selected</span>
      <div class="models-header-buttons">
        ${selectedModelDetails.size > 0 ? '<button class="clear-all-btn">Clear all selections</button>' : ''}
        <button class="toggle-models-btn">See all</button>
      </div>
    </div>
    <div class="models-content collapsed">
      <div class="models-grid"></div>
    </div>
  `;

  const modelsGrid = selectedModelsContainer.querySelector('.models-grid');
  
  const clearAllBtn = selectedModelsContainer.querySelector('.clear-all-btn');
  if (clearAllBtn) {
    clearAllBtn.addEventListener('click', clearAllModels);
  }

  selectedModelDetails.forEach((make, model) => {
    const chip = document.createElement("span");
    chip.className = "model-chip";
    chip.innerHTML = `${make} ${model} <button class="remove-model" onclick="removeModel('${model}')">&times;</button>`;
    modelsGrid.appendChild(chip);
  });

  const toggleBtn = selectedModelsContainer.querySelector('.toggle-models-btn');
  const modelsContent = selectedModelsContainer.querySelector('.models-content');
  
  toggleBtn.addEventListener('click', () => {
    const isCollapsed = modelsContent.classList.contains('collapsed');
    modelsContent.classList.toggle('collapsed');
    toggleBtn.textContent = isCollapsed ? 'See less' : 'See all';
  });

  selectedModelsContainer.style.display = selectedModelDetails.size > 0 ? 'block' : 'none';
}

function filterVehicles() {
  const priceSortSelect = document.getElementById("price-sort");
  const yearSortSelect = document.getElementById("year-sort");
  const mileageSortSelect = document.getElementById("mileage-sort");
  const selectedPriceSort = priceSortSelect.value;
  const selectedYearSort = yearSortSelect.value;
  const selectedMileageSort = mileageSortSelect.value;

  if (selectedModelDetails.size === 0) {
    document.getElementById("vehicle-list").innerHTML = '';
    return;
  }

  let filteredVehicles = vehicles.filter(vehicle => {
    return selectedModelDetails.has(vehicle.Model) && 
           selectedModelDetails.get(vehicle.Model) === vehicle.Manufacturer;
  });

  filteredVehicles = applyFilters(filteredVehicles);

  if (selectedPriceSort === 'low-high') {
    filteredVehicles.sort((a, b) => a.Price - b.Price);
  } else if (selectedPriceSort === 'high-low') {
    filteredVehicles.sort((a, b) => b.Price - a.Price);
  }

  if (selectedYearSort === 'new-old') {
    filteredVehicles.sort((a, b) => b.Year - a.Year);
  } else if (selectedYearSort === 'old-new') {
    filteredVehicles.sort((a, b) => a.Year - b.Year);
  }

  if (selectedMileageSort === 'low-high' || selectedMileageSort === 'high-low') {
    filteredVehicles.sort((a, b) => {
      const mileageA = parseMileage(a["Mileage"]) || 0;
      const mileageB = parseMileage(b["Mileage"]) || 0;
      return selectedMileageSort === 'low-high' ? 
        mileageA - mileageB : 
        mileageB - mileageA;
    });
  }

  displayVehicles(filteredVehicles);
}

function parseMileage(mileageStr) {
  if (!mileageStr || mileageStr === "UNVERIFIED") return null;
  return parseInt(mileageStr.toString().replace(/\s+/g, '').replace('km', ''));
}

function applyFilters(vehicles) {
  const yearMin = document.getElementById('year-min').value;
  const yearMax = document.getElementById('year-max').value;
  const mileageMin = document.getElementById('mileage-min').value;
  const mileageMax = document.getElementById('mileage-max').value;
  const priceMin = document.getElementById('price-min').value;
  const priceMax = document.getElementById('price-max').value;
  
  return vehicles.filter(vehicle => {
    const year = parseInt(vehicle.Year);
    const mileage = parseMileage(vehicle["Mileage"]);
    const price = vehicle.Price;
    
    if (yearMin && year < parseInt(yearMin)) return false;
    if (yearMax && year > parseInt(yearMax)) return false;

    if (mileageMin && (!mileage || mileage < parseInt(mileageMin))) return false;
    if (mileageMax && (!mileage || mileage > parseInt(mileageMax))) return false;
    
    if (priceMin && price < parseInt(priceMin)) return false;
    if (priceMax && price > parseInt(priceMax)) return false;
    
    return true;
  });
}

function getLogoPath(manufacturer) {
  const logoFolder = currentDatabase === 'motorcycles' ? 'Logos-bike' : 'Logos-car';
  return `${logoFolder}/${manufacturer}.png`;
}
function getModelImagePath(vehicle) {
  const yearRange = findModelYearRange(
    vehicle.Manufacturer,
    vehicle.Model,
    parseInt(vehicle.Year)
  );
  
  if (!yearRange) {
    return `models/${vehicle.Year} ${vehicle.Manufacturer} ${vehicle.Model}.jpg`;
  }
  
  return `models/${yearRange.range} ${vehicle.Manufacturer} ${vehicle.Model}.jpg`;
}
function displayVehicles(vehicles) {
  const vehicleList = document.getElementById("vehicle-list");
  vehicleList.innerHTML = '';

  vehicles.forEach(vehicle => {
    const vehicleDiv = document.createElement("div");
    vehicleDiv.classList.add("vehicle-item");
    vehicleDiv.dataset.price = vehicle.Price;
    
    const normalizedManufacturer = normalizeManufacturerName(vehicle.Manufacturer);
    const theme = manufacturerThemes[normalizedManufacturer];
    const country = manufacturerCountries[normalizedManufacturer];
    
    if (theme) {
      vehicleDiv.style.backgroundColor = theme.background;
      vehicleDiv.style.color = theme.textColor;
      vehicleDiv.dataset.hoverColor = theme.hoverBackground;
    }
    
    const imageContainer = document.createElement('div');
    imageContainer.className = 'vehicle-image-container';
    
    const modelImage = document.createElement('img');
    modelImage.className = 'vehicle-model-image';
    modelImage.src = getModelImagePath(vehicle);
    modelImage.alt = `${vehicle.Year} ${vehicle.Manufacturer} ${vehicle.Model}`;
    modelImage.onerror = () => {
      modelImage.src = 'placeholder.jpg'; 
      modelImage.classList.add('image-not-found');
    };
    imageContainer.appendChild(modelImage);
    
    if (country) {
      const flagBanner = document.createElement('div');
      flagBanner.className = 'country-flag-banner';
      const flagImg = document.createElement('img');
      flagImg.src = `flags/${country}.svg`;
      flagImg.alt = country;
      flagBanner.appendChild(flagImg);
      vehicleDiv.appendChild(flagBanner);
    }
    
    const logoPath = getLogoPath(vehicle.Manufacturer);
    const logoImg = document.createElement('img');
    logoImg.className = 'manufacturer-logo';
    logoImg.alt = `${vehicle.Manufacturer} logo`;
    logoImg.src = logoPath;
    
    const priceFormatted = vehicle.Price?.toLocaleString() ?? 'N/A';
    const mileageFormatted = vehicle["Mileage"] ? 
      `${vehicle["Mileage"]} KM` : 'N/A';

    const infoContainer = document.createElement('div');
    infoContainer.className = 'vehicle-info-container';
    infoContainer.innerHTML = `
      <h3>${vehicle.Year} ${vehicle.Manufacturer} ${vehicle.Model}</h3>
      <p><strong>Mileage:</strong> ${mileageFormatted}</p>
      <p><strong>Price:</strong> R ${priceFormatted}</p>
      ${currentDatabase === 'cars' && vehicle.Dekra ? 
        `<p><strong>Dekra:</strong> ${vehicle.Dekra}</p>` : ''}
    `;
    
    vehicleDiv.appendChild(imageContainer);
    vehicleDiv.appendChild(logoImg);
    vehicleDiv.appendChild(infoContainer);
    vehicleList.appendChild(vehicleDiv);
  });
}

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('database-toggle').addEventListener('change', handleDatabaseToggle);
  document.getElementById("price-sort").addEventListener("change", filterVehicles);
  document.getElementById("year-sort").addEventListener("change", filterVehicles);
  document.getElementById('apply-filters').addEventListener('click', filterVehicles);
  document.getElementById("mileage-sort").addEventListener("change", filterVehicles);
  document.getElementById('clear-filters').addEventListener('click', function() {
    document.getElementById('year-min').value = '';
    document.getElementById('year-max').value = '';
    document.getElementById('mileage-min').value = '';
    document.getElementById('mileage-max').value = '';
    document.getElementById('price-min').value = '';
    document.getElementById('price-max').value = '';
    filterVehicles();
  });

  const yearInputs = [document.getElementById('year-min'), document.getElementById('year-max')];
  yearInputs.forEach(input => {
    input.addEventListener('change', function() {
      let value = parseInt(this.value);
      if (value < 1900) this.value = 1900;
      if (value > 2024) this.value = 2024;
    });
  });

  const searchContainer = document.querySelector('.search-container');
  const searchInput = document.querySelector('.search-input');
  const searchResults = document.querySelector('.search-results');

  document.addEventListener('click', (e) => {
    if (!searchContainer.contains(e.target)) {
      searchResults.innerHTML = '';
      searchInput.value = '';
    }
  });

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase().trim();
    if (!query) {
      searchResults.innerHTML = '';
      return;
    }
  
    const filteredVehicles = vehicles.filter(vehicle =>
      vehicle.Model.toLowerCase().includes(query) ||
      vehicle.Manufacturer.toLowerCase().includes(query)
    );
  
    const groupedByManufacturer = {};
    filteredVehicles.forEach(vehicle => {
      if (!groupedByManufacturer[vehicle.Manufacturer]) {
        groupedByManufacturer[vehicle.Manufacturer] = new Map();
      }
      
      const modelParts = vehicle.Model.split(' ');
      const mainModel = modelParts[0];
      const fullModel = vehicle.Model;
      
      if (!groupedByManufacturer[vehicle.Manufacturer].has(mainModel)) {
        groupedByManufacturer[vehicle.Manufacturer].set(mainModel, new Set());
      }
      
      if (modelParts.length > 1) {
        groupedByManufacturer[vehicle.Manufacturer].get(mainModel).add(fullModel);
      } else {
        groupedByManufacturer[vehicle.Manufacturer].get(mainModel).add(mainModel);
      }
    });
  
    searchResults.innerHTML = '';
  
    Object.entries(groupedByManufacturer).forEach(([manufacturer, modelGroups]) => {
      const manufacturerDiv = document.createElement('div');
      manufacturerDiv.className = 'manufacturer-group';
  
      const manufacturerHeader = document.createElement('div');
      manufacturerHeader.className = 'manufacturer-header';
  
      const manufacturerCheckbox = document.createElement('input');
      manufacturerCheckbox.type = 'checkbox';
      manufacturerCheckbox.className = 'manufacturer-checkbox';
      
      const manufacturerLabel = document.createElement('span');
      manufacturerLabel.textContent = manufacturer;
  
      const expandButton = document.createElement('button');
      expandButton.className = 'expand-button';
      expandButton.textContent = '▼';
      
      manufacturerHeader.appendChild(manufacturerCheckbox);
      manufacturerHeader.appendChild(manufacturerLabel);
      manufacturerHeader.appendChild(expandButton);
      manufacturerDiv.appendChild(manufacturerHeader);
  
      const modelsContainer = document.createElement('div');
      modelsContainer.className = 'models-container';

      manufacturerHeader.addEventListener('click', (e) => {
        if (e.target !== manufacturerCheckbox) {
          manufacturerCheckbox.checked = !manufacturerCheckbox.checked;
          const event = new Event('change');
          manufacturerCheckbox.dispatchEvent(event);
        }
      });
  
      modelGroups.forEach((subModels, mainModel) => {
        const modelGroupDiv = document.createElement('div');
        modelGroupDiv.className = 'model-group';
  
        const modelHeader = document.createElement('div');
        modelHeader.className = 'model-header';
        
        const modelCheckbox = document.createElement('input');
        modelCheckbox.type = 'checkbox';
        modelCheckbox.className = 'model-checkbox';
        
        const modelLabel = document.createElement('span');
        modelLabel.textContent = mainModel;
        
        modelHeader.appendChild(modelCheckbox);
        modelHeader.appendChild(modelLabel);
        modelGroupDiv.appendChild(modelHeader);

        modelHeader.addEventListener('click', (e) => {
          if (e.target !== modelCheckbox) {
            modelCheckbox.checked = !modelCheckbox.checked;
            const event = new Event('change');
            modelCheckbox.dispatchEvent(event);
          }
        });
  
        const subModelsDiv = document.createElement('div');
        subModelsDiv.className = 'sub-models';
  
        subModels.forEach(subModel => {
          if (subModel !== mainModel) {
            const subModelDiv = document.createElement('div');
            subModelDiv.className = 'sub-model';
            
            const subModelCheckbox = document.createElement('input');
            subModelCheckbox.type = 'checkbox';
            subModelCheckbox.className = 'sub-model-checkbox';
            
            const subModelLabel = document.createElement('span');
            subModelLabel.textContent = subModel;
            
            subModelDiv.appendChild(subModelCheckbox);
            subModelDiv.appendChild(subModelLabel);
            subModelsDiv.appendChild(subModelDiv);

            subModelDiv.addEventListener('click', (e) => {
              if (e.target !== subModelCheckbox) {
                subModelCheckbox.checked = !subModelCheckbox.checked;
                const event = new Event('change');
                subModelCheckbox.dispatchEvent(event);
              }
            });

            subModelCheckbox.addEventListener('change', () => {
              if (subModelCheckbox.checked) {
                selectedModelDetails.set(subModel, manufacturer);
              } else {
                selectedModelDetails.delete(subModel);
              }
              updateSelectedModelsList();
              filterVehicles();
            });
          }
        });
  
        modelGroupDiv.appendChild(subModelsDiv);
        modelsContainer.appendChild(modelGroupDiv);

        modelCheckbox.addEventListener('change', () => {
          const subModelCheckboxes = subModelsDiv.querySelectorAll('.sub-model-checkbox');
          subModelCheckboxes.forEach(checkbox => {
            checkbox.checked = modelCheckbox.checked;
            const subModelText = checkbox.nextElementSibling.textContent;
            if (modelCheckbox.checked) {
              selectedModelDetails.set(subModelText, manufacturer);
            } else {
              selectedModelDetails.delete(subModelText);
            }
          });
          updateSelectedModelsList();
          filterVehicles();
        });
      });
  
      manufacturerDiv.appendChild(modelsContainer);
      searchResults.appendChild(manufacturerDiv);

      manufacturerCheckbox.addEventListener('change', () => {
        const allModelCheckboxes = modelsContainer.querySelectorAll('.model-checkbox, .sub-model-checkbox');
        allModelCheckboxes.forEach(checkbox => {
          checkbox.checked = manufacturerCheckbox.checked;
          const modelText = checkbox.nextElementSibling.textContent;
          if (manufacturerCheckbox.checked) {
            selectedModelDetails.set(modelText, manufacturer);
          } else {
            selectedModelDetails.delete(modelText);
          }
        });
        updateSelectedModelsList();
        filterVehicles();
      });

      expandButton.addEventListener('click', (e) => {
        e.stopPropagation();
        modelsContainer.style.display = modelsContainer.style.display === 'none' ? 'block' : 'none';
        expandButton.textContent = modelsContainer.style.display === 'none' ? '▼' : '▲';
      });
    });
  });
});

loadDatabaseData('motorcycles');