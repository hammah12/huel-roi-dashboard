import { updateDynamicPricing } from './calculations'

export const PRODUCT_STORAGE_KEY = 'huelProducts'

export const DEFAULT_PRODUCTS = [
  { name: 'Huel BE RTD', cogs: 1.42, defaultSrp: 4.99 },
  { name: 'Huel DG RTD', cogs: 0.77, defaultSrp: 3.49 },
]

export function loadProducts() {
  try {
    const saved = localStorage.getItem(PRODUCT_STORAGE_KEY)
    return saved ? JSON.parse(saved) : DEFAULT_PRODUCTS
  } catch {
    return DEFAULT_PRODUCTS
  }
}

export function toProductMap(products = []) {
  return products.reduce((accumulator, product) => {
    if (!product?.name?.trim()) {
      return accumulator
    }

    accumulator[product.name] = {
      cogs: Number(product.cogs),
      defaultSrp: Number(product.defaultSrp),
    }

    return accumulator
  }, {})
}

export function saveProducts(products) {
  localStorage.setItem(PRODUCT_STORAGE_KEY, JSON.stringify(products))
  updateDynamicPricing({}, toProductMap(products))
}

export function mergeRemoteProducts(currentProducts = [], remoteProducts = {}) {
  const nextProducts = new Map(currentProducts.map((product) => [product.name, { ...product }]))

  Object.entries(remoteProducts).forEach(([name, values]) => {
    nextProducts.set(name, {
      name,
      cogs: values.cogs,
      defaultSrp: values.defaultSrp,
    })
  })

  return Array.from(nextProducts.values())
}
