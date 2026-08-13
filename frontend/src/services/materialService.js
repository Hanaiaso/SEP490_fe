import { authFetch } from './httpClient';

async function request(method, url, body) {
  const headers = {}

  const isFormData = body instanceof FormData;
  if (!isFormData && body) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await authFetch(url, {
    method,
    headers,
    body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
  })
  const json = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(json.message || `Lỗi ${res.status}`)
  }

  return json
}

export async function getMaterials({ search } = {}) {
  const params = new URLSearchParams()
  if (search) params.set('search', search)
  return request('GET', `/materials?${params.toString()}`)
}

export async function createMaterial(data) {
  return request('POST', '/materials', data)
}

export async function updateMaterial(id, data) {
  return request('PUT', `/materials/${id}`, data)
}

export async function deleteMaterial(id) {
  return request('DELETE', `/materials/${id}`)
}
