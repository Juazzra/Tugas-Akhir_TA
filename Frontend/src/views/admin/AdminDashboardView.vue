<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardList,
  Loader2,
  Package,
  RefreshCcw,
  ScanBarcode,
  TrendingUp,
} from 'lucide-vue-next'
import { getItems, getInventoryLogs } from '../../api/itemApi'
import { getRequests } from '../../api/requestApi'

const items = ref([])
const requests = ref([])
const logs = ref([])
const totalItems = ref(0)
const loading = ref(false)
const errorMessage = ref('')
let autoRefreshTimer = null

const currentMonthRequests = computed(() => {
  const now = new Date()
  const month = now.getMonth()
  const year = now.getFullYear()

  return requests.value.filter((request) => {
    const date = new Date(request.tgl_pengambilan)
    return date.getMonth() === month && date.getFullYear() === year
  })
})

const lowStockItems = computed(() => {
  return items.value
    .filter((item) => Number(item.stok_aktual) < 10)
    .sort((a, b) => Number(a.stok_aktual) - Number(b.stok_aktual))
    .slice(0, 5)
})

const todayLogs = computed(() => {
  const today = new Date().toDateString()

  return logs.value.filter((log) => {
    return new Date(log.created_at).toDateString() === today
  })
})

const topRequestedItems = computed(() => {
  const result = {}

  logs.value
    .filter((log) => log.tipe_transaksi === 'OUT')
    .forEach((log) => {
      if (!result[log.nama_barang]) {
        result[log.nama_barang] = 0
      }

      result[log.nama_barang] += Number(log.qty || 0)
    })

  return Object.entries(result)
    .map(([nama_barang, total]) => ({ nama_barang, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5)
})

const recentRequests = computed(() => requests.value.slice(0, 5))
const recentLogs = computed(() => logs.value.slice(0, 5))

const stats = computed(() => [
  {
    label: 'Total Barang',
    value: totalItems.value,
    helper: 'Item aktif di master barang',
    icon: Package,
  },
  {
    label: 'Request Bulan Ini',
    value: currentMonthRequests.value.length,
    helper: 'Total pengajuan bulan berjalan',
    icon: ClipboardList,
  },
  {
    label: 'Stok Menipis',
    value: lowStockItems.value.length,
    helper: 'Barang dengan stok di bawah 10',
    icon: AlertTriangle,
  },
  {
    label: 'Log Hari Ini',
    value: todayLogs.value.length,
    helper: 'Aktivitas IN/OUT hari ini',
    icon: ScanBarcode,
  },
])

const formatDate = (value) => {
  if (!value) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

const formatDateTime = (value) => {
  if (!value) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

const statusLabel = {
  pending: 'Pending',
  approved: 'Waiting Pickup',
  processing: 'Processing',
  completed: 'Completed',
  rejected: 'Rejected',
}

const fetchDashboardData = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    const [itemsResponse, requestsResponse, logsResponse] = await Promise.all([
      getItems({ page: 1, limit: 100 }),
      getRequests(),
      getInventoryLogs({ page: 1, limit: 100 }),
    ])

    items.value = itemsResponse.data || []
    totalItems.value = itemsResponse.totalItems || items.value.length
    requests.value = Array.isArray(requestsResponse) ? requestsResponse : []
    logs.value = logsResponse.data || []
  } catch (error) {
    errorMessage.value =
      error.response?.data?.message ||
      error.response?.data?.error ||
      'Gagal mengambil data dashboard.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchDashboardData()
  autoRefreshTimer = setInterval(fetchDashboardData, 10000)
})

onUnmounted(() => {
  if (autoRefreshTimer) clearInterval(autoRefreshTimer)
})
</script>

<template>
  <section class="dashboard-page">
    <div class="page-heading">
      <div>
        <p>Overview Gudang</p>
        <h1>Admin Dashboard</h1>
        <span>Ringkasan data real-time dari master barang, request, dan inventory logs.</span>
      </div>

      <button class="primary-button" type="button" @click="fetchDashboardData">
        <RefreshCcw :size="18" />
        <span>Refresh</span>
      </button>
    </div>

    <div v-if="errorMessage" class="alert error">{{ errorMessage }}</div>

    <div v-if="loading" class="loading-state">
      <Loader2 class="spin" :size="30" />
      <span>Memuat dashboard...</span>
    </div>

    <template v-else>
      <div class="stats-grid">
        <article v-for="stat in stats" :key="stat.label" class="stat-card">
          <div class="stat-icon">
            <component :is="stat.icon" :size="24" />
          </div>

          <div>
            <p>{{ stat.label }}</p>
            <h2>{{ stat.value }}</h2>
            <span>{{ stat.helper }}</span>
          </div>
        </article>
      </div>

      <div class="dashboard-grid">
        <article class="panel">
          <div class="panel-header">
            <div>
              <p>Monitoring</p>
              <h3>Warning Stok Menipis</h3>
            </div>
            <AlertTriangle :size="22" />
          </div>

          <div class="stock-list">
            <div v-for="item in lowStockItems" :key="item.id" class="stock-row">
              <div>
                <strong>{{ item.nama_barang }}</strong>
                <span>{{ item.jenis || 'Tanpa kategori' }}</span>
              </div>

              <b>{{ item.stok_aktual }} pcs</b>
            </div>

            <div v-if="lowStockItems.length === 0" class="empty-mini">
              Tidak ada stok menipis.
            </div>
          </div>
        </article>

        <article class="panel">
          <div class="panel-header">
            <div>
              <p>Insight</p>
              <h3>Top Barang Keluar</h3>
            </div>
            <TrendingUp :size="22" />
          </div>

          <div class="top-list">
            <div v-for="item in topRequestedItems" :key="item.nama_barang" class="top-row">
              <div>
                <strong>{{ item.nama_barang }}</strong>
                <span>Total keluar dari inventory logs</span>
              </div>

              <b>{{ item.total }} pcs</b>
            </div>

            <div v-if="topRequestedItems.length === 0" class="empty-mini">
              Belum ada transaksi OUT.
            </div>
          </div>
        </article>

        <article class="panel">
          <div class="panel-header">
            <div>
              <p>Request</p>
              <h3>Pengajuan Terbaru</h3>
            </div>
            <ClipboardList :size="22" />
          </div>

          <div class="request-list">
            <div v-for="request in recentRequests" :key="request.id" class="request-row">
              <div>
                <strong>{{ request.nama_karyawan }}</strong>
                <span>{{ request.nik }} • Ambil {{ formatDate(request.tgl_pengambilan) }}</span>
              </div>

              <small>{{ statusLabel[request.status] || request.status }}</small>
            </div>

            <div v-if="recentRequests.length === 0" class="empty-mini">
              Belum ada request.
            </div>
          </div>
        </article>

        <article class="panel">
          <div class="panel-header">
            <div>
              <p>Real-Time</p>
              <h3>Aktivitas Stok Terbaru</h3>
            </div>
            <ScanBarcode :size="22" />
          </div>

          <div class="scanner-list">
            <div v-for="log in recentLogs" :key="log.id" class="scanner-row">
              <div :class="['scanner-row-icon', log.tipe_transaksi === 'IN' ? 'in' : 'out']">
                <ArrowDownToLine v-if="log.tipe_transaksi === 'IN'" :size="18" />
                <ArrowUpFromLine v-else :size="18" />
              </div>

              <div>
                <strong>{{ log.nama_barang }}</strong>
                <span>{{ log.tipe_transaksi }} • {{ log.qty }} pcs • {{ log.pic_admin || '-' }}</span>
              </div>

              <time>{{ formatDateTime(log.created_at) }}</time>
            </div>

            <div v-if="recentLogs.length === 0" class="empty-mini">
              Belum ada aktivitas stok.
            </div>
          </div>
        </article>
      </div>
    </template>
  </section>
</template>

<style scoped>
.dashboard-page {
  display: grid;
  gap: 24px;
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
  height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 0 16px;
  border: 0;
  border-radius: 10px;
  background: #2563eb;
  color: #ffffff;
  font-weight: 900;
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.22);
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

.loading-state {
  min-height: 320px;
  display: grid;
  place-items: center;
  gap: 10px;
  color: #6b7280;
}

.spin {
  animation: spin 0.9s linear infinite;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}

.stat-card {
  display: flex;
  gap: 14px;
  padding: 20px;
  border-radius: 14px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.06);
}

.stat-icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 12px;
  background: #eff6ff;
  color: #2563eb;
}

.stat-card p {
  margin: 0 0 5px;
  color: #6b7280;
  font-size: 13px;
  font-weight: 700;
}

.stat-card h2 {
  margin: 0;
  color: #111827;
  font-size: 30px;
  letter-spacing: -0.04em;
}

.stat-card span {
  display: block;
  margin-top: 4px;
  color: #9ca3af;
  font-size: 12px;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

.panel {
  min-width: 0;
  padding: 20px;
  border-radius: 14px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.06);
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 18px;
  color: #2563eb;
}

.panel-header p {
  margin: 0 0 4px;
  color: #6b7280;
  font-size: 12px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.panel-header h3 {
  margin: 0;
  color: #111827;
  font-size: 20px;
  letter-spacing: -0.03em;
}

.stock-list,
.request-list,
.scanner-list,
.top-list {
  display: grid;
  gap: 10px;
}

.stock-row,
.request-row,
.scanner-row,
.top-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px;
  border-radius: 12px;
  background: #f9fafb;
  border: 1px solid #eef2f7;
}

.stock-row strong,
.request-row strong,
.scanner-row strong,
.top-row strong {
  display: block;
  color: #111827;
  font-size: 14px;
}

.stock-row span,
.request-row span,
.scanner-row span,
.top-row span {
  display: block;
  margin-top: 4px;
  color: #6b7280;
  font-size: 12px;
}

.stock-row b {
  color: #dc2626;
  white-space: nowrap;
}

.top-row b {
  color: #2563eb;
  white-space: nowrap;
}

.request-row small {
  padding: 7px 10px;
  border-radius: 999px;
  background: #eff6ff;
  color: #2563eb;
  font-weight: 900;
  white-space: nowrap;
}

.scanner-row {
  justify-content: flex-start;
}

.scanner-row-icon {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 10px;
}

.scanner-row-icon.in {
  background: #ecfdf5;
  color: #047857;
}

.scanner-row-icon.out {
  background: #fef2f2;
  color: #dc2626;
}

.scanner-row time {
  margin-left: auto;
  color: #6b7280;
  font-size: 13px;
  font-weight: 800;
  white-space: nowrap;
}

.empty-mini {
  padding: 18px;
  border-radius: 12px;
  background: #f9fafb;
  color: #6b7280;
  text-align: center;
  font-weight: 700;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1100px) {
  .stats-grid,
  .dashboard-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 720px) {
  .page-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .stats-grid,
  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .primary-button {
    justify-content: center;
    width: 100%;
  }
}
</style>

