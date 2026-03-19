const WRITE_TOKEN_STORAGE_KEY = 'huelWriteToken'

function getStoredWriteToken() {
  if (typeof window === 'undefined') {
    return ''
  }

  return window.sessionStorage.getItem(WRITE_TOKEN_STORAGE_KEY) || ''
}

async function request(path, { method = 'GET', body } = {}) {
  const writeToken = getStoredWriteToken()
  const response = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(writeToken ? { 'x-app-write-token': writeToken } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(payload?.error || `Request failed with status ${response.status}`)
    error.status = response.status
    error.code = payload?.code || ''
    throw error
  }

  return payload
}

export function getWriteToken() {
  return getStoredWriteToken()
}

export function setWriteToken(token) {
  if (typeof window === 'undefined') {
    return
  }

  const nextToken = String(token || '').trim()

  if (!nextToken) {
    window.sessionStorage.removeItem(WRITE_TOKEN_STORAGE_KEY)
    return
  }

  window.sessionStorage.setItem(WRITE_TOKEN_STORAGE_KEY, nextToken)
}

export function fetchBootstrap() {
  return request('/api/bootstrap')
}

export function fetchStatus() {
  return request('/api/status')
}

export function createClient(client) {
  return request('/api/clients', {
    method: 'POST',
    body: client,
  })
}

export function updateClient(clientId, client) {
  return request(`/api/clients/${clientId}`, {
    method: 'PUT',
    body: client,
  })
}

export function deleteClient(clientId) {
  return request(`/api/clients/${clientId}`, {
    method: 'DELETE',
  })
}

export function savePlacements(rows) {
  return request('/api/placements', {
    method: 'PUT',
    body: { rows },
  })
}

export function saveProductCatalog(products) {
  return request('/api/catalog', {
    method: 'PUT',
    body: { products },
  })
}

export function createSignal(signal) {
  return request('/api/signals', {
    method: 'POST',
    body: signal,
  })
}

export function updateSignal(signalId, signal) {
  return request(`/api/signals/${signalId}`, {
    method: 'PUT',
    body: signal,
  })
}

export function createTask(task) {
  return request('/api/tasks', {
    method: 'POST',
    body: task,
  })
}

export function updateTask(taskId, task) {
  return request(`/api/tasks/${taskId}`, {
    method: 'PUT',
    body: task,
  })
}
