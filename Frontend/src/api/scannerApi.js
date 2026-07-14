import api from './api'

export const getScannerStatus = async () => {
  const response = await api.get('/scanner/status')
  return response.data
}
