<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Eye,
  ImageIcon,
  Loader2,
  PackageCheck,
  RefreshCcw,
  Search,
  XCircle,
} from 'lucide-vue-next'
import { getMyRequests, getRequestDetails } from '../../api/requestApi'

const requests = ref([])
const selectedRequest = ref(null)
const requestDetails = ref([])
const loading = ref(false)
const detailLoading = ref(false)
const errorMessage = ref('')
const search = ref('')
const statusFilter = ref('all')
let autoRefreshTimer = null

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
  processing: 'Serah Terima',
  completed: 'Completed',
  rejected: 'Rejected',
}

const statusClass = {
  pending: 'pending',
  approved: 'approved',
  processing: 'processing',
  completed: 'completed',
  rejected: 'rejected',
}

const filteredRequests = computed(() => {
  const keyword = search.value.toLowerCase().trim()

  return requests.value.filter((request) => {
    const matchStatus = statusFilter.value === 'all' || request.status === statusFilter.value
    const matchSearch =
      !keyword ||
      request.id?.toLowerCase().includes(keyword) ||
      request.status?.toLowerCase().includes(keyword)

    return matchStatus && matchSearch
  })
})

const summary = computed(() => ({
  total: requests.value.length,
  pending: requests.value.filter((item) => item.status === 'pending').length,
  approved: requests.value.filter((item) => item.status === 'approved').length,
  completed: requests.value.filter((item) => item.status === 'completed').length,
}))

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
  errorMessage.value = ''

  try {
    requests.value = await getMyRequests()

    if (selectedRequest.value) {
      const updatedSelected = requests.value.find((item) => item.id === selectedRequest.value.id)
      selectedRequest.value = updatedSelected || null

      if (selectedRequest.value) {
        await fetchDetails(selectedRequest.value, isSilent)
      }
    }
  } catch (error) {
    errorMessage.value =
      error.response?.data?.message ||
      error.response?.data?.error ||
      'Gagal mengambil history request.'
  } finally {
    loading.value = false
  }
}

const fetchDetails = async (request, isSilent = false) => {
  selectedRequest.value = request
  if (!isSilent) detailLoading.value = true
  errorMessage.value = ''

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

const countdown = ref(10)
let countdownTimer = null

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
  <section class="my-requests-page">
    <div class="page-heading">
      <div>
        <p>Karyawan</p>
        <h1>Request Saya</h1>
        <span>Pantau status pengajuan barang yang sudah kamu kirim.</span>
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
        <ClipboardList :size="24" />
        <div>
          <p>Total Request</p>
          <h2>{{ summary.total }}</h2>
        </div>
      </article>

      <article class="summary-card">
        <CalendarDays :size="24" />
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
        <CheckCircle2 :size="24" />
        <div>
          <p>Completed</p>
          <h2>{{ summary.completed }}</h2>
        </div>
      </article>
    </div>

    <div v-if="errorMessage" class="alert error">{{ errorMessage }}</div>

    <div class="main-grid">
      <article class="list-panel">
        <div class="toolbar">
          <div class="search-box">
            <Search :size="18" />
            <input v-model="search" type="text" placeholder="Cari ID atau status..." />
          </div>

          <select v-model="statusFilter">
            <option v-for="option in statusOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </div>

        <div v-if="loading" class="loading-state">
          <Loader2 class="spin" :size="30" />
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
                <strong>Request #{{ request.id.slice(0, 8) }}</strong>
                <span>Dibuat: {{ formatDate(request.created_at) }}</span>
              </div>

              <span :class="['status-pill', statusClass[request.status]]">
                {{ statusLabel[request.status] || request.status }}
              </span>
            </div>

            <div class="request-bottom">
              <small>Tanggal pengambilan</small>
              <b>{{ formatDate(request.tgl_pengambilan) }}</b>
            </div>
          </button>

          <div v-if="filteredRequests.length === 0" class="empty-state">
            <ClipboardList :size="34" />
            <strong>Request belum ditemukan</strong>
            <span>Kirim request barang dari halaman katalog.</span>
          </div>
        </div>
      </article>

      <article class="detail-panel">
        <div v-if="!selectedRequest" class="empty-detail">
          <Eye :size="34" />
          <h2>Pilih request</h2>
          <p>Klik salah satu request untuk melihat detail barang.</p>
        </div>

        <template v-else>
          <div class="detail-header">
            <div>
              <p>Detail Request</p>
              <h2>Request #{{ selectedRequest.id.slice(0, 8) }}</h2>
              <span>Pengambilan: {{ formatDate(selectedRequest.tgl_pengambilan) }}</span>
            </div>

            <span :class="['status-pill large', statusClass[selectedRequest.status]]">
              {{ statusLabel[selectedRequest.status] || selectedRequest.status }}
            </span>
          </div>

          <div class="status-info">
            <CheckCircle2 v-if="selectedRequest.status === 'completed'" :size="22" />
            <XCircle v-else-if="selectedRequest.status === 'rejected'" :size="22" />
            <PackageCheck v-else :size="22" />

            <div>
              <strong>{{ statusLabel[selectedRequest.status] || selectedRequest.status }}</strong>
              <span v-if="selectedRequest.status === 'pending'">
                Request menunggu approval admin.
              </span>
              <span v-else-if="selectedRequest.status === 'approved'">
                Request disetujui. Silakan datang ke gudang sesuai tanggal pengambilan.
              </span>
              <span v-else-if="selectedRequest.status === 'processing'">
                Admin sedang memproses serah terima barang.
              </span>
              <span v-else-if="selectedRequest.status === 'completed'">
                Request sudah selesai dan stok sudah dipotong.
              </span>
              <span v-else>
                Request ditolak oleh admin.
              </span>
            </div>
          </div>

          <div v-if="detailLoading" class="loading-state">
            <Loader2 class="spin" :size="30" />
            <span>Memuat detail barang...</span>
          </div>

          <div v-else class="detail-list">
            <article v-for="detail in requestDetails" :key="detail.id" class="detail-card">
              <div class="detail-main">
                <div :class="['scan-icon', detail.is_scanned ? 'done' : '']">
                  <CheckCircle2 v-if="detail.is_scanned" :size="19" />
                  <PackageCheck v-else :size="19" />
                </div>

                <div>
                  <strong>{{ detail.nama_barang }}</strong>
                  <small>Alasan: {{ detail.alasan || '-' }}</small>
                </div>
              </div>

              <div class="detail-side">
                <b>{{ detail.jumlah }} pcs</b>
                <span>{{ detail.is_scanned ? 'Sudah discan' : 'Belum discan' }}</span>
              </div>

              <a
                v-if="detail.foto_bukti"
                class="proof-link"
                :href="detail.foto_bukti"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ImageIcon :size="16" />
                Lihat Foto Bukti
              </a>
            </article>

            <div v-if="requestDetails.length === 0" class="empty-state">
              <PackageCheck :size="34" />
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
.my-requests-page {
  display: grid;
  gap: 20px;
}

.page-heading,
.main-grid,
.request-top,
.request-bottom,
.detail-header,
.status-info,
.detail-card,
.detail-main,
.detail-side,
.proof-link {
  display: flex;
}

.page-heading {
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.page-heading p {
  margin: 0 0 6px;
  color: #2563eb;
  font-size: 13px;
  font-weight: 900;
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

.primary-button {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  border: 0;
  border-radius: 10px;
  background: #2563eb;
  color: #ffffff;
  font-weight: 900;
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.18);
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
  font-weight: 900;
}

.summary-card h2 {
  margin: 0;
  color: #111827;
  font-size: 28px;
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

.main-grid {
  align-items: flex-start;
  gap: 18px;
}

.list-panel,
.detail-panel {
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.06);
}

.list-panel {
  width: 410px;
  overflow: hidden;
}

.toolbar {
  display: grid;
  grid-template-columns: 1fr 130px;
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
.toolbar select {
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
  max-height: 680px;
  overflow-y: auto;
  padding: 14px;
}

.request-card {
  display: grid;
  gap: 14px;
  width: 100%;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
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
.detail-card {
  align-items: center;
  justify-content: space-between;
  gap: 14px;
}

.request-top strong {
  display: block;
  color: #111827;
}

.request-top span:not(.status-pill),
.request-bottom small,
.request-bottom b {
  display: block;
  margin-top: 4px;
  color: #6b7280;
  font-size: 12px;
}

.request-bottom b {
  color: #111827;
  font-size: 13px;
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
  flex: 1;
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

.status-info {
  align-items: flex-start;
  gap: 12px;
  margin: 18px 0;
  padding: 16px;
  border-radius: 14px;
  background: #f9fafb;
  color: #2563eb;
}

.status-info strong {
  display: block;
  color: #111827;
}

.status-info span {
  display: block;
  margin-top: 4px;
  color: #6b7280;
  font-size: 13px;
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
  background: #ffffff;
}

.detail-main {
  align-items: center;
  gap: 12px;
}

.scan-icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 10px;
  background: #f3f4f6;
  color: #6b7280;
}

.scan-icon.done {
  background: #ecfdf5;
  color: #047857;
}

.detail-main strong {
  display: block;
  color: #111827;
}

.detail-main span,
.detail-main small {
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
  align-items: center;
  gap: 7px;
  width: 100%;
  color: #2563eb;
  font-size: 13px;
  font-weight: 900;
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

@media (max-width: 1080px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .main-grid {
    flex-direction: column;
    align-items: stretch;
  }

  .list-panel {
    width: 100%;
  }
}

@media (max-width: 720px) {
  .page-heading,
  .request-top,
  .request-bottom,
  .detail-header {
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

  .primary-button {
    justify-content: center;
    width: 100%;
  }
}
</style>

