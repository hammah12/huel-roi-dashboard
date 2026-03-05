import { calculateROI } from './src/utils/calculations.js';

// Test exactly matching the "OHM" profile from the actual Sheet test profile
const ohmData = {
    retailerName: 'OHM',
    routeToMarket: 'DSD',
    productName: 'Huel BE RTD', // 1.42 COGS, 4.99 SRP
    numStores: 110,
    baseVelocity: 1.5,
    srp: 4.49, // Sheet uses a custom SRP of $4.49 for OHM
    slottingFixed: 15000,
    slottingFreeFillQty: Object.keysArray ? 0 : 0,
    tprs: 0,
    marketing: 0
};
// 110 * 1.5 = 165 units / wk
// 165 * 52 = 8580 units / yr
// Huel Price (DSD) = 2.39
// Gross Rev = 8580 * 2.39 = $20,506.20? Wait, let's let the script run and compare

console.log(JSON.stringify(calculateROI(ohmData), null, 2));
