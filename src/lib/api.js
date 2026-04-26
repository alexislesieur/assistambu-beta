const API_URL = import.meta.env.VITE_API_URL || 'https://api.assist-ambu.fr/api'

const request = async (method, endpoint, data = null) => {
  const token = localStorage.getItem('token')
  const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const options = { method, headers }
  if (data) options.body = JSON.stringify(data)
  const response = await fetch(`${API_URL}${endpoint}`, options)
  const json = await response.json()
  if (!response.ok) throw { status: response.status, errors: json }
  return json
}

export const api = {
  get:    (endpoint)       => request('GET',    endpoint),
  post:   (endpoint, data) => request('POST',   endpoint, data),
  put:    (endpoint, data) => request('PUT',    endpoint, data),
  delete: (endpoint)       => request('DELETE', endpoint),
}

export const authApi = {
  me:     () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
}

export const shiftsApi = {
  index:  ()         => api.get('/shifts'),
  store:  (data)     => api.post('/shifts', data),
  end:    (id, data) => api.post(`/shifts/${id}/end`, data),
}

export const interventionsApi = {
  index:   ()      => api.get('/interventions'),
  store:   (data)  => api.post('/interventions', data),
  byShift: (id)    => api.get(`/shifts/${id}/interventions`),
}

export const itemsApi = {
  index:  () => api.get('/items'),
  alerts: () => api.get('/items/alerts'),
}

export const hospitalsApi = {
  index: () => api.get('/hospitals'),
}