<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  Loader2,
  PackageCheck,
  RefreshCcw,
  ScanBarcode,
  Search,
  XCircle,
} from 'lucide-vue-next'
import {
  completeRequestHandover,
  getRequestDetails,
  getRequests,
  startRequestProcess,
  updateRequestStatus,
  verifyScanItem,
} from '../../api/requestApi'

const requests = ref([])
const selectedRequest = ref(null)
const requestDetails = ref([])
const loading = ref(false)
const detailLoading = ref(false)
const actionLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const search = ref('')
const statusFilter = ref('all')
const scanBarcode = ref('')
let autoRefreshTimer = null
const countdown = ref(10)
let countdownTimer = null

const statusOptions = [
  { label: 'Semua', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Approved', value: 'approved' },
  { label: 'Processing', value: 'processing' },
  { label: 'Completed', value: 'completed' },
  { label: 'Rejected', value: 'rejected' },
]

const statusLabel = {
  pending: 'Pending Approval',
  approved: 'Waiting Pickup',
  rejected: 'Rejected',
  processing: 'Serah Terima',
  completed: 'Completed',
}

const statusClass = {
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
  processing: 'processing',
  completed: 'completed',
}

const filteredRequests = computed(() => {
  const keyword = search.value.toLowerCase().trim()

  return requests.value.filter((request) => {
    const matchStatus = statusFilter.value === 'all' || request.status === statusFilter.value

    const matchSearch =
      !keyword ||
      request.nama_karyawan?.toLowerCase().includes(keyword) ||
      request.nik?.toLowerCase().includes(keyword) ||
      request.id?.toLowerCase().includes(keyword)

    return matchStatus && matchSearch
  })
})

const summary = computed(() => {
  return {
    total: requests.value.length,
    pending: requests.value.filter((item) => item.status === 'pending').length,
    approved: requests.value.filter((item) => item.status === 'approved').length,
    processing: requests.value.filter((item) => item.status === 'processing').length,
  }
})

const scannedCount = computed(() => {
  return requestDetails.value.filter((item) => item.is_scanned).length
})

const clearMessage = () => {
  errorMessage.value = ''
  successMessage.value = ''
}

const formatDate = (value) => {
  if (!value) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

const fetchRequests = async (isSilent = false) => {
  if (!isSilent) loading.value = true
  clearMessage()

  try {
    requests.value = await getRequests()

    if (selectedRequest.value) {
      const updatedSelected = requests.value.find((item) => item.id === selectedRequest.value.id)
      selectedRequest.value = updatedSelected || null

      if (selectedRequest.value) {
        await fetchDetails(selectedRequest.value, isSilent)
      } else {
        requestDetails.value = []
      }
    }
  } catch (error) {
    errorMessage.value =
      error.response?.data?.message ||
      error.response?.data?.error ||
      'Gagal mengambil data request.'
  } finally {
    loading.value = false
  }
}

const fetchDetails = async (request, isSilent = false) => {
  selectedRequest.value = request
  if (!isSilent) detailLoading.value = true
  clearMessage()

  try {
    requestDetails.value = await getRequestDetails(request.id)
  } catch (error) {
    errorMessage.value =
      error.response?.data?.message ||
      error.response?.data?.error ||
      'Gagal mengambil detail request.'
  } finally {
    detailLoading.value = false
  }
}

const handleStatusUpdate = async (status) => {
  if (!selectedRequest.value) return

  const confirmed = confirm(`Ubah status request menjadi "${statusLabel[status] || status}"?`)
  if (!confirmed) return

  actionLoading.value = true
  clearMessage()

  try {
    await updateRequestStatus(selectedRequest.value.id, status)
    successMessage.value = `Status berhasil diubah menjadi ${statusLabel[status] || status}.`
    await fetchRequests()
  } catch (error) {
    errorMessage.value =
      error.response?.data?.message ||
      error.response?.data?.error ||
      'Gagal mengubah status request.'
  } finally {
    actionLoading.value = false
  }
}

const handleStartProcess = async () => {
  if (!selectedRequest.value) return

  actionLoading.value = true
  clearMessage()

  try {
    await startRequestProcess(selectedRequest.value.id)
    successMessage.value = 'Sesi serah terima dimulai. Scanner siap melakukan validasi.'
    await fetchRequests()
  } catch (error) {
    errorMessage.value =
      error.response?.data?.message ||
      error.response?.data?.error ||
      'Gagal memulai sesi serah terima.'
  } finally {
    actionLoading.value = false
  }
}

const handleVerifyScan = async () => {
  if (!scanBarcode.value.trim()) {
    errorMessage.value = 'Masukkan barcode terlebih dahulu.'
    return
  }

  actionLoading.value = true
  clearMessage()

  try {
    const response = await verifyScanItem(scanBarcode.value.trim())
    successMessage.value = response.message || 'Barcode berhasil diverifikasi.'
    scanBarcode.value = ''

    if (selectedRequest.value) {
      await fetchDetails(selectedRequest.value)
    }
  } catch (error) {
    errorMessage.value =
      error.response?.data?.message ||
      error.response?.data?.error ||
      'Barcode tidak valid untuk request ini.'
  } finally {
    actionLoading.value = false
  }
}

const handleManualVerify = async (barcode) => {
  actionLoading.value = true
  clearMessage()

  try {
    const response = await verifyScanItem(barcode)
    successMessage.value = response.message || 'Barang berhasil diverifikasi secara manual.'
    
    if (selectedRequest.value) {
      await fetchDetails(selectedRequest.value)
    }
  } catch (error) {
    errorMessage.value =
      error.response?.data?.message ||
      error.response?.data?.error ||
      'Gagal verifikasi manual.'
  } finally {
    actionLoading.value = false
  }
}

const handleComplete = async () => {
  if (!selectedRequest.value) return

  const confirmed = confirm('Selesaikan serah terima dan potong stok gudang?')
  if (!confirmed) return

  actionLoading.value = true
  clearMessage()

  try {
    await completeRequestHandover(selectedRequest.value.id)
    successMessage.value = 'Transaksi selesai. Stok gudang berhasil dipotong.'
    await fetchRequests()
  } catch (error) {
    errorMessage.value =
      error.response?.data?.message ||
      error.response?.data?.error ||
      'Gagal menyelesaikan transaksi.'
  } finally {
    actionLoading.value = false
  }
}

const startCountdown = () => {
  countdown.value = 10
  if (countdownTimer) clearInterval(countdownTimer)
  countdownTimer = setInterval(async () => {
    countdown.value -= 1
    if (countdown.value <= 0) {
      countdown.value = 10
      await fetchRequests(true)
    }
  }, 1000)
}

const handleManualRefresh = async () => {
  countdown.value = 10
  await fetchRequests(false)
}

onMounted(() => {
  fetchRequests()
  startCountdown()
})

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})
</script>

<template>
  <section class="requests-page">
    <div class="page-heading">
      <div>
        <p>Approval & Handover</p>
        <h1>Approval Request</h1>
        <span>Review request karyawan, approve/reject, lalu proses serah terima barang.</span>
      </div>

      <div class="refresh-container">
        <span class="countdown-text">Auto refresh: {{ countdown }}s</span>
        <button class="primary-button" type="button" @click="handleManualRefresh">
          <RefreshCcw :size="18" />
          <span>Refresh</span>
        </button>
      </div>
    </div>

    <div class="summary-grid">
      <article class="summary-card">
        <ClipboardCheck :size="24" />
        <div>
          <p>Total Request</p>
          <h2>{{ summary.total }}</h2>
        </div>
      </article>

      <article class="summary-card">
        <AlertCircle :size="24" />
        <div>
          <p>Pending</p>
          <h2>{{ summary.pending }}</h2>
        </div>
      </article>

      <article class="summary-card">
        <PackageCheck :size="24" />
        <div>
          <p>Waiting Pickup</p>
          <h2>{{ summary.approved }}</h2>
        </div>
      </article>

      <article class="summary-card">
        <ScanBarcode :size="24" />
        <div>
          <p>Processing</p>
          <h2>{{ summary.processing }}</h2>
        </div>
      </article>
    </div>

    <div v-if="errorMessage" class="alert error">{{ errorMessage }}</div>
    <div v-if="successMessage" class="alert success">{{ successMessage }}</div>

    <div class="main-grid">
      <article class="list-panel">
        <div class="toolbar">
          <div class="search-box">
            <Search :size="18" />
            <input
              v-model="search"
              type="text"
              placeholder="Cari nama, NIK, atau ID request..."
            />
          </div>

          <select v-model="statusFilter">
            <option v-for="option in statusOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>

        <div v-if="loading" class="loading-state">
          <Loader2 class="spin" :size="28" />
          <span>Memuat request...</span>
        </div>

        <div v-else class="request-list">
          <button
            v-for="request in filteredRequests"
            :key="request.id"
            :class="['request-card', selectedRequest?.id === request.id ? 'active' : '']"
            type="button"
            @click="fetchDetails(request)"
          >
            <div class="request-top">
              <div>
                <strong>{{ request.nama_karyawan }}</strong>
                <span>{{ request.nik }}</span>
              </div>

              <span :class="['status-pill', statusClass[request.status]]">
                {{ statusLabel[request.status] || request.status }}
              </span>
            </div>

            <div class="request-bottom">
              <small>ID: {{ request.id.slice(0, 8) }}</small>
              <small>Ambil: {{ formatDate(request.tgl_pengambilan) }}</small>
            </div>
          </button>

          <div v-if="filteredRequests.length === 0" class="empty-state">
            <ClipboardCheck :size="30" />
            <strong>Request tidak ditemukan</strong>
            <span>Coba ubah filter atau kata pencarian.</span>
          </div>
        </div>
      </article>

      <article class="detail-panel">
        <div v-if="!selectedRequest" class="empty-detail">
          <Eye :size="34" />
          <h2>Pilih request</h2>
          <p>Klik salah satu request di sisi kiri untuk melihat detail barang.</p>
        </div>

        <template v-else>
          <div class="detail-header">
            <div>
              <p>Detail Nota</p>
              <h2>{{ selectedRequest.nama_karyawan }}</h2>
              <span>{{ selectedRequest.nik }} • Ambil {{ formatDate(selectedRequest.tgl_pengambilan) }}</span>
            </div>

            <span :class="['status-pill large', statusClass[selectedRequest.status]]">
              {{ statusLabel[selectedRequest.status] || selectedRequest.status }}
            </span>
          </div>

          <div class="action-bar">
            <button
              v-if="selectedRequest.status === 'pending'"
              class="success-button"
              type="button"
              :disabled="actionLoading"
              @click="handleStatusUpdate('approved')"
            >
              <CheckCircle2 :size="18" />
              Approve
            </button>

            <button
              v-if="selectedRequest.status === 'pending'"
              class="danger-button"
              type="button"
              :disabled="actionLoading"
              @click="handleStatusUpdate('rejected')"
            >
              <XCircle :size="18" />
              Reject
            </button>

            <button
              v-if="selectedRequest.status === 'approved'"
              class="primary-button"
              type="button"
              :disabled="actionLoading"
              @click="handleStartProcess"
            >
              <ScanBarcode :size="18" />
              Mulai Serah Terima
            </button>

            <button
              v-if="selectedRequest.status === 'processing'"
              class="secondary-button"
              type="button"
              :disabled="actionLoading"
              @click="handleStatusUpdate('pending')"
            >
              Batalkan Sesi
            </button>

            <button
              v-if="selectedRequest.status === 'processing'"
              class="success-button"
              type="button"
              :disabled="actionLoading || scannedCount !== requestDetails.length"
              @click="handleComplete"
            >
              <CheckCircle2 :size="18" />
              Selesaikan Transaksi
            </button>
          </div>

          <div v-if="selectedRequest.status === 'processing'" class="scanner-box">
            <div>
              <h3>Validasi Barcode</h3>
              <p>{{ scannedCount }} dari {{ requestDetails.length }} jenis barang sudah discan.</p>
            </div>

            <form class="scan-form" @submit.prevent="handleVerifyScan">
              <input
                v-model="scanBarcode"
                type="text"
                placeholder="Masukkan / scan barcode barang"
              />
              <button class="primary-button" type="submit" :disabled="actionLoading">
                Scan
              </button>
            </form>
          </div>

          <div v-if="detailLoading" class="loading-state">
            <Loader2 class="spin" :size="28" />
            <span>Memuat detail request...</span>
          </div>

          <div v-else class="detail-list">
            <div v-for="detail in requestDetails" :key="detail.id" class="detail-card">
              <div class="detail-info">
                <div :class="['scan-indicator', detail.is_scanned ? 'done' : '']">
                  <CheckCircle2 v-if="detail.is_scanned" :size="18" />
                  <ScanBarcode v-else :size="18" />
                </div>

                <div>
                  <strong>{{ detail.nama_barang }}</strong>
                  <span>Barcode: {{ detail.barcode }}</span>
                  <small>Alasan: {{ detail.alasan || '-' }}</small>
                </div>
              </div>

              <div class="detail-side">
                <b>{{ detail.jumlah }} pcs</b>
                <span v-if="detail.is_scanned" class="scanned-status">Scanned</span>
                <button
                  v-else-if="selectedRequest.status === 'processing'"
                  class="verify-manual-btn"
                  type="button"
                  :disabled="actionLoading"
                  @click="handleManualVerify(detail.barcode)"
                >
                  Verify Manual
                </button>
                <span v-else>Belum Scan</span>
              </div>

              <a
                v-if="detail.foto_bukti"
                class="proof-link"
                :href="detail.foto_bukti"
                target="_blank"
                rel="noopener noreferrer"
              >
                Lihat Foto Bukti
              </a>
            </div>

            <div v-if="requestDetails.length === 0" class="empty-state">
              <PackageCheck :size="30" />
              <strong>Detail barang kosong</strong>
              <span>Tidak ada item pada request ini.</span>
            </div>
          </div>
        </template>
      </article>
    </div>
  </section>
</template>

<style scoped>
.requests-page {
  display: grid;
  gap: 20px;
}

.page-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.page-heading p {
  margin: 0 0 6px;
  color: #2563eb;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.page-heading h1 {
  margin: 0;
  color: #111827;
  font-size: 32px;
  letter-spacing: -0.04em;
}

.page-heading span {
  display: block;
  margin-top: 6px;
  color: #6b7280;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
}

.summary-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #ffffff;
  color: #2563eb;
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.06);
}

.summary-card p {
  margin: 0 0 3px;
  color: #6b7280;
  font-size: 13px;
  font-weight: 800;
}

.summary-card h2 {
  margin: 0;
  color: #111827;
  font-size: 28px;
}

.primary-button,
.secondary-button,
.success-button,
.danger-button {
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 14px;
  border: 0;
  border-radius: 10px;
  font-weight: 900;
}

.primary-button {
  background: #2563eb;
  color: #ffffff;
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.18);
}

.secondary-button {
  background: #f3f4f6;
  color: #374151;
}

.success-button {
  background: #047857;
  color: #ffffff;
}

.danger-button {
  background: #dc2626;
  color: #ffffff;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.alert {
  padding: 13px 15px;
  border-radius: 12px;
  font-weight: 700;
  font-size: 14px;
}

.alert.error {
  background: #fef2f2;
  color: #b91c1c;
}

.alert.success {
  background: #ecfdf5;
  color: #047857;
}

.main-grid {
  display: grid;
  grid-template-columns: 430px 1fr;
  gap: 18px;
  align-items: start;
}

.list-panel,
.detail-panel {
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.06);
}

.list-panel {
  overflow: hidden;
}

.toolbar {
  display: grid;
  grid-template-columns: 1fr 140px;
  gap: 10px;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.search-box {
  height: 42px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 12px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  color: #6b7280;
}

.search-box input,
.toolbar select,
.scan-form input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: #111827;
}

.toolbar select {
  height: 42px;
  padding: 0 10px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  background: #ffffff;
}

.request-list {
  display: grid;
  gap: 10px;
  max-height: 690px;
  overflow-y: auto;
  padding: 14px;
}

.request-card {
  display: grid;
  gap: 14px;
  width: 100%;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #ffffff;
  text-align: left;
  transition: 0.2s ease;
}

.request-card:hover,
.request-card.active {
  border-color: #2563eb;
  box-shadow: 0 10px 24px rgba(37, 99, 235, 0.12);
}

.request-card.active {
  background: #eff6ff;
}

.request-top,
.request-bottom,
.detail-header,
.action-bar,
.scanner-box,
.detail-card,
.detail-info,
.detail-side {
  display: flex;
  align-items: center;
}

.request-top,
.request-bottom,
.detail-header,
.scanner-box,
.detail-card {
  justify-content: space-between;
  gap: 14px;
}

.request-top strong {
  display: block;
  color: #111827;
  font-size: 15px;
}

.request-top span:not(.status-pill),
.request-bottom small {
  display: block;
  margin-top: 4px;
  color: #6b7280;
  font-size: 12px;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  padding: 7px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 900;
}

.status-pill.large {
  font-size: 12px;
  padding: 9px 12px;
}

.status-pill.pending {
  background: #fffbeb;
  color: #d97706;
}

.status-pill.approved {
  background: #eff6ff;
  color: #2563eb;
}

.status-pill.processing {
  background: #f5f3ff;
  color: #7c3aed;
}

.status-pill.completed {
  background: #ecfdf5;
  color: #047857;
}

.status-pill.rejected {
  background: #fef2f2;
  color: #dc2626;
}

.detail-panel {
  min-height: 560px;
  padding: 20px;
}

.empty-detail,
.empty-state,
.loading-state {
  min-height: 260px;
  display: grid;
  place-items: center;
  gap: 8px;
  text-align: center;
  color: #6b7280;
}

.empty-detail h2,
.empty-state strong {
  margin: 0;
  color: #111827;
}

.empty-detail p,
.empty-state span {
  margin: 0;
  color: #6b7280;
}

.detail-header {
  padding-bottom: 18px;
  border-bottom: 1px solid #e5e7eb;
}

.detail-header p {
  margin: 0 0 4px;
  color: #2563eb;
  font-size: 12px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.detail-header h2 {
  margin: 0;
  color: #111827;
  font-size: 24px;
}

.detail-header span:not(.status-pill) {
  display: block;
  margin-top: 4px;
  color: #6b7280;
  font-size: 13px;
}

.action-bar {
  flex-wrap: wrap;
  gap: 10px;
  padding: 16px 0;
}

.scanner-box {
  margin-bottom: 16px;
  padding: 16px;
  border: 1px solid #bfdbfe;
  border-radius: 14px;
  background: #eff6ff;
}

.scanner-box h3 {
  margin: 0 0 4px;
  color: #111827;
}

.scanner-box p {
  margin: 0;
  color: #6b7280;
  font-size: 13px;
}

.scan-form {
  display: flex;
  gap: 10px;
  min-width: 320px;
}

.scan-form input {
  height: 42px;
  padding: 0 12px;
  border: 1px solid #93c5fd;
  border-radius: 10px;
  background: #ffffff;
}

.detail-list {
  display: grid;
  gap: 12px;
}

.detail-card {
  align-items: flex-start;
  flex-wrap: wrap;
  padding: 15px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #f9fafb;
}

.detail-info {
  gap: 12px;
}

.scan-indicator {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 10px;
  background: #f3f4f6;
  color: #6b7280;
}

.scan-indicator.done {
  background: #ecfdf5;
  color: #047857;
}

.detail-info strong {
  display: block;
  color: #111827;
  font-size: 15px;
}

.detail-info span,
.detail-info small {
  display: block;
  margin-top: 4px;
  color: #6b7280;
  font-size: 12px;
}

.detail-side {
  align-items: flex-end;
  flex-direction: column;
  gap: 4px;
  margin-left: auto;
}

.detail-side b {
  color: #111827;
}

.detail-side span {
  color: #6b7280;
  font-size: 12px;
  font-weight: 800;
}

.proof-link {
  width: 100%;
  color: #2563eb;
  font-size: 13px;
  font-weight: 800;
}

.spin {
  animation: spin 0.9s linear infinite;
}

.refresh-container {
  display: flex;
  align-items: center;
  gap: 12px;
}

.countdown-text {
  font-size: 13px;
  color: #6b7280;
  font-weight: 700;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1120px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .main-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .page-heading,
  .scanner-box,
  .scan-form {
    align-items: stretch;
    flex-direction: column;
  }

  .refresh-container {
    flex-direction: column;
    align-items: stretch;
    width: 100%;
    gap: 8px;
  }

  .countdown-text {
    text-align: center;
  }

  .summary-grid,
  .toolbar {
    grid-template-columns: 1fr;
  }

  .primary-button,
  .secondary-button,
  .success-button,
  .danger-button {
    width: 100%;
  }
}

.verify-manual-btn {
  height: 30px;
  padding: 0 10px;
  background: #ecfdf5;
  color: #047857;
  border: 1px solid #a7f3d0;
  border-radius: 8px;
  font-weight: 800;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.verify-manual-btn:hover:not(:disabled) {
  background: #047857;
  color: #ffffff;
  border-color: #047857;
}

.scanned-status {
  font-weight: 800;
  color: #047857;
}
</style>

