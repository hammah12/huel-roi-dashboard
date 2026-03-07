export let PRICING_TIERS = {
  DSD: 2.39,
  Distributor: 2.52,
  'Direct to Retailer': 2.85,
  Wholesale: 3.0,
}

export let PRODUCTS = {
  'Huel BE RTD': { cogs: 1.42, defaultSrp: 4.99 },
  'Huel DG RTD': { cogs: 0.77, defaultSrp: 3.49 },
}

const DEFAULT_PRODUCT = 'Huel BE RTD'
const DEFAULT_ROUTE_TO_MARKET = 'DSD'

export function updateDynamicPricing(pricingData, productData) {
  if (pricingData && Object.keys(pricingData).length > 0) {
    PRICING_TIERS = { ...PRICING_TIERS, ...pricingData }
  }
  if (productData && Object.keys(productData).length > 0) {
    PRODUCTS = { ...PRODUCTS, ...productData }
  }
}

export function getProductsList(clientData) {
  return clientData?.products?.length ? clientData.products : [clientData]
}

export function getProductDefinition(productName) {
  return PRODUCTS[productName] || PRODUCTS[DEFAULT_PRODUCT]
}

export function getRouteToMarketPrice(routeToMarket) {
  return PRICING_TIERS[routeToMarket] || PRICING_TIERS['Direct to Retailer']
}

export function getProductPricing(product, clientData = {}) {
  const productDef = getProductDefinition(product?.productName)
  const routeToMarket = product?.routeToMarket || clientData?.routeToMarket || DEFAULT_ROUTE_TO_MARKET

  return {
    productDef,
    routeToMarket,
    huelUnitPrice: getRouteToMarketPrice(routeToMarket),
  }
}

export function getPrimaryRouteToMarket(clientData = {}) {
  const routes = Array.from(
    new Set(
      getProductsList(clientData)
        .map((product) => product?.routeToMarket || clientData?.routeToMarket || DEFAULT_ROUTE_TO_MARKET)
        .filter(Boolean),
    ),
  )

  if (routes.length === 0) {
    return DEFAULT_ROUTE_TO_MARKET
  }

  return routes.length === 1 ? routes[0] : 'Mixed'
}

export function calculateROI(clientData = {}) {
  const productsList = getProductsList(clientData)
  const legacyRtm = clientData.routeToMarket || DEFAULT_ROUTE_TO_MARKET

  const rebatePct = Number(clientData.rebate) / 100 || 0
  const isRevenueShare =
    clientData.clientType === 'Vending' &&
    clientData.dealType === 'revenue_share'

  const revenueSharePct = Number(clientData.revenueSharePct) / 100 || 0
  const revenueShareMinMonthly = Number(clientData.revenueShareMin) || 0
  const revenueShareMin = revenueShareMinMonthly * 12

  let totalYear1GrossRevenue = 0
  let totalYear1GrossProfit = 0
  let totalTradeExpenses = 0
  let totalMachineCost = 0

  let totalRetailerYear1Revenue = 0
  let totalRetailerCost = 0
  let totalPartnerPayout = 0
  let totalAnnualUnitsAcrossProducts = 0

  const tradeBreakdown = {
    slottingFixed: 0,
    freeFill: 0,
    tprs: 0,
    marketing: 0,
    machineCost: 0,
    partnerPayout: 0,
    rebate: 0,
    total: 0,
  }

  productsList.forEach((product, index) => {
    const productDef = getProductDefinition(product?.productName)
    const { huelUnitPrice } = getProductPricing(
      { ...product, routeToMarket: product?.routeToMarket || legacyRtm },
      clientData,
    )

    const stores = Number(product?.numStores) || 0
    const velocity = Number(product?.baseVelocity) || 0
    const priceSrp = Number(product?.srp) || productDef.defaultSrp
    const totalAnnualUnits = stores * velocity * 52

    totalAnnualUnitsAcrossProducts += totalAnnualUnits

    let year1GrossRevenue
    let year1GrossProfit

    if (isRevenueShare) {
      const retailerGrossSales = totalAnnualUnits * priceSrp
      const totalCogs = totalAnnualUnits * productDef.cogs

      year1GrossRevenue = retailerGrossSales
      year1GrossProfit = retailerGrossSales - totalCogs
    } else {
      const weeklyRevenue = stores * velocity * huelUnitPrice
      const marginPercent = (huelUnitPrice - productDef.cogs) / huelUnitPrice

      year1GrossRevenue = weeklyRevenue * 52
      year1GrossProfit = year1GrossRevenue * marginPercent
    }

    const machineCostPerUnit = Number(clientData.machineCostPerUnit || 0)
    const machineCount = Number(clientData.numMachines) || 0
    const machineCost = index === 0 ? machineCostPerUnit * machineCount : 0

    let partnerPayout = 0
    if (isRevenueShare && index === 0) {
      const retailSales = totalAnnualUnits * priceSrp
      const splitAmount = retailSales * revenueSharePct
      partnerPayout = Math.max(revenueShareMin, splitAmount)
    }

    const slottingFixed = Number(product?.slottingFixed) || 0
    const freeFillValue = (Number(product?.slottingFreeFillQty) || 0) * huelUnitPrice
    const tprs = Number(product?.tprs) || 0
    const marketing = Number(product?.marketing) || 0

    const tradeExpenses =
      slottingFixed +
      freeFillValue +
      tprs +
      marketing +
      machineCost +
      partnerPayout

    tradeBreakdown.slottingFixed += slottingFixed
    tradeBreakdown.freeFill += freeFillValue
    tradeBreakdown.tprs += tprs
    tradeBreakdown.marketing += marketing
    tradeBreakdown.machineCost += machineCost
    tradeBreakdown.partnerPayout += partnerPayout

    totalYear1GrossRevenue += year1GrossRevenue
    totalYear1GrossProfit += year1GrossProfit
    totalTradeExpenses += tradeExpenses
    totalMachineCost += machineCost
    totalPartnerPayout += partnerPayout

    const retailerYear1Revenue = totalAnnualUnits * priceSrp
    const retailerCost = isRevenueShare
      ? year1GrossRevenue
      : stores * velocity * huelUnitPrice * 52

    totalRetailerYear1Revenue += retailerYear1Revenue
    totalRetailerCost += retailerCost
  })

  const totalRebate = totalYear1GrossRevenue * rebatePct
  totalTradeExpenses += totalRebate
  tradeBreakdown.rebate = totalRebate
  tradeBreakdown.total = totalTradeExpenses

  const totalYear1Ebitda = totalYear1GrossProfit - totalTradeExpenses
  const ebitdaMarginPercent = totalYear1GrossRevenue > 0
    ? totalYear1Ebitda / totalYear1GrossRevenue
    : 0
  const productMarginPercent = totalYear1GrossRevenue > 0
    ? totalYear1GrossProfit / totalYear1GrossRevenue
    : 0

  const monthlyGrossProfit = totalYear1GrossProfit / 12
  const breakevenMonths = monthlyGrossProfit > 0
    ? totalTradeExpenses / monthlyGrossProfit
    : 0

  const tradeRatePercent = totalYear1GrossRevenue > 0
    ? totalTradeExpenses / totalYear1GrossRevenue
    : 0

  const retailerGrossProfit = totalRetailerYear1Revenue - totalRetailerCost
  const retailerMarginPercent = totalRetailerYear1Revenue > 0
    ? retailerGrossProfit / totalRetailerYear1Revenue
    : 0

  return {
    huel: {
      year1GrossRevenue: totalYear1GrossRevenue,
      productMarginPercent,
      year1GrossProfit: totalYear1GrossProfit,
      totalTradeExpenses,
      totalMachineCost,
      totalPartnerPayout,
      totalRebate,
      rebatePct,
      numMachines: Number(clientData.numMachines) || 0,
      annualUnits: totalAnnualUnitsAcrossProducts,
      year1Ebitda: totalYear1Ebitda,
      ebitdaMarginPercent,
      breakevenMonths,
      tradeRatePercent,
      isRevenueShare,
      revenueSharePct,
      revenueShareMinMonthly,
      revenueShareMin,
      tradeBreakdown,
    },
    retailer: {
      year1Revenue: totalRetailerYear1Revenue,
      cost: totalRetailerCost,
      grossProfit: retailerGrossProfit,
      marginPercent: retailerMarginPercent,
    },
  }
}

export function calculateTradeBreakdown(clientData = {}) {
  return calculateROI(clientData).huel.tradeBreakdown
}
