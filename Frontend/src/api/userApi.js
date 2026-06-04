import api from './api'

export const getUsers = async () => {
  const response = await api.get('/users')
  return response.data
}

export const createUser = async (payload) => {
  const response = await api.post('/users/register', payload)
  return response.data
}

export const updateUser = async (id, payload) => {
  const response = await api.put(`/users/${id}`, payload)
  return response.data
}

export const resetUserPin = async (id) => {
  const response = await api.put(`/users/${id}/reset-pin`)
  return response.data
}

export const deleteUser = async (id, type = 'soft') => {
  const response = await api.delete(`/users/${id}`, {
    params: {
      type,
    },
  })

  return response.data
}

export const getMyProfile = async () => {
  const response = await api.get('/users/me')
  return response.data
}

export const updateMyProfile = async (payload) => {
  const response = await api.put('/users/me', payload)
  return response.data
}

export const changeMyPin = async (payload) => {
  const response = await api.put('/users/me/change-pin', payload)
  return response.data
}

export const uploadMyProfilePhoto = async (fotoBase64) => {
  const response = await api.post('/users/me/photo', {
    foto_base64: fotoBase64,
  })

  return response.data
}
