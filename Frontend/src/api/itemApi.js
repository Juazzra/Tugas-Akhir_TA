import api from './api'

export const getItems = async ({ search = '', page = 1, limit = 10 } = {}) => {
  const response = await api.get('/items', {
    params: {
      search,
      page,
      limit,
    },
  })

  return response.data
}

export const getItemById = async (id) => {
  const response = await api.get(`/items/${id}`)
  return response.data
}

export const createItem = async (payload) => {
  const response = await api.post('/items', payload)
  return response.data
}

export const updateItem = async (id, payload) => {
  const response = await api.put(`/items/${id}`, payload)
  return response.data
}

export const deleteItem = async (id) => {
  const response = await api.delete(`/items/${id}`)
  return response.data
}

export const getInventoryLogs = async ({ page = 1, limit = 10 } = {}) => {
  const response = await api.get('/items/logs', {
    params: {
      page,
      limit,
    },
  })

  return response.data
}

export const getRestockQueue = async () => {
  const response = await api.get('/items/restock/queue')
  return response.data
}

export const approveRestock = async (itemsToApprove) => {
  const response = await api.post('/items/restock/approve', {
    items_to_approve: itemsToApprove,
  })

  return response.data
}

export const rejectRestock = async (barcode) => {
  const response = await api.post('/items/restock/reject', {
    barcode,
  })

  return response.data
}
