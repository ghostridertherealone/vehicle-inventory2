class PricePredictor {
    constructor(vehicles) {
        this.vehicles = vehicles;
    }

    predict(targetMake, targetModel, targetYear, targetMileage) {
        const similarVehicles = this.vehicles.filter(vehicle => 
            vehicle.Manufacturer === targetMake && 
            vehicle.Model === targetModel &&
            vehicle.Price && 
            vehicle["Mileage (km)"] && 
            vehicle["Mileage (km)"] !== "UNVERIFIED"
        );

        if (similarVehicles.length < 3) {
            return {
                predictedPrice: null,
                confidence: "insufficient_data",
                message: "Not enough data for accurate prediction",
                dataPoints: similarVehicles.length
            };
        }

        const basePrice = this.calculateBasePrice(similarVehicles, targetYear, targetMileage);
        const yearAdjustment = this.calculateYearAdjustment(similarVehicles, targetYear, basePrice);
        const mileageAdjustment = this.calculateMileageAdjustment(similarVehicles, targetMileage, basePrice);

        let predictedPrice = basePrice + yearAdjustment - mileageAdjustment;
        predictedPrice = this.applyPriceBounds(predictedPrice, basePrice);

        const { confidence, range } = this.calculateConfidence(similarVehicles.length);
        const priceRange = this.calculatePriceRange(predictedPrice, range);

        return {
            predictedPrice: Math.round(predictedPrice),
            confidence,
            priceRange,
            dataPoints: similarVehicles.length
        };
    }

    getMileageValue(mileage) {
        if (typeof mileage === 'number') return mileage;
        if (typeof mileage === 'string') {
            return parseInt(mileage.replace(/\D/g, '')) || 0;
        }
        return 0;
    }

    calculateBasePrice(vehicles, targetYear, targetMileage) {
        const weightedPrices = vehicles.map(vehicle => {
            const yearDiff = Math.abs(vehicle.Year - targetYear);
            const mileageDiff = Math.abs(this.getMileageValue(vehicle["Mileage (km)"]) - targetMileage);
            const similarity = 1 / (1 + yearDiff * 0.05 + mileageDiff * 0.00001);
            return vehicle.Price * similarity;
        });
        
        return weightedPrices.reduce((a, b) => a + b, 0) / weightedPrices.length;
    }

    calculateYearAdjustment(vehicles, targetYear, basePrice) {
        const averageYear = vehicles.reduce((sum, vehicle) => sum + vehicle.Year, 0) / vehicles.length;
        const yearDiff = targetYear - averageYear;
        // Reduced year impact from 5% to 2% per year
        return yearDiff * (basePrice * 0.02);
    }

    calculateMileageAdjustment(vehicles, targetMileage, basePrice) {
        const averageMileage = vehicles.reduce((sum, vehicle) => 
            sum + this.getMileageValue(vehicle["Mileage (km)"]), 0) / vehicles.length;
        const mileageDiff = targetMileage - averageMileage;
        // Reduced mileage impact and removed division by 1000
        return mileageDiff * (basePrice * 0.00002);
    }

    applyPriceBounds(price, basePrice) {
        // Changed bounds to be more conservative: 70% to 130% of base price
        const minPrice = basePrice * 0.7;
        const maxPrice = basePrice * 1.3;
        return Math.max(minPrice, Math.min(maxPrice, price));
    }

    calculateConfidence(dataPoints) {
        let confidence, range;
        
        if (dataPoints >= 10) {
            confidence = "high";
            range = 0.15;
        } else if (dataPoints >= 5) {
            confidence = "medium";
            range = 0.25;
        } else {
            confidence = "low";
            range = 0.35;
        }

        return { confidence, range };
    }

    calculatePriceRange(price, range) {
        return {
            low: Math.round(price * (1 - range)),
            high: Math.round(price * (1 + range))
        };
    }
}