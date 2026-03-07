// ── Huel Airport Pipeline Import ─────────────────────────────────────────
// Paste this into your browser console on the live Vercel app.
// Imports all 15 pipeline accounts into:
//   1. Retailer cards (huelClients)
//   2. Placements Forecast (placementsForecast)
//
// Closed/Immediate → Q1 · Hot Pipeline → Q2 · High Interest → Q3
// Duplicate account names are skipped automatically.

const makeClient = (name, status, estRevYr) => {
  const velocity = Math.round(estRevYr / 52 / 3.49);
  return {
    retailerName: name,
    clientType: 'Airport Concessions',
    pipelineStatus: status,
    rebate: '',
    dealType: 'revenue_share',
    numMachines: '1',
    machineCostPerUnit: '',
    revenueSharePct: '',
    revenueShareMin: '',
    products: [{
      productName: 'Huel DG RTD',
      routeToMarket: 'DSD',
      numStores: '1',
      baseVelocity: String(velocity),
      srp: '3.49',
      slottingFixed: '',
      slottingFreeFillQty: '',
      tprs: '',
      marketing: '',
    }]
  };
};

const makeRow = (name, type, status) => {
  const qMap = { 'Closed': 'Q1', 'Hot Pipeline': 'Q2', 'High Interest': 'Q3' };
  const q = qMap[status] || 'Q4';
  return { id: `import-${name}`, partner: name, type, Q1: 0, Q2: 0, Q3: 0, Q4: 0, [q]: 1 };
};

const pipeline = [
  // Closed / Immediate
  { name: 'LAX',            status: 'Closed',        type: 'Airport Concessions', rev: 50000 },
  { name: 'New Orleans',    status: 'Closed',        type: 'Airport Concessions', rev: 28000 },
  { name: 'Richmond',       status: 'Closed',        type: 'Airport Concessions', rev: 28000 },
  { name: 'Austin',         status: 'Closed',        type: 'Airport Concessions', rev: 28000 },
  { name: 'San Antonio',    status: 'Closed',        type: 'Airport Concessions', rev: 28000 },
  // Hot Pipeline
  { name: 'Pittsburgh',     status: 'Hot Pipeline',  type: 'Airport Concessions', rev: 28000 },
  { name: 'CVG',            status: 'Hot Pipeline',  type: 'Airport Concessions', rev: 28000 },
  { name: 'Las Vegas',      status: 'Hot Pipeline',  type: 'Airport Concessions', rev: 50000 },
  { name: 'Tulsa',          status: 'Hot Pipeline',  type: 'Airport Concessions', rev: 28000 },
  // High Interest
  { name: 'San Diego',      status: 'High Interest', type: 'Airport Concessions', rev: 50000 },
  { name: 'SFO',            status: 'High Interest', type: 'Airport Concessions', rev: 50000 },
  { name: 'Memphis',        status: 'High Interest', type: 'Airport Concessions', rev: 28000 },
  { name: 'Dulles & Reagan',status: 'High Interest', type: 'Airport Concessions', rev: 50000 },
  { name: 'Oxnard',         status: 'High Interest', type: 'Airport Concessions', rev: 28000 },
  { name: 'MSP',            status: 'High Interest', type: 'Airport Concessions', rev: 28000 },
];

// ── 1. Import retailer clients ───────────────────────────────────────────
const existingClients = JSON.parse(localStorage.getItem('huelClients') || '[]');
const existingNames = new Set(existingClients.map(c => c.retailerName.toLowerCase()));
const newClients = pipeline
  .filter(p => !existingNames.has(p.name.toLowerCase()))
  .map(p => makeClient(p.name, p.status, p.rev));

localStorage.setItem('huelClients', JSON.stringify([...existingClients, ...newClients]));
console.log(`✅ Clients: added ${newClients.length}, skipped ${pipeline.length - newClients.length} duplicates`);

// ── 2. Import placements forecast rows ───────────────────────────────────
const existingForecast = JSON.parse(localStorage.getItem('placementsForecast') || '[]');
const existingPartners = new Set(existingForecast.map(r => r.partner.toLowerCase()));
const newRows = pipeline
  .filter(p => !existingPartners.has(p.name.toLowerCase()))
  .map(p => makeRow(p.name, p.type, p.status));

localStorage.setItem('placementsForecast', JSON.stringify([...existingForecast, ...newRows]));
console.log(`✅ Forecast: added ${newRows.length} rows`);

location.reload();
