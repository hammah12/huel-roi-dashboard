export let PRICING_TIERS = {
  "DSD": 2.39,
  "Distributor": 2.52,
  "Direct to Retailer": 2.85,
  "Wholesale": 3.00
};

export let PRODUCTS = {
  "Huel BE RTD": { cogs: 1.42, defaultSrp: 4.99 },
  "Huel DG RTD": { cogs: 0.77, defaultSrp: 3.49 }
};

export function updateDynamicPricing(pricingData, productData) {
  if (pricingData && Object.keys(pricingData).length > 0) {
    PRICING_TIERS = { ...PRICING_TIERS, ...pricingData };
  }
  if (productData && Object.keys(productData).length > 0) {
    PRODUCTS = { ...PRODUCTS, ...productData };
  }
}

export function calculateROI(clientData) {
  const productsList = clientData.products || [clientData];
  const huelUnitPrice = PRICING_TIERS[clientData.routeToMarket] || 2.85;

  // Vending revenue-share deal flag
  const isRevenueShare =
    clientData.clientType === 'Vending' &&
    clientData.dealType === 'revenue_share';

  const revenueSharePct = Number(clientData.revenueSharePct) / 100 || 0;
  const revenueShareMinMonthly = Number(clientData.revenueShareMin) || 0;
  const revenueShareMin = revenueShareMinMonthly * 12; // annualise for Year 1 comparison

  let totalYear1GrossRevenue = 0;
  let totalYear1GrossProfit = 0;
  let totalTradeExpenses = 0;
  let totalMachineCost = 0;

  let totalRetailerYear1Revenue = 0;
  let totalRetailerCost = 0;
  let totalPartnerPayout = 0;

  let totalAnnualUnitsAcrossProducts = 0;

  productsList.forEach(prod => {
    const productDef = PRODUCTS[prod.productName] || PRODUCTS["Huel BE RTD"];

    const stores = Number(prod.numStores) || 0;
    const velocity = Number(prod.baseVelocity) || 0;
    const priceSRP = Number(prod.srp) || productDef.defaultSrp;

    const totalAnnualUnits = stores * velocity * 52;
    totalAnnualUnitsAcrossProducts += totalAnnualUnits;

    // ── Huel Revenue & Gross Profit ──────────────────────────────────
    let year1GrossRevenue;
    let year1GrossProfit;

    if (isRevenueShare) {
      // Revenue Share vending deal:
      //   Huel owns the retail sales; partner is paid MAX(annual min, split% × sales).
      //   The partner payout is a trade cost, not a revenue reduction.
      const retailerGrossSales = totalAnnualUnits * priceSRP;
      year1GrossRevenue = retailerGrossSales; // Huel earns full retail sales

      // COGS based on units manufactured
      const totalCOGS = totalAnnualUnits * productDef.cogs;
      year1GrossProfit = year1GrossRevenue - totalCOGS;
    } else {
      // Standard RTM per-unit pricing
      const weeklyRevenue = stores * velocity * huelUnitPrice;
      year1GrossRevenue = weeklyRevenue * 52;

      const marginPercent = (huelUnitPrice - productDef.cogs) / huelUnitPrice;
      year1GrossProfit = year1GrossRevenue * marginPercent;
    }

    // ── Machine Costs (Vending only) ────────────────────────────────
    //   Both machineCostPerUnit and numMachines are now deal-level fields.
    //   Machine cost is only added once (on the first product iteration) to
    //   avoid double-counting when there are multiple products on the same deal.
    const machineCostPerUnit = Number(clientData.machineCostPerUnit || 0);
    const machineCount = Number(clientData.numMachines) || 0;
    const machineCost = prod === productsList[0] ? machineCostPerUnit * machineCount : 0;
    totalMachineCost += machineCost;

    // ── Partner Payout (Revenue Share deals only) ────────────────────
    //   Huel pays the partner MAX(annual floor, split% × retail sales).
    //   Computed once on the first product to avoid double-counting.
    let partnerPayout = 0;
    if (isRevenueShare && prod === productsList[0]) {
      const retailSales = totalAnnualUnits * priceSRP;
      const splitAmount = retailSales * revenueSharePct;
      partnerPayout = Math.max(revenueShareMin, splitAmount);
    }

    // ── Trade Expenses ───────────────────────────────────────────────
    const freeFillValue = Number(prod.slottingFreeFillQty || 0) * huelUnitPrice;
    const tradeExpenses =
      Number(prod.slottingFixed || 0) +
      freeFillValue +
      Number(prod.tprs || 0) +
      Number(prod.marketing || 0) +
      machineCost + // machine capex (first product only)
      partnerPayout;  // partner revenue share payout

    totalYear1GrossRevenue += year1GrossRevenue;
    totalYear1GrossProfit += year1GrossProfit;
    totalTradeExpenses += tradeExpenses;
    totalPartnerPayout += partnerPayout;

    // ── Retailer ROI ─────────────────────────────────────────────────
    const retailerYear1Revenue = totalAnnualUnits * priceSRP;
    const retailerCost = isRevenueShare
      ? year1GrossRevenue                       // retailer pays Huel the share amount
      : stores * velocity * huelUnitPrice * 52; // retailer buys at RTM price

    totalRetailerYear1Revenue += retailerYear1Revenue;
    totalRetailerCost += retailerCost;
  });

  const totalYear1Ebitda = totalYear1GrossProfit - totalTradeExpenses;
  const ebitdaMarginPercent = totalYear1GrossRevenue > 0
    ? totalYear1Ebitda / totalYear1GrossRevenue : 0;
  const productMarginPercent = totalYear1GrossRevenue > 0
    ? totalYear1GrossProfit / totalYear1GrossRevenue : 0;

  const monthlyGrossProfit = totalYear1GrossProfit / 12;
  const breakevenMonths = monthlyGrossProfit > 0
    ? totalTradeExpenses / monthlyGrossProfit : 0;

  const tradeRatePercent = totalYear1GrossRevenue > 0
    ? totalTradeExpenses / totalYear1GrossRevenue : 0;

  const retailerGrossProfit = totalRetailerYear1Revenue - totalRetailerCost;
  const retailerMarginPercent = totalRetailerYear1Revenue > 0
    ? retailerGrossProfit / totalRetailerYear1Revenue : 0;

  return {
    huel: {
      year1GrossRevenue: totalYear1GrossRevenue,
      productMarginPercent,
      year1GrossProfit: totalYear1GrossProfit,
      totalTradeExpenses,
      totalMachineCost,
      totalPartnerPayout,
      numMachines: Number(clientData.numMachines) || 0,
      annualUnits: totalAnnualUnitsAcrossProducts,
      year1Ebitda: totalYear1Ebitda,
      ebitdaMarginPercent,
      breakevenMonths,
      tradeRatePercent,
      isRevenueShare,
      revenueSharePct,
      revenueShareMinMonthly, // monthly floor (as entered)
      revenueShareMin,        // annualised (× 12) used in calculation
    },
    retailer: {
      year1Revenue: totalRetailerYear1Revenue,
      cost: totalRetailerCost,
      grossProfit: retailerGrossProfit,
      marginPercent: retailerMarginPercent
    }
  };
}
