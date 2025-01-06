import { manufacturerThemes } from './manufacturerThemes.js';
import { manufacturerCountries } from './manufacturerThemes.js';
let vehicles = [];
let currentDatabase = 'bikes';
let selectedModelDetails = new Map(); // Will store {model: make} pairs
let selectedModels = new Set(); // To store selected models
let isModelTreeExpanded = false;
let firstModel = null;
let isModelsContentExpanded = false;

// Create a MutationObserver to watch the make dropdown
const makeDropdownObserver = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
      const makeSelect = document.getElementById("make");
      if (!makeSelect.value) {
        // Clear model dropdown and related UI elements
        const modelSelect = document.getElementById("model");
        modelSelect.innerHTML = '<option value="">--Select Model--</option>';
        modelSelect.style.display = 'block';
        
        // Remove model tree if present
        const treeContainer = document.querySelector('.model-tree');
        if (treeContainer) {
          treeContainer.remove();
        }
        
        // Clear selections and update UI
        selectedModelDetails.clear();
        updateSelectedModelsList();
        filterVehicles();
      }
    }
  });
});

// Updated loadDatabaseData function to setup observer
async function loadDatabaseData(database) {
  try {
    const filename = database === 'bikes' ? 'motorcycles.json' : 'cars.json';
    const response = await fetch(filename);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    vehicles = await response.json();
    
    // Update make dropdown with available manufacturers
    const makeSelect = document.getElementById("make");
    makeSelect.innerHTML = '<option value="">--Select Make--</option>';
    
    // Setup observer for make dropdown
    makeDropdownObserver.observe(makeSelect, { 
      attributes: true, 
      attributeFilter: ['value'] 
    });
    
    // Get unique manufacturers and sort them
    const manufacturers = [...new Set(vehicles.map(vehicle => vehicle.Manufacturer))].sort();
    
    // Add manufacturer options
    manufacturers.forEach(manufacturer => {
      const option = document.createElement("option");
      option.value = manufacturer;
      option.textContent = manufacturer;
      makeSelect.appendChild(option);
    });
    
    // Clear any existing selections and filtered results
    selectedModelDetails.clear();
    document.getElementById("vehicle-list").innerHTML = '';
    document.getElementById("summary").innerHTML = '';
    if (document.getElementById("selected-models")) {
      document.getElementById("selected-models").innerHTML = '';
    }
  } catch (error) {
    console.error('Error loading vehicle data:', error);
    alert('Error loading vehicle data. Please try again later.');
  }
}

function handleDatabaseToggle(event) {
  const database = event.target.checked ? 'cars' : 'bikes';
  currentDatabase = database;
  
  // Clear all selections and filters
  selectedModelDetails.clear();
  document.getElementById('make').value = '';
  document.getElementById('model').value = '';
  document.getElementById('price-sort').value = '';
  document.getElementById('year-sort').value = '';
  
  // Clear displayed vehicles and summary
  document.getElementById('vehicle-list').innerHTML = '';
  document.getElementById('summary').innerHTML = '';
  
  // Clear selected models display
  const selectedModelsContainer = document.getElementById('selected-models');
  if (selectedModelsContainer) {
    selectedModelsContainer.innerHTML = '';
  }
  
  // Empty model tree if present
  const treeContainer = document.querySelector('.model-tree');
  if (treeContainer) {
    treeContainer.innerHTML = '';
  }
  
  // Fetch new data
  loadDatabaseData(database);
}
// Function to get the main model from a model string
function getMainModel(modelString) {
  // Get the first word (letters/numbers not separated by space)
  return modelString.split(' ')[0];
}

// Function to group models by their main model
function groupModelsByMain(models) {
  const groupedModels = new Map();
  
  models.forEach(model => {
    const mainModel = getMainModel(model);
    if (!groupedModels.has(mainModel)) {
      groupedModels.set(mainModel, new Set());
    }
    // Add the main model itself if it exists as a standalone model
    if (model === mainModel) {
      groupedModels.get(mainModel).add(mainModel);
    }
    // Add other variants
    if (model !== mainModel) {
      groupedModels.get(mainModel).add(model);
    }
  });
  
  // Convert Sets to sorted Arrays
  const sortedGroupedModels = new Map();
  groupedModels.forEach((subModels, mainModel) => {
    sortedGroupedModels.set(mainModel, Array.from(subModels).sort());
  });
  
  return sortedGroupedModels;
}

// Add new function to update model tree display
function updateModelTreeDisplay() {
  const tree = document.querySelector('.model-tree');
  if (!tree) return;

  const modelGroups = tree.querySelectorAll('.model-group');
  modelGroups.forEach((group, index) => {
    const mainModel = group.querySelector('.main-model').textContent;
    if (!isModelTreeExpanded && mainModel !== firstModel) {
      group.style.display = 'none';
    } else {
      group.style.display = 'block';
    }
    
    const subModels = group.querySelector('.sub-models');
    if (subModels) {
      subModels.style.display = isModelTreeExpanded ? 'block' : 'none';
    }
  });
}

function normalizeManufacturerName(name) {
  // Remove extra spaces, convert to uppercase, and replace both spaces and hyphens with underscores
  return name.trim().toUpperCase().replace(/[\s-]+/g, '_');
}

// Modify the updateModelOptions function
function updateModelOptions() {
  const makeSelect = document.getElementById("make");
  const modelSelect = document.getElementById("model");
  const selectedMake = makeSelect.value;
  const treeContainer = document.querySelector('.model-tree');
  
  // Store scroll position if tree exists
  const scrollPosition = treeContainer ? treeContainer.scrollTop : 0;

  // Remove existing model tree if present
  if (treeContainer) {
    treeContainer.remove();
  }

  modelSelect.innerHTML = '<option value="">--Select Model--</option>';

  if (!selectedMake) {
    modelSelect.style.display = 'block';
    selectedModelDetails.clear();
    updateSelectedModelsList();
    filterVehicles();
    return;
  }

  // Get all models for the selected make
  const models = [...new Set(vehicles.filter(vehicle => 
    vehicle.Manufacturer === selectedMake).map(vehicle => 
    vehicle.Model))].sort();

  // Filter out already selected models
  const availableModels = models.filter(model => !selectedModelDetails.has(model));

  // Group models by their main model
  const groupedModels = groupModelsByMain(availableModels);

  // Create the tree structure
  const tree = document.createElement('div');
  tree.className = 'model-tree';

  // Store the first model for collapsed state
  firstModel = groupedModels.keys().next().value;

  // Create and append model groups
  groupedModels.forEach((subModels, mainModel) => {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'model-group';
    
    const mainModelDiv = document.createElement('div');
    mainModelDiv.className = 'main-model';
    mainModelDiv.textContent = mainModel;
    mainModelDiv.onclick = (e) => {
      e.stopPropagation();
      if (!isModelTreeExpanded && mainModel === firstModel) {
        isModelTreeExpanded = true;
        updateModelTreeDisplay();
      } else {
        handleModelSelection(mainModel, selectedMake, true);
      }
    };
    groupDiv.appendChild(mainModelDiv);

    if (subModels.length > 1 || (subModels.length === 1 && subModels[0] !== mainModel)) {
      const subModelsDiv = document.createElement('div');
      subModelsDiv.className = 'sub-models';

      subModels.forEach(subModel => {
        if (subModel !== mainModel) {
          const subModelDiv = document.createElement('div');
          subModelDiv.className = 'sub-model';
          subModelDiv.textContent = subModel;
          subModelDiv.onclick = (e) => {
            e.stopPropagation();
            handleModelSelection(subModel, selectedMake, false);
          };
          subModelsDiv.appendChild(subModelDiv);
        }
      });
      groupDiv.appendChild(subModelsDiv);
    }
    tree.appendChild(groupDiv);
  });

  modelSelect.parentNode.insertBefore(tree, modelSelect.nextSibling);
  
  // Restore scroll position
  tree.scrollTop = scrollPosition;
  
  // Update the display based on expanded state
  updateModelTreeDisplay();
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

window.removeModel = function(model) {
  // Store the current state before updating
  const modelsContent = document.querySelector('.models-content');
  isModelsContentExpanded = !modelsContent?.classList.contains('collapsed');

  selectedModelDetails.delete(model);
  updateSelectedModelsList();
  
  // Restore the previous state
  const updatedModelsContent = document.querySelector('.models-content');
  const toggleBtn = document.querySelector('.toggle-models-btn');
  
  if (isModelsContentExpanded && updatedModelsContent) {
    updatedModelsContent.classList.remove('collapsed');
    if (toggleBtn) toggleBtn.textContent = 'See less';
  }
  
  updateModelOptions();
  filterVehicles();
  
  const summaryCards = document.querySelectorAll('.summary-card');
  summaryCards.forEach(card => card.classList.remove('active'));
  removeHighlights();
};

// Update handleModelSelection to handle main models and sub-models
function handleModelSelection(selectedModel, selectedMake, isMainModel) {
  if (isMainModel) {
    // Get all models that start with the main model
    const relatedModels = vehicles
      .filter(vehicle => vehicle.Manufacturer === selectedMake && 
              getMainModel(vehicle.Model) === selectedModel)
      .map(vehicle => vehicle.Model);
    
    // Add all related models to the selection
    relatedModels.forEach(model => {
      if (!selectedModelDetails.has(model)) {
        selectedModelDetails.set(model, selectedMake);
      }
    });
  } else {
    // Handle single model selection
    if (!selectedModelDetails.has(selectedModel)) {
      selectedModelDetails.set(selectedModel, selectedMake);
    } else {
      selectedModelDetails.delete(selectedModel);
    }
  }
  
  updateSelectedModelsList();
  updateModelOptions(); // Update to refresh visual feedback
  filterVehicles();
}

// Populate custom dropdown with options
function populateDropdown(containerId, options) {
  const container = document.getElementById(containerId);


  options.forEach(option => {
    const div = document.createElement("div");
    div.className = "dropdown-item";
    div.textContent = option;
    div.onclick = () => selectOption(containerId, option);
    container.appendChild(div);
  });
}

function filterDropdown(containerId, query) {
  const container = document.getElementById(containerId);
  const items = container.querySelectorAll(".dropdown-item");
  let hasVisibleItems = false;

  query = query.toLowerCase();
  items.forEach((item) => {
    if (item.textContent.toLowerCase().includes(query)) {
      item.style.display = ""; // Show matching item
      hasVisibleItems = true;
    } else {
      item.style.display = "none"; // Hide non-matching item
    }
  });

  // Show or hide the dropdown based on matching items
  container.style.display = hasVisibleItems ? "block" : "none";
}
function setupKeyboardNavigation(inputId, containerId) {
  const input = document.getElementById(inputId);
  const container = document.getElementById(containerId);

  input.addEventListener("keydown", (e) => {
    const items = Array.from(container.querySelectorAll(".dropdown-item"));
    let selectedIndex = items.findIndex((item) => item.classList.contains("selected"));

    if (e.key === "ArrowDown") {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % items.length;
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      selectedIndex = (selectedIndex - 1 + items.length) % items.length;
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      items[selectedIndex].click(); // Select item
    }

    items.forEach((item, index) => item.classList.toggle("selected", index === selectedIndex));
  });
}

// Add to DOMContentLoaded or similar initialization

// Populate the make and model dropdowns on load
document.addEventListener("DOMContentLoaded", () => {
  const makes = [...new Set(vehicles.map(vehicle => vehicle.Manufacturer))].sort();
  populateDropdown("make-options", makes);

});
document.addEventListener("click", (e) => {
  const dropdownContainers = document.querySelectorAll(".dropdown-container");
  dropdownContainers.forEach((container) => {
    const input = container.querySelector("input");
    const options = container.querySelector(".dropdown-options");
    if (!container.contains(e.target) && options) {
      options.style.display = "none"; // Hide options if clicking outside
    }
  });
});
function clearAllModels() {
  selectedModelDetails.clear();
  updateSelectedModelsList();
  updateModelOptions();
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

// Update filterVehicles function to use new applyFilters
function filterVehicles() {
  const priceSortSelect = document.getElementById("price-sort");
  const yearSortSelect = document.getElementById("year-sort");
  const selectedPriceSort = priceSortSelect.value;
  const selectedYearSort = yearSortSelect.value;

  if (selectedModelDetails.size === 0) {
    document.getElementById("vehicle-list").innerHTML = '';
    document.getElementById("summary").innerHTML = '';
    return;
  }

  let filteredVehicles = vehicles.filter(vehicle => {
    return selectedModelDetails.has(vehicle.Model) && 
           selectedModelDetails.get(vehicle.Model) === vehicle.Manufacturer;
  });

  // Apply all filters
  filteredVehicles = applyFilters(filteredVehicles);

  // Sort by Price
  if (selectedPriceSort === 'low-high') {
    filteredVehicles.sort((a, b) => a.Price - b.Price);
  } else if (selectedPriceSort === 'high-low') {
    filteredVehicles.sort((a, b) => b.Price - a.Price);
  }

  // Sort by Year
  if (selectedYearSort === 'new-old') {
    filteredVehicles.sort((a, b) => b.Year - a.Year);
  } else if (selectedYearSort === 'old-new') {
    filteredVehicles.sort((a, b) => a.Year - b.Year);
  }

  displaySummary(filteredVehicles);
  displayVehicles(filteredVehicles);
}

function parseMileage(mileageStr) {
  if (!mileageStr || mileageStr === "UNVERIFIED") return null;
  return parseInt(mileageStr.toString().replace(/\s+/g, '').replace('km', ''));
}

// Update applyYearMileageFilters function to include price and condition
function applyFilters(vehicles) {
  const yearMin = document.getElementById('year-min').value;
  const yearMax = document.getElementById('year-max').value;
  const mileageMin = document.getElementById('mileage-min').value;
  const mileageMax = document.getElementById('mileage-max').value;
  const priceMin = document.getElementById('price-min').value;
  const priceMax = document.getElementById('price-max').value;
  const condition = document.getElementById('condition-filter').value;
  
  return vehicles.filter(vehicle => {
    const year = parseInt(vehicle.Year);
    const mileage = parseMileage(vehicle["Mileage (km)"]);
    const price = vehicle.Price;
    
    // Year filter
    if (yearMin && year < parseInt(yearMin)) return false;
    if (yearMax && year > parseInt(yearMax)) return false;
    
    // Mileage filter
    if (mileageMin && (!mileage || mileage < parseInt(mileageMin))) return false;
    if (mileageMax && (!mileage || mileage > parseInt(mileageMax))) return false;
    
    // Price filter
    if (priceMin && price < parseInt(priceMin)) return false;
    if (priceMax && price > parseInt(priceMax)) return false;
    
    // Condition filter
    if (condition && vehicle.Condition !== condition) return false;
    
    return true;
  });
}



function displaySummary(filteredVehicles) {
  const summaryElement = document.getElementById("summary");
  
  // Check if there are enough vehicles
  if (filteredVehicles.length < 6) {
    summaryElement.innerHTML = `
      <div class="insufficient-data">
        <h2>Price Ranges</h2>
        <p>There are not enough vehicles of this model to accurately determine price and mileage ranges.</p>
      </div>
    `;
    return;
  }

  // Sort vehicles by price
  const sortedVehicles = [...filteredVehicles].sort((a, b) => a.Price - b.Price);

  const totalVehicles = sortedVehicles.length;
  const lowClassCount = Math.floor(totalVehicles / 3);
  const middleClassCount = Math.floor(totalVehicles / 3);
  
  const lowClassVehicles = sortedVehicles.slice(0, lowClassCount);
  const middleClassVehicles = sortedVehicles.slice(lowClassCount, lowClassCount + middleClassCount);
  const highClassVehicles = sortedVehicles.slice(lowClassCount + middleClassCount);

  // Store price boundaries for highlighting
  window.priceBoundaries = {
    lowMax: Math.max(...lowClassVehicles.map(v => v.Price)),
    middleMax: Math.max(...middleClassVehicles.map(v => v.Price))
  };

  // Helper functions remain the same
  const parseMileage = (mileageStr) => {
    if (!mileageStr || mileageStr === "UNVERIFIED") return null;
    return parseInt(mileageStr.toString().replace(/\s+/g, '').replace('km', ''));
  };

  const getRange = (vehicles, property) => {
    if (property === "Mileage (km)") {
      const validMileages = vehicles
        .map(v => parseMileage(v[property]))
        .filter(val => val !== null && !isNaN(val));
      
      if (validMileages.length === 0) return 'No verified mileage data';
      
      return `${Math.min(...validMileages).toLocaleString()} - ${Math.max(...validMileages).toLocaleString()}`;
    } else if (property === "Year") {
      const validValues = vehicles
        .map(v => v[property])
        .filter(val => val !== null && !isNaN(val));
      
      if (validValues.length === 0) return 'N/A';
      
      return `${Math.min(...validValues)} - ${Math.max(...validValues)}`;
    } else {
      const validValues = vehicles
        .map(v => v[property])
        .filter(val => val !== null && !isNaN(val));
      
      if (validValues.length === 0) return 'N/A';
      
      return `${Math.min(...validValues).toLocaleString()} - ${Math.max(...validValues).toLocaleString()}`;
    }
  };

  const summary = {
    LowClass: {
      PriceRange: getRange(lowClassVehicles, 'Price'),
      MileageRange: getRange(lowClassVehicles, 'Mileage (km)'),
      YearRange: getRange(lowClassVehicles, 'Year')
    },
    MiddleClass: {
      PriceRange: getRange(middleClassVehicles, 'Price'),
      MileageRange: getRange(middleClassVehicles, 'Mileage (km)'),
      YearRange: getRange(middleClassVehicles, 'Year')
    },
    HighClass: {
      PriceRange: getRange(highClassVehicles, 'Price'),
      MileageRange: getRange(highClassVehicles, 'Mileage (km)'),
      YearRange: getRange(highClassVehicles, 'Year')
    }
  };

  // Display summary with tooltip and clickable cards
  summaryElement.innerHTML = `
    <div class="price-guide-header">
      <h2>Price Guide</h2>
      <div class="tooltip">
        ℹ️
        <span class="tooltiptext">Click on any price range to highlight matching vehicles. You can select multiple ranges at once.</span>
      </div>
    </div>
    <div class="summary-grid">
      <div class="summary-card" data-category="low">
        <h3>Lower Third</h3>
        <p><strong>Price Range:</strong> R ${summary.LowClass.PriceRange}</p>
        <p><strong>Mileage Range:</strong> ${summary.LowClass.MileageRange} km</p>
        <p><strong>Year Range:</strong> ${summary.LowClass.YearRange}</p>
      </div>
      <div class="summary-card" data-category="middle">
        <h3>Middle Third</h3>
        <p><strong>Price Range:</strong> R ${summary.MiddleClass.PriceRange}</p>
        <p><strong>Mileage Range:</strong> ${summary.MiddleClass.MileageRange} km</p>
        <p><strong>Year Range:</strong> ${summary.MiddleClass.YearRange}</p>
      </div>
      <div class="summary-card" data-category="high">
        <h3>Upper Third</h3>
        <p><strong>Price Range:</strong> R ${summary.HighClass.PriceRange}</p>
        <p><strong>Mileage Range:</strong> ${summary.HighClass.MileageRange} km</p>
        <p><strong>Year Range:</strong> ${summary.HighClass.YearRange}</p>
      </div>
    </div>
  `;

  // Add click handlers to summary cards
  const summaryCards = summaryElement.querySelectorAll('.summary-card');
  summaryCards.forEach(card => {
    card.addEventListener('click', () => {
      const category = card.dataset.category;
      card.classList.toggle('active');
      highlightVehicles(category, card.classList.contains('active'));
    });
  });
}

// Function to get correct logo path based on database type
function getLogoPath(manufacturer) {
  const logoFolder = currentDatabase === 'bikes' ? 'Logos-bike' : 'Logos-car';
  // Return just the first format that exists
  return `${logoFolder}/${manufacturer}.png`;
}

// Modify displayVehicles function
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
    
    // Add country flag banner if country exists
    if (country) {
      const flagBanner = document.createElement('div');
      flagBanner.className = 'country-flag-banner';
      const flagImg = document.createElement('img');
      flagImg.src = `flags/${country}.svg`;
      flagImg.alt = country;
      flagBanner.appendChild(flagImg);
      vehicleDiv.appendChild(flagBanner);
    }
    
    // Rest of the existing vehicle display code...
    const logoPath = getLogoPath(vehicle.Manufacturer);
    const logoImg = document.createElement('img');
    logoImg.className = 'manufacturer-logo';
    logoImg.alt = `${vehicle.Manufacturer} logo`;
    logoImg.src = logoPath;
    
    const priceFormatted = vehicle.Price?.toLocaleString() ?? 'N/A';
    const mileageFormatted = vehicle["Mileage (km)"] ? 
      `${vehicle["Mileage (km)"]} KM` : 'N/A';

    const vehicleInfo = `
      <h3>${vehicle.Year} ${vehicle.Manufacturer} ${vehicle.Model}</h3>
      <p><strong>Mileage:</strong> ${mileageFormatted}</p>
      <p><strong>Condition:</strong> ${vehicle.Condition}</p>
      <p><strong>Price:</strong> R ${priceFormatted}</p>
      ${currentDatabase === 'cars' && vehicle.Dekra ? 
        `<p><strong>Dekra:</strong> ${vehicle.Dekra}</p>` : ''}
    `;
    
    vehicleDiv.appendChild(logoImg);
    vehicleDiv.insertAdjacentHTML('beforeend', vehicleInfo);
    vehicleList.appendChild(vehicleDiv);
  });
}

function highlightVehicles(category, shouldAdd) {
  const vehicleItems = document.querySelectorAll('.vehicle-item');
  const activeCards = document.querySelectorAll('.summary-card.active');
  
  if (activeCards.length === 0) {
    // If no cards are active, show all vehicles
    vehicleItems.forEach(item => {
      item.style.display = 'block';
      item.classList.remove('highlight-low', 'highlight-middle', 'highlight-high');
    });
    return;
  }

  vehicleItems.forEach(item => {
    const price = parseFloat(item.dataset.price);
    const highlightClass = `highlight-${category}`;
    
    if (category === 'low' && price <= window.priceBoundaries.lowMax) {
      item.classList.toggle(highlightClass, shouldAdd);
    } else if (category === 'middle' && price > window.priceBoundaries.lowMax && 
               price <= window.priceBoundaries.middleMax) {
      item.classList.toggle(highlightClass, shouldAdd);
    } else if (category === 'high' && price > window.priceBoundaries.middleMax) {
      item.classList.toggle(highlightClass, shouldAdd);
    }

    // Check if this item should be visible based on any active highlights
    const hasActiveHighlight = Array.from(activeCards).some(card => {
      const cardCategory = card.dataset.category;
      if (cardCategory === 'low') {
        return price <= window.priceBoundaries.lowMax;
      } else if (cardCategory === 'middle') {
        return price > window.priceBoundaries.lowMax && 
               price <= window.priceBoundaries.middleMax;
      } else if (cardCategory === 'high') {
        return price > window.priceBoundaries.middleMax;
      }
      return false;
    });

    item.style.display = hasActiveHighlight ? 'block' : 'none';
  });
}


function removeHighlights() {
  const vehicleItems = document.querySelectorAll('.vehicle-item');
  vehicleItems.forEach(item => {
    item.classList.remove('highlight-low', 'highlight-middle', 'highlight-high');
    item.style.display = 'block';
  });
}

function selectOption(containerId, value) {
  const input = containerId === "make-options" ? document.getElementById("make-search") : document.getElementById("model-search");
  const container = document.getElementById(containerId);

  // Clear previously selected
  container.querySelectorAll(".dropdown-item").forEach((item) => item.classList.remove("selected"));

  // Set selected and update input
  const selectedItem = Array.from(container.children).find((item) => item.textContent === value);
  if (selectedItem) selectedItem.classList.add("selected");

  input.value = value;
  container.style.display = "none"; // Hide the dropdown
}

function initializeSearch() {
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.className = 'search-input';
  searchInput.placeholder = 'Search makes and models...';
  
  const searchResults = document.createElement('div');
  searchResults.className = 'search-results';
  
  const loadingSpinner = document.createElement('div');
  loadingSpinner.className = 'loading-spinner';
  loadingSpinner.style.display = 'none';
  
  const searchContainer = document.createElement('div');
  searchContainer.className = 'search-container';
  searchContainer.appendChild(searchInput);
  searchContainer.appendChild(loadingSpinner);
  searchContainer.appendChild(searchResults);
  
  document.querySelector('.sidebar').prepend(searchContainer);
  
  let searchTimeout;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    loadingSpinner.style.display = 'block';
    searchTimeout = setTimeout(() => handleSearch(e.target.value), 300);
  });
  
  document.addEventListener('click', (e) => {
    if (!searchContainer.contains(e.target)) {
      searchResults.style.display = 'none';
    }
  });

  // Clear search when switching databases
  document.getElementById('database-toggle').addEventListener('change', () => {
    searchInput.value = '';
    searchResults.style.display = 'none';
  });
}

function handleSearch(query) {
  const searchResults = document.querySelector('.search-results');
  const loadingSpinner = document.querySelector('.loading-spinner');
  query = query.trim();
  
  if (!query) {
    searchResults.style.display = 'none';
    loadingSpinner.style.display = 'none';
    return;
  }
  
  const results = [];
  const seenMakes = new Set();
  const seenModels = new Set();
  const words = query.toLowerCase().split(/\s+/);
  
  vehicles.forEach(vehicle => {
    const make = vehicle.Manufacturer;
    const model = vehicle.Model;
    
    // Skip if model is already selected
    if (selectedModelDetails.has(model)) {
      return;
    }
    
    // Check if all search words appear in make/model in any order
    const makeModelString = `${make} ${model}`.toLowerCase();
    const matchesAllWords = words.every(word => makeModelString.includes(word));
    
    if (matchesAllWords) {
      if (!seenMakes.has(make)) {
        results.push({
          type: 'make',
          value: make,
          count: vehicles.filter(v => v.Manufacturer === make).length,
          matchPositions: findMatchPositions(make, words)
        });
        seenMakes.add(make);
      }
      
      if (!seenModels.has(model)) {
        results.push({
          type: 'model',
          value: model,
          make: make,
          count: vehicles.filter(v => v.Model === model).length,
          matchPositions: findMatchPositions(model, words)
        });
        seenModels.add(model);
      }
    }
  });
  
  displaySearchResults(results);
  loadingSpinner.style.display = 'none';
}

function findMatchPositions(text, searchWords) {
  const positions = [];
  const lowerText = text.toLowerCase();
  
  searchWords.forEach(word => {
    let pos = 0;
    while ((pos = lowerText.indexOf(word, pos)) !== -1) {
      positions.push({
        start: pos,
        end: pos + word.length
      });
      pos += 1;
    }
  });
  
  return positions.sort((a, b) => a.start - b.start);
}
function highlightText(text, positions) {
  if (!positions.length) return text;
  
  let result = '';
  let lastEnd = 0;
  
  positions.forEach(pos => {
    result += text.substring(lastEnd, pos.start);
    result += `<mark>${text.substring(pos.start, pos.end)}</mark>`;
    lastEnd = pos.end;
  });
  
  result += text.substring(lastEnd);
  return result;
}
function displaySearchResults(results) {
  const searchResults = document.querySelector('.search-results');
  searchResults.innerHTML = '';
  
  if (!results.length) {
    searchResults.innerHTML = '<div class="no-results">No results found</div>';
    searchResults.style.display = 'block';
    return;
  }
  
  const makeResults = results.filter(r => r.type === 'make');
  const modelResults = results.filter(r => r.type === 'model');
  
  makeResults.sort((a, b) => b.count - a.count);
  modelResults.sort((a, b) => b.count - a.count);
  
  if (makeResults.length) {
    const makeSection = document.createElement('div');
    makeSection.className = 'result-section';
    makeSection.innerHTML = '<div class="result-header">Makes</div>';
    
    makeResults.forEach(result => {
      const item = createResultItem(result);
      makeSection.appendChild(item);
    });
    searchResults.appendChild(makeSection);
  }
  
  if (modelResults.length) {
    const modelSection = document.createElement('div');
    modelSection.className = 'result-section';
    modelSection.innerHTML = '<div class="result-header">Models</div>';
    
    modelResults.forEach(result => {
      const item = createResultItem(result);
      modelSection.appendChild(item);
    });
    searchResults.appendChild(modelSection);
  }
  
  searchResults.style.display = 'block';
}

function createResultItem(result) {
  const item = document.createElement('div');
  item.className = 'result-item';
  
  if (result.type === 'make') {
    item.innerHTML = `
      <span class="result-main">${highlightText(result.value, result.matchPositions)}</span>
      <span class="result-count">${result.count}</span>
    `;
    item.onclick = () => {
      document.getElementById('make').value = result.value;
      updateModelOptions();
    };
  } else {
    item.innerHTML = `
      <span class="result-main">${highlightText(result.value, result.matchPositions)}</span>
      <span class="result-submake">${result.make}</span>
      <span class="result-count">${result.count}</span>
    `;
    item.onclick = () => {
      document.getElementById('make').value = result.make;
      updateModelOptions();
      handleModelSelection(result.value, result.make, false);
    };
  }
  
  return item;
}

document.addEventListener('DOMContentLoaded', initializeSearch);

loadDatabaseData('bikes');

document.addEventListener('DOMContentLoaded', function() {
  // Database and filtering functionality
  document.getElementById('database-toggle').addEventListener('change', handleDatabaseToggle);
  document.getElementById("make").addEventListener("change", updateModelOptions);
  document.getElementById("price-sort").addEventListener("change", filterVehicles);
  document.getElementById("year-sort").addEventListener("change", filterVehicles);
  document.getElementById('apply-filters').addEventListener('click', filterVehicles);
  document.getElementById('clear-filters').addEventListener('click', function() {
    document.getElementById('year-min').value = '';
    document.getElementById('year-max').value = '';
    document.getElementById('mileage-min').value = '';
    document.getElementById('mileage-max').value = '';
    document.getElementById('price-min').value = '';
    document.getElementById('price-max').value = '';
    document.getElementById('condition-filter').value = '';
    filterVehicles();
  });

// Add click event listener to handle clicking outside
document.addEventListener('click', (e) => {
  const tree = document.querySelector('.model-tree');
  if (tree && !tree.contains(e.target)) {
    isModelTreeExpanded = false;
    updateModelTreeDisplay();
  }
});
  // Year input validation
  const yearInputs = [document.getElementById('year-min'), document.getElementById('year-max')];
  yearInputs.forEach(input => {
    input.addEventListener('input', function() {
      let value = parseInt(this.value);
      if (value < 1900) this.value = 1900;
      if (value > 2024) this.value = 2024;
    });
  });
  });