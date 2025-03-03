import { manufacturerThemes } from './manufacturerThemes.js';
import { manufacturerCountries } from './manufacturerThemes.js';
import { findModelYearRange } from './manufacturerThemes.js';
let vehicles = [];
let currentDatabase = 'motorcycles';
let selectedModelDetails = new Map();
let filterTimeout;

const FILTER_DELAY = 800;
const COLLECTION_NAME = 'asd32';

async function initializeData() {
  const vehiclesRef = db.collection(COLLECTION_NAME);
  const q = vehiclesRef.where('filename', '==', currentDatabase);
}

initializeData();

async function loadDatabaseData(currentDatabase) {
  try {
    console.log("Starting database load for:", currentDatabase);
    
    const vehiclesRef = db.collection(COLLECTION_NAME);
    const q = vehiclesRef.where('filename', '==', currentDatabase);
    const querySnapshot = await q.get();
    
    if (querySnapshot.size === 0) {
      console.log("No results found for database:", currentDatabase);
      return;
    }
    
    vehicles = [];

    const chunks = [];
    querySnapshot.forEach((doc) => {
      const chunkData = doc.data();
      if (chunkData && chunkData.data && Array.isArray(chunkData.data)) {
        chunks.push({
          chunkNumber: chunkData.chunkNumber,
          totalChunks: chunkData.totalChunks,
          data: chunkData.data
        });
      } else {
        console.log("Warning: Invalid chunk data in document:", doc.id);
      }
    });

    chunks.sort((a, b) => a.chunkNumber - b.chunkNumber);

    const chunksProgress = document.getElementById('chunks-progress');
    
    chunks.forEach((chunk, index) => {
      console.log(`Processing chunk ${chunk.chunkNumber} of ${chunk.totalChunks}`);
      chunksProgress.textContent = `${index + 1}/${chunks.length}`;
      
      chunk.data.forEach((vehicle, vehicleIndex) => {
        if (!vehicle) {
          console.log(`Warning: Empty vehicle at index ${vehicleIndex} in chunk ${chunk.chunkNumber}`);
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

async function handleDatabaseToggle(event) {
  const database = event.target.checked ? 'cars' : 'motorcycles';
  currentDatabase = database;

  const loadingOverlay = document.getElementById('loading-overlay');
  const loadingText = loadingOverlay.querySelector('.loading-text');
  loadingText.textContent = `Loading ${database === 'cars' ? 'Cars' : 'Motorcycles'}...`;
  loadingOverlay.classList.remove('hidden');

  selectedModelDetails.clear();
  document.getElementById('price-sort').value = '';
  document.getElementById('year-sort').value = '';
  document.getElementById('vehicle-list').innerHTML = '';
  
  const selectedModelsContainer = document.getElementById('selected-models');
  if (selectedModelsContainer) {
    selectedModelsContainer.innerHTML = '';
  }
  
  try {
    await loadDatabaseData(database);
  } finally {
    loadingOverlay.classList.add('hidden');
  }
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

  selectedModelDetails.delete(model);
  updateSelectedModelsList();
  filterVehicles();
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
        ${selectedModelDetails.size > 0 ? '<button class="clear-all-btn">Clear all</button>' : ''}
        
      </div>
    </div>
    <div class="models-content">
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
    chip.innerHTML = `${model} <button class="remove-model" onclick="removeModel('${model}')">&times;</button>`;
    modelsGrid.appendChild(chip);
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

  const yearMin = parseInt(document.getElementById('year-min').value) || 0;
  const yearMax = parseInt(document.getElementById('year-max').value) || Infinity;
  const priceMin = parseInt(document.getElementById('price-min').value) || 0;
  const priceMax = parseInt(document.getElementById('price-max').value) || Infinity;
  const mileageMin = parseInt(document.getElementById('mileage-min').value) || 0;
  const mileageMax = parseInt(document.getElementById('mileage-max').value) || Infinity;

  filteredVehicles = filteredVehicles.filter(vehicle => {
    const mileage = parseMileage(vehicle["Mileage"]) || 0;
    return vehicle.Year >= yearMin &&
           vehicle.Year <= yearMax &&
           vehicle.Price >= priceMin &&
           vehicle.Price <= priceMax &&
           mileage >= mileageMin &&
           (mileageMax === Infinity || mileage <= mileageMax);
  });

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

  if (vehicles.length === 0) {
    const noResultsDiv = document.createElement("div");
    noResultsDiv.className = "no-results";
    
    const hasActiveFilters = [
      'year-min', 'year-max', 'mileage-min', 
      'mileage-max', 'price-min', 'price-max'
    ].some(id => document.getElementById(id).value !== '');
    
    const searchQuery = document.querySelector('.search-input').value.trim();
    
if (hasActiveFilters) {
      noResultsDiv.innerHTML = `
        <div class="no-results-content">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="19" y1="5" x2="5" y2="19"></line>
            <circle cx="6.5" cy="6.5" r="2.5"></circle>
            <circle cx="17.5" cy="17.5" r="2.5"></circle>
          </svg>
          <h3>No matches with current filters</h3>
          <p>Try adjusting your filters to see more results</p>
          <button id="clear-filters-btn" class="clear-filters-button">Clear all filters</button>
        </div>
      `;
      
      setTimeout(() => {
        const clearFiltersBtn = document.getElementById('clear-filters-btn');
        if (clearFiltersBtn) {
          clearFiltersBtn.addEventListener('click', () => {
            document.getElementById('year-min').value = '';
            document.getElementById('year-max').value = '';
            document.getElementById('mileage-min').value = '';
            document.getElementById('mileage-max').value = '';
            document.getElementById('price-min').value = '';
            document.getElementById('price-max').value = '';
            filterVehicles();
          });
        }
      }, 0);
    }
    
    vehicleList.appendChild(noResultsDiv);
    return;
  }


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
  setupFilterControls();
  document.getElementById('database-toggle').addEventListener('change', handleDatabaseToggle);
  document.getElementById("price-sort").addEventListener("change", filterVehicles);
  document.getElementById("year-sort").addEventListener("change", filterVehicles);
  document.getElementById("mileage-sort").addEventListener("change", filterVehicles);
  
  const yearInputs = [document.getElementById('year-min'), document.getElementById('year-max')];
  yearInputs.forEach(input => {
    input.addEventListener('change', function() {
      let value = parseInt(this.value);
      if (value < 1900) this.value = 1900;
      if (value > 2025) this.value = 2025;
    });
  });

  const searchContainer = document.querySelector('.search-container');
  const searchInput = document.querySelector('.search-input');
  const searchResults = document.querySelector('.search-results');

  document.addEventListener('click', (e) => {
    if (!searchContainer.contains(e.target)) {
      searchResults.innerHTML = '';
    }
  });

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase().trim();
    
    let filteredVehicles = vehicles;
    
    if (query) {
      filteredVehicles = vehicles.filter(vehicle =>
        vehicle.Model.toLowerCase().includes(query) ||
        vehicle.Manufacturer.toLowerCase().includes(query)
      );
    }
  
    searchResults.innerHTML = '';
    
    if (filteredVehicles.length === 0 && query) {
      const noResultsDiv = document.createElement('div');
      noResultsDiv.className = 'no-results';
      noResultsDiv.innerHTML = `
        <div class="no-results-content">
          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
          <h3>No matches found</h3>
          <p>We couldn't find any ${currentDatabase === 'cars' ? 'cars' : 'motorcycles'} matching "${query}"</p>
          <p>Double check your spelling and letter spacing.</p>
        </div>
      `;
      searchResults.appendChild(noResultsDiv);
      return;
    }
  
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

  const sortedManufacturers = Object.entries(groupedByManufacturer).sort((a, b) => 
    a[0].localeCompare(b[0], undefined, { sensitivity: 'base' })
  );

  sortedManufacturers.forEach(([manufacturer, modelGroups]) => {
      const manufacturerDiv = document.createElement('div');
      manufacturerDiv.className = 'manufacturer-group';
  
      const manufacturerHeader = document.createElement('div');
      manufacturerHeader.className = 'manufacturer-header';

      const headerLeftContent = document.createElement('div');
      headerLeftContent.className = 'manufacturer-header-left';
      
      const manufacturerCheckbox = document.createElement('input');
      manufacturerCheckbox.type = 'checkbox';
      manufacturerCheckbox.className = 'manufacturer-checkbox';
      
      const allModelsFromManufacturer = Array.from(modelGroups.values())
        .flatMap(subModels => Array.from(subModels));
      const allSelected = allModelsFromManufacturer
        .every(model => selectedModelDetails.has(model) && 
               selectedModelDetails.get(model) === manufacturer);
      manufacturerCheckbox.checked = allSelected;
      
      const manufacturerLabel = document.createElement('span');
      manufacturerLabel.textContent = manufacturer;
  
      const expandButton = document.createElement('button');
      expandButton.className = 'expand-button';
      expandButton.textContent = '▼';
      

headerLeftContent.appendChild(manufacturerCheckbox);
headerLeftContent.appendChild(manufacturerLabel);
manufacturerHeader.appendChild(expandButton);
manufacturerHeader.appendChild(headerLeftContent);


const manufacturerLogo = document.createElement('img');
manufacturerLogo.className = 'search-manufacturer-logo';
manufacturerLogo.src = getLogoPath(manufacturer);
manufacturerLogo.alt = `${manufacturer} logo`;
      manufacturerHeader.appendChild(manufacturerCheckbox);
      manufacturerHeader.appendChild(manufacturerLabel);
      manufacturerHeader.appendChild(manufacturerLogo);
      manufacturerHeader.appendChild(expandButton);
      manufacturerDiv.appendChild(manufacturerHeader);

      const modelsContainer = document.createElement('div');
      modelsContainer.className = 'models-container';
      modelsContainer.style.display = query ? 'block' : 'none';
      expandButton.textContent = query ? '▲' : '▼';
  
      manufacturerHeader.addEventListener('click', (e) => {
        if (e.target !== manufacturerCheckbox) {
          manufacturerCheckbox.checked = !manufacturerCheckbox.checked;
          const event = new Event('change');
          manufacturerCheckbox.dispatchEvent(event);
        }
      });
  
    const sortedMainModels = Array.from(modelGroups.entries()).sort((a, b) => 
      a[0].localeCompare(b[0], undefined, { sensitivity: 'base' })
    );

    sortedMainModels.forEach(([mainModel, subModels]) => {
        const modelGroupDiv = document.createElement('div');
        modelGroupDiv.className = 'model-group';
  
        const modelHeader = document.createElement('div');
        modelHeader.className = 'model-header';
        
        const modelCheckbox = document.createElement('input');
        modelCheckbox.type = 'checkbox';
        modelCheckbox.className = 'model-checkbox';
        
        const allSubModelsSelected = Array.from(subModels)
          .every(model => selectedModelDetails.has(model) && 
                 selectedModelDetails.get(model) === manufacturer);
        modelCheckbox.checked = allSubModelsSelected;
        
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
  
const sortedSubModels = Array.from(subModels).sort((a, b) => 
  a.localeCompare(b, undefined, { sensitivity: 'base' })
);

sortedSubModels.forEach(subModel => {
          if (subModel !== mainModel) {
            const subModelDiv = document.createElement('div');
            subModelDiv.className = 'sub-model';
            
            const subModelCheckbox = document.createElement('input');
            subModelCheckbox.type = 'checkbox';
            subModelCheckbox.className = 'sub-model-checkbox';

            subModelCheckbox.checked = selectedModelDetails.has(subModel) && 
                                     selectedModelDetails.get(subModel) === manufacturer;
            
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
  
  searchInput.addEventListener('focus', () => {
    const event = new Event('input');
    searchInput.dispatchEvent(event);
  });
});

const backToTopButton = document.getElementById('backToTop');

window.addEventListener('scroll', () => {
  if (window.pageYOffset > 300) {
    backToTopButton.style.display = 'block';
  } else {
    backToTopButton.style.display = 'none';
  }
});

backToTopButton.addEventListener('click', () => {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
});
function setupFilterControls() {
  const filterInputs = [
    'year-min', 'year-max',
    'mileage-min', 'mileage-max',
    'price-min', 'price-max'
  ].map(id => document.getElementById(id));
  
  const statusIndicator = document.createElement('div');
  statusIndicator.className = 'filter-status';
  statusIndicator.style.display = 'none';
  filterInputs[filterInputs.length - 1].parentNode.appendChild(statusIndicator);

  filterInputs.forEach(input => {
    let originalValue = input.value;
    
    input.addEventListener('input', () => {
      clearTimeout(filterTimeout);
      statusIndicator.textContent = 'Typing...';
      statusIndicator.style.display = 'block';
      input.classList.add('filter-modified');
      
      filterTimeout = setTimeout(() => {
        filterVehicles();
        statusIndicator.style.display = 'none';
      }, FILTER_DELAY);
    });
    
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        clearTimeout(filterTimeout);
        filterVehicles();
        statusIndicator.style.display = 'none';
      }
    });
    
    input.addEventListener('blur', () => {
      clearTimeout(filterTimeout);
      filterVehicles();
      statusIndicator.style.display = 'none';
    });
    
    input.dataset.originalValue = originalValue;
  });
  
  document.querySelectorAll('.clear-range-button').forEach(button => {
    button.addEventListener('click', (e) => {
      const rangeDiv = e.target.closest('div');
      const inputs = rangeDiv.querySelectorAll('input');
      inputs.forEach(input => {
        input.value = '';
        input.classList.remove('filter-modified');
      });
      filterVehicles();
    });
  });

  document.getElementById("price-sort").addEventListener("change", filterVehicles);
  document.getElementById("year-sort").addEventListener("change", filterVehicles);
  document.getElementById("mileage-sort").addEventListener("change", filterVehicles);
}

loadDatabaseData('motorcycles');
