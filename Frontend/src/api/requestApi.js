import api from './api'

export const getRequests = async () => {
  const response = await api.get('/requests')
  return response.data
}

export const getRequestDetails = async (id) => {
  const response = await api.get(`/requests/${id}/details`)
  return response.data
}

export const updateRequestStatus = async (id, status) => {
  const response = await api.put(`/requests/${id}/status`, {
    status,
  })

  return response.data
}

export const startRequestProcess = async (id) => {
  const response = await api.put(`/requests/${id}/start-process`)
  return response.data
}

export const completeRequestHandover = async (id, pengambilan_oleh = 'ambil_sendiri') => {
  const response = await api.post(`/requests/${id}/complete`, {
    pengambilan_oleh,
  })

  return response.data
}

export const verifyScanItem = async (barcode) => {
  const response = await api.put('/requests/scan-verify', {
    barcode,
  })

  return response.data
}

export const createRequest = async (payload) => {
  const response = await api.post('/requests', payload)
  return response.data
}

export const getMyRequests = async () => {
  const response = await api.get('/requests/me')
  return response.data
}
