import { replacePlacements } from './_lib/airtable.js'
import { allowMethods, requireWriteAccess, sendError, sendJson } from './_lib/http.js'
import { validatePlacementsPayload } from './_lib/validation.js'

export default async function handler(request, response) {
  if (!allowMethods(request, response, ['PUT'])) {
    return
  }

  if (!requireWriteAccess(request, response)) {
    return
  }

  try {
    const placements = await replacePlacements(validatePlacementsPayload(request.body?.rows || []))
    sendJson(response, 200, { rows: placements })
  } catch (error) {
    sendError(response, error, 'Unable to update Airtable placements.')
  }
}
