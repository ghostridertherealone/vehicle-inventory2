const COLLECTION_NAME = 'asd32';

class CloudPricePredictor {
    constructor() {
        this.vehicles = [];
        this.currentPrediction = null;
    }

    async initialize(database = 'motorcycles') {
        const loadingOverlay = document.getElementById('loading-overlay');
        const loadingText = loadingOverlay.querySelector('.loading-text');
        const chunksProgress = document.getElementById('chunks-progress');
        loadingText.textContent = `Loading ${database === 'cars' ? 'Cars' : 'Bikes'}...`;
        loadingOverlay.classList.remove('hidden');
    
        try {
            const vehiclesRef = db.collection(COLLECTION_NAME);
            const q = vehiclesRef.where('filename', '==', database);
            const querySnapshot = await q.get();
            
            if (querySnapshot.size === 0) {
                console.log("No results found for database:", database);
                return false;
            }

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
                    console.warn(`Invalid chunk data in document: ${doc.id}`);
                }
            });
    
            chunks.sort((a, b) => a.chunkNumber - b.chunkNumber);
            const expectedTotalChunks = chunks[0]?.totalChunks || 0;
            if (chunks.length !== expectedTotalChunks) {
                console.warn(`Warning: Found ${chunks.length} chunks but expected ${expectedTotalChunks}`);
            }
    
            this.vehicles = [];
    
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
                        "Mileage (km)": vehicle.Mileage || 'UNVERIFIED',
                        Condition: vehicle.Condition || ''
                    };
    
                    this.vehicles.push(processedVehicle);
                });
            });
    
            console.log(`Loaded ${this.vehicles.length} vehicles from database`);
            
            if (this.vehicles.length === 0) {
                console.warn('Warning: No vehicles were processed successfully');
                return false;
            }
    
            console.log('Sample first vehicle:', this.vehicles[0]);
            
            return true;
    
        } catch (error) {
            console.error('Error initializing predictor:', error);
            throw error;
        } finally {
            loadingOverlay.classList.add('hidden');
        }
    }
    
    predict(targetMake, targetModel, targetYear, targetMileage) {
        const similarVehicles = this.getSimilarVehicles(targetMake, targetModel, targetYear, targetMileage, this.vehicles);

        if (similarVehicles.length < 2) {
            return {
                predictedPrice: null,
                confidence: "insufficient_data",
                message: "Not enough similar vehicles found for accurate prediction",
                dataPoints: similarVehicles.length
            };
        }

        const isVintageLowMileage = this.isVintageLowMileage(targetYear, targetMileage);
        const { weightedPrice, averageScore } = this.calculateWeightedPrice(similarVehicles, targetYear, targetMileage, isVintageLowMileage);
        const { confidence, range } = this.calculateConfidence(similarVehicles.length, averageScore, isVintageLowMileage);
        const priceRange = this.calculatePriceRange(weightedPrice, similarVehicles, targetMake, targetModel, targetYear, targetMileage, isVintageLowMileage);

        return {
            predictedPrice: Math.round(weightedPrice),
            confidence,
            priceRange,
            dataPoints: similarVehicles.length,
            isVintageLowMileage,
            similarVehicles
        };
    }

    calculatePriceRange(price, similarVehicles, targetMake, targetModel, targetYear, targetMileage, isVintageLowMileage) {
        if (similarVehicles.length < 3) {
            return {
                low: Math.round(price * 0.8),
                high: Math.round(price * 1.2)
            };
        }

        const prices = similarVehicles.map(v => v.Price).sort((a, b) => a - b);
        const lowIndex = Math.floor(prices.length * 0.1);
        const highIndex = Math.floor(prices.length * 0.9);

        return {
            low: prices[lowIndex],
            high: prices[highIndex]
        };
    }

    getSimilarVehicles(targetMake, targetModel, targetYear, targetMileage, vehicles) {
        const matchingVehicles = vehicles.filter(vehicle => 
            vehicle.Manufacturer === targetMake && 
            vehicle.Model === targetModel &&
            vehicle.Price && 
            vehicle["Mileage (km)"] && 
            vehicle["Mileage (km)"] !== "UNVERIFIED" &&
            Math.abs(vehicle.Year - targetYear) <= 2 && 
            Math.abs(this.getMileageValue(vehicle["Mileage (km)"]) - targetMileage) <= 15000
        );

        const isVintage = (new Date().getFullYear() - targetYear) > 10;
        const yearThreshold = isVintage ? 3 : 2;

        const mileageRangeVehicles = this.filterByMileageRange(matchingVehicles, targetMileage, isVintage);

        return mileageRangeVehicles.filter(vehicle => 
            Math.abs(vehicle.Year - targetYear) <= yearThreshold
        );
    }

    filterByMileageRange(vehicles, targetMileage, isVintage) {
        let mileageThreshold;
        
        if (isVintage) {
            mileageThreshold = targetMileage < 20000 ? 25000 : 30000;
        } else {
            if (targetMileage < 10000) mileageThreshold = 8000;
            else if (targetMileage < 30000) mileageThreshold = 15000;
            else if (targetMileage < 50000) mileageThreshold = 20000;
            else mileageThreshold = 30000;
        }

        return vehicles.filter(vehicle => 
            Math.abs(this.getMileageValue(vehicle["Mileage (km)"]) - targetMileage) <= mileageThreshold
        );
    }

    getMileageValue(mileage) {
        if (typeof mileage === 'number') return mileage;
        if (typeof mileage === 'string') {
            return parseInt(mileage.replace(/\D/g, '')) || 0;
        }
        return 0;
    }

    isVintageLowMileage(year, mileage) {
        const currentYear = new Date().getFullYear();
        const age = currentYear - year;
        const avgYearlyMileage = mileage / age;
        return age > 10 && avgYearlyMileage < 3000;
    }

    calculateWeightedPrice(vehicles, targetYear, targetMileage, isVintageLowMileage) {
        const weights = [];
        const totalScores = [];

        for (const vehicle of vehicles) {
            const yearScore = this.calculateYearSimilarity(vehicle.Year, targetYear, isVintageLowMileage);
            const mileageScore = this.calculateMileageSimilarity(this.getMileageValue(vehicle["Mileage (km)"]), targetMileage, isVintageLowMileage);
            const similarityScore = Math.sqrt(yearScore * mileageScore);
            
            weights.push(similarityScore * vehicle.Price);
            totalScores.push(similarityScore);
        }

        const weightedPrice = weights.reduce((a, b) => a + b, 0) / totalScores.reduce((a, b) => a + b, 0);
        const averageScore = totalScores.reduce((a, b) => a + b, 0) / totalScores.length;

        return { weightedPrice, averageScore };
    }

    calculateYearSimilarity(vehicleYear, targetYear, isVintageLowMileage) {
        const yearDiff = Math.abs(vehicleYear - targetYear);
        const baseDecay = isVintageLowMileage ? 0.3 : 0.5;
        return Math.exp(-yearDiff * baseDecay);
    }

    calculateMileageSimilarity(vehicleMileage, targetMileage, isVintageLowMileage) {
        const mileageDiff = Math.abs(vehicleMileage - targetMileage);
        let mileageImpact;
        
        if (isVintageLowMileage) {
            mileageImpact = mileageDiff * 0.0002;
        } else if (targetMileage < 20000) {
            mileageImpact = mileageDiff * 0.00015;
        } else if (targetMileage < 50000) {
            mileageImpact = mileageDiff * 0.0001;
        } else {
            mileageImpact = mileageDiff * 0.00005;
        }

        return Math.exp(-mileageImpact);
    }
    findNearestMatch(make, model, year, mileage) {
        const matchingVehicles = this.vehicles.filter(v => 
            v.Manufacturer === make && 
            v.Model === model &&
            v["Mileage (km)"] !== "UNVERIFIED"
        );

        if (!matchingVehicles.length) return null;

        return matchingVehicles.reduce((nearest, vehicle) => {
            const currentMileageDiff = Math.abs(this.getMileageValue(vehicle["Mileage (km)"]) - mileage);
            const currentYearDiff = Math.abs(vehicle.Year - year);
            
            if (!nearest.vehicle) return { vehicle, score: currentYearDiff + (currentMileageDiff / 10000) };
            
            const nearestMileageDiff = Math.abs(this.getMileageValue(nearest.vehicle["Mileage (km)"]) - mileage);
            const nearestYearDiff = Math.abs(nearest.vehicle.Year - year);
            
            const currentScore = currentYearDiff + (currentMileageDiff / 10000);
            const nearestScore = nearestYearDiff + (nearestMileageDiff / 10000);
            
            return currentScore < nearestScore ? { vehicle, score: currentScore } : nearest;
        }, { vehicle: null, score: Infinity });
    }

    calculateConfidence(dataPoints, averageSimilarity, isVintageLowMileage) {
        let confidence, range;
        
        if (isVintageLowMileage) {
            if (dataPoints >= 5 && averageSimilarity >= 0.8) {
                confidence = "medium";
                range = 0.20;
            } else {
                confidence = "low";
                range = 0.25;
            }
        } else {
            if (dataPoints >= 8 && averageSimilarity >= 0.8) {
                confidence = "high";
                range = 0.10;
            } else if (dataPoints >= 5 && averageSimilarity >= 0.6) {
                confidence = "medium";
                range = 0.15;
            } else {
                confidence = "low";
                range = 0.20;
            }
        }

        return { confidence, range };
    }
}

window.CloudPricePredictor = CloudPricePredictor;
