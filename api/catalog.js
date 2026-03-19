import { replaceProductCatalog } from './_lib/airtable.js'
import { allowMethods, requireWriteAccess, sendError, sendJson } from './_lib/http.js'
import { validateProductCatalogPayload } from './_lib/validation.js'

export default async function handler(request, response) {
  if (!allowMethods(request, response, ['PUT'])) {
    return
  }

  if (!requireWriteAccess(request, response)) {
    return
  }

  try {
    const products = await replaceProductCatalog(validateProductCatalogPayload(request.body?.products || []))
    sendJson(response, 200, { products })
  } catch (error) {
    sendError(response, error, 'Unable to update Airtable product catalogue.')
  }
}
