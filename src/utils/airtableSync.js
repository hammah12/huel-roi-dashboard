/**
 * Airtable sync utility for Huel ROI Dashboard
 *
 * Airtable base schema (set this up once in your Airtable account):
 *
 * TABLE: "Retailers"
 *   - Name              (Single line text — primary field)
 *   - Client Type       (Single select: Vending | Airport Concessions | Food Service)
 *   - Route to Market   (Single select: DSD | Distributor | Direct to Retailer | Wholesale)
 *   - Synced At         (Date — auto-set on write)
 *
 * TABLE: "Products"
 *   - Retailer              (Link to Retailers)
 *   - Product Name          (Single select: Huel BE RTD | Huel DG RTD)
 *   - Num Stores            (Number)
 *   - Base Velocity         (Number, allow decimals)
 *   - SRP                   (Currency)
 *   - Slotting Fixed        (Currency)
 *   - Slotting Free Fill Qty (Number)
 *   - TPRs                  (Currency)
 *   - Marketing             (Currency)
 *
 * TABLE: "Pricing Config"
 *   - Config Key   (Single line text — primary field, e.g. "DSD", "Huel BE RTD")
 *   - Type         (Single select: RTM Price | Product COGS | Product Default SRP)
 *   - Value        (Number)
 *
 * Seed "Pricing Config" with:
 *   DSD                → RTM Price      → 2.39
 *   Distributor        → RTM Price      → 2.52
 *   Direct to Retailer → RTM Price      → 2.85
 *   Wholesale          → RTM Price      → 3.00
 *   Huel BE RTD        → Product COGS   → 1.42
 *   Huel BE RTD        → Product Default SRP → 4.99
 *   Huel DG RTD        → Product COGS   → 0.77
 *   Huel DG RTD        → Product Default SRP → 3.49
 */

const AIRTABLE_API = 'https://api.airtable.com/v0';

// ── Config helpers ────────────────────────────────────────────────
export const getConfig = () => {
    const token  = localStorage.getItem('airtableToken');
    const baseId = localStorage.getItem('airtableBaseId');
    return token && baseId ? { token, baseId } : null;
};

export const setConfig = ({ token, baseId }) => {
    if (token)  localStorage.setItem('airtableToken', token);
    else        localStorage.removeItem('airtableToken');
    if (baseId) localStorage.setItem('airtableBaseId', baseId);
    else        localStorage.removeItem('airtableBaseId');
};

const authHeaders = (token) => ({
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
});

// ── Test connection ───────────────────────────────────────────────
export const testConnection = async () => {
    const config = getConfig();
    if (!config) return { success: false, error: 'No credentials saved.' };

    try {
        const res = await fetch(
            `${AIRTABLE_API}/${config.baseId}/Pricing%20Config?maxRecords=1`,
            { headers: authHeaders(config.token) }
        );

        if (res.status === 401) return { success: false, error: 'Invalid Personal Access Token.' };
        if (res.status === 404) return { success: false, error: 'Base ID not found — double-check your base URL.' };
        if (!res.ok)            return { success: false, error: `Unexpected error: ${res.status}` };

        return { success: true };
    } catch (err) {
        return { success: false, error: `Network error: ${err.message}` };
    }
};

// ── Fetch dynamic pricing from "Pricing Config" table ────────────
export const fetchPricingData = async () => {
    const config = getConfig();
    if (!config) return null;

    try {
        const res = await fetch(
            `${AIRTABLE_API}/${config.baseId}/Pricing%20Config`,
            { headers: authHeaders(config.token) }
        );
        if (!res.ok) throw new Error(`Status ${res.status}`);
        const data = await res.json();

        const pricingTiers = {};
        const products = {};

        (data.records || []).forEach(r => {
            const f = r.fields;
            const key = f['Config Key'];
            const val = Number(f['Value']);

            if (f['Type'] === 'RTM Price') {
                pricingTiers[key] = val;
            } else if (f['Type'] === 'Product COGS') {
                if (!products[key]) products[key] = {};
                products[key].cogs = val;
            } else if (f['Type'] === 'Product Default SRP') {
                if (!products[key]) products[key] = {};
                products[key].defaultSrp = val;
            }
        });

        return { pricingTiers, products };
    } catch (err) {
        console.error('Airtable fetchPricingData error:', err);
        return null;
    }
};

// ── Sync a retailer profile to Airtable ─────────────────────────
// Creates Retailer + linked Product records.
// Note: duplicate records are not checked — this is an append-only sync.
// For a full upsert, a more complex lookup flow would be needed.
export const syncClientToAirtable = async (clientData) => {
    const config = getConfig();
    if (!config) return { success: false, error: 'No Airtable credentials configured.' };

    try {
        // 1. Create Retailer record
        const retailerRes = await fetch(
            `${AIRTABLE_API}/${config.baseId}/Retailers`,
            {
                method: 'POST',
                headers: authHeaders(config.token),
                body: JSON.stringify({
                    fields: {
                        'Name':             clientData.retailerName,
                        'Client Type':      clientData.clientType || 'Vending',
                        'Route to Market':  clientData.routeToMarket,
                        'Synced At':        new Date().toISOString().split('T')[0],
                    },
                }),
            }
        );

        if (!retailerRes.ok) {
            const err = await retailerRes.json();
            throw new Error(err?.error?.message || `Retailer write failed (${retailerRes.status})`);
        }

        const retailer = await retailerRes.json();
        const retailerId = retailer.id;

        // 2. Create a Product record for each product, linked to the Retailer
        const products = clientData.products || [clientData];
        for (const prod of products) {
            const prodRes = await fetch(
                `${AIRTABLE_API}/${config.baseId}/Products`,
                {
                    method: 'POST',
                    headers: authHeaders(config.token),
                    body: JSON.stringify({
                        fields: {
                            'Retailer':               [retailerId],
                            'Product Name':           prod.productName,
                            'Num Stores':             Number(prod.numStores) || 0,
                            'Base Velocity':          Number(prod.baseVelocity) || 0,
                            'SRP':                    Number(prod.srp) || 0,
                            'Slotting Fixed':         Number(prod.slottingFixed) || 0,
                            'Slotting Free Fill Qty': Number(prod.slottingFreeFillQty) || 0,
                            'TPRs':                   Number(prod.tprs) || 0,
                            'Marketing':              Number(prod.marketing) || 0,
                        },
                    }),
                }
            );

            if (!prodRes.ok) {
                const err = await prodRes.json();
                console.warn('Product write warning:', err?.error?.message);
            }
        }

        return { success: true };
    } catch (err) {
        console.error('Airtable syncClient error:', err);
        return { success: false, error: err.message };
    }
};
