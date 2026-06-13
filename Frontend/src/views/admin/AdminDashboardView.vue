<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
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
const countdown = ref(10)
let countdownTimer = null
const activeTab = ref('general')
const selectedChartItem = ref('')

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
    .filter((item) => Number(item.stok_aktual) < Number(item.stok_safety || 10))
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
    helper: 'Jenis barang aktif di gudang',
    icon: Package,
  },
  {
    label: 'Total Unit Stok',
    value: items.value.reduce((sum, item) => sum + Number(item.stok_aktual || 0), 0) + ' pcs',
    helper: 'Akumulasi seluruh kuantitas stok',
    icon: Boxes,
  },
  {
    label: 'Request Bulan Ini',
    value: currentMonthRequests.value.length,
    helper: 'Total pengajuan bulan berjalan',
    icon: ClipboardList,
  },
  {
    label: 'Pending Approval',
    value: requests.value.filter(r => r.status === 'pending').length,
    helper: 'Request butuh tindakan admin',
    icon: AlertCircle,
  },
  {
    label: 'Stok Menipis',
    value: lowStockItems.value.length,
    helper: 'Barang di bawah limit safety',
    icon: AlertTriangle,
  },
  {
    label: 'Log Hari Ini',
    value: todayLogs.value.length,
    helper: 'Aktivitas IN/OUT hari ini',
    icon: ScanBarcode,
  },
])

const donutSegments = computed(() => {
  const total = requests.value.length || 1
  const counts = {
    pending: 0,
    approved: 0,
    processing: 0,
    completed: 0,
    rejected: 0,
  }

  requests.value.forEach((r) => {
    if (counts[r.status] !== undefined) {
      counts[r.status] += 1
    }
  })

  const rawStats = [
    { label: 'Pending Approval', status: 'pending', count: counts.pending, color: '#d97706' },
    { label: 'Waiting Pickup', status: 'approved', count: counts.approved, color: '#2563eb' },
    { label: 'Serah Terima', status: 'processing', count: counts.processing, color: '#7c3aed' },
    { label: 'Completed', status: 'completed', count: counts.completed, color: '#047857' },
    { label: 'Rejected', status: 'rejected', count: counts.rejected, color: '#dc2626' },
  ]

  let accumulatedPercent = 0
  const circumference = 377

  return rawStats.map((seg) => {
    const percentage = total > 0 ? (seg.count / total) * 100 : 0
    const strokeLength = (percentage / 100) * circumference
    const strokeOffset = circumference - accumulatedPercent
    accumulatedPercent += strokeLength

    return {
      ...seg,
      percentage,
      strokeLength,
      strokeOffset,
    }
  })
})

const categoryStats = computed(() => {
  const categories = {}
  items.value.forEach((item) => {
    const cat = item.jenis || 'Tanpa Kategori'
    categories[cat] = (categories[cat] || 0) + Number(item.stok_aktual || 0)
  })

  const totalStok = Object.values(categories).reduce((sum, val) => sum + val, 0) || 1

  return Object.entries(categories)
    .map(([category, stock]) => ({
      category,
      stock,
      percentage: (stock / totalStok) * 100,
    }))
    .sort((a, b) => b.stock - a.stock)
    .slice(0, 5)
})

const maxStockVal = computed(() => {
  const values = categoryStats.value.map(c => c.stock)
  const max = Math.max(...values, 0)
  return max > 0 ? max * 1.15 : 10
})

const generalChartData = computed(() => {
  const sortedLogs = [...logs.value].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  const chronologicalGroups = {}
  sortedLogs.forEach((log) => {
    const dateLabel = new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
    }).format(new Date(log.created_at))

    if (!chronologicalGroups[dateLabel]) {
      chronologicalGroups[dateLabel] = { date: dateLabel, in: 0, out: 0 }
    }
    
    if (log.tipe_transaksi === 'IN') {
      chronologicalGroups[dateLabel].in += Number(log.qty || 0)
    } else if (log.tipe_transaksi === 'OUT') {
      chronologicalGroups[dateLabel].out += Number(log.qty || 0)
    }
  })
  return Object.values(chronologicalGroups).slice(-7)
})

const specificChartData = computed(() => {
  if (!selectedChartItem.value) return []
  const itemLogs = logs.value.filter(log => String(log.item_id) === String(selectedChartItem.value))
  const sortedLogs = [...itemLogs].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  const chronologicalGroups = {}
  sortedLogs.forEach((log) => {
    const dateLabel = new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
    }).format(new Date(log.created_at))

    if (!chronologicalGroups[dateLabel]) {
      chronologicalGroups[dateLabel] = { date: dateLabel, in: 0, out: 0 }
    }
    
    if (log.tipe_transaksi === 'IN') {
      chronologicalGroups[dateLabel].in += Number(log.qty || 0)
    } else if (log.tipe_transaksi === 'OUT') {
      chronologicalGroups[dateLabel].out += Number(log.qty || 0)
    }
  })
  return Object.values(chronologicalGroups).slice(-7)
})

const generalLinePaths = computed(() => {
  const data = generalChartData.value
  if (data.length === 0) return { inPath: '', outPath: '', inArea: '', outArea: '', points: [], maxVal: 5 }

  const maxVal = Math.max(...data.map(d => Math.max(d.in, d.out)), 5) * 1.15
  const pointsCount = data.length
  const width = 500
  const height = 240
  const chartWidth = width - 70
  const chartHeight = 180
  
  const xSpacing = pointsCount > 1 ? chartWidth / (pointsCount - 1) : chartWidth

  const inPoints = []
  const outPoints = []

  data.forEach((d, i) => {
    const x = 50 + i * xSpacing
    const yIn = 200 - (d.in * (chartHeight / maxVal))
    const yOut = 200 - (d.out * (chartHeight / maxVal))
    inPoints.push({ x, y: yIn, val: d.in, date: d.date })
    outPoints.push({ x, y: yOut, val: d.out, date: d.date })
  })

  const buildPath = (pts) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const buildAreaPath = (pts) => {
    if (pts.length === 0) return ''
    return `${buildPath(pts)} L ${pts[pts.length - 1].x} 200 L ${pts[0].x} 200 Z`
  }

  return {
    inPath: buildPath(inPoints),
    outPath: buildPath(outPoints),
    inArea: buildAreaPath(inPoints),
    outArea: buildAreaPath(outPoints),
    inPoints,
    outPoints,
    maxVal,
  }
})

const specificLinePaths = computed(() => {
  const data = specificChartData.value
  if (data.length === 0) return { inPath: '', outPath: '', inArea: '', outArea: '', points: [], maxVal: 5 }

  const maxVal = Math.max(...data.map(d => Math.max(d.in, d.out)), 5) * 1.15
  const pointsCount = data.length
  const width = 500
  const height = 240
  const chartWidth = width - 70
  const chartHeight = 180
  
  const xSpacing = pointsCount > 1 ? chartWidth / (pointsCount - 1) : chartWidth

  const inPoints = []
  const outPoints = []

  data.forEach((d, i) => {
    const x = 50 + i * xSpacing
    const yIn = 200 - (d.in * (chartHeight / maxVal))
    const yOut = 200 - (d.out * (chartHeight / maxVal))
    inPoints.push({ x, y: yIn, val: d.in, date: d.date })
    outPoints.push({ x, y: yOut, val: d.out, date: d.date })
  })

  const buildPath = (pts) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  const buildAreaPath = (pts) => {
    if (pts.length === 0) return ''
    return `${buildPath(pts)} L ${pts[pts.length - 1].x} 200 L ${pts[0].x} 200 Z`
  }

  return {
    inPath: buildPath(inPoints),
    outPath: buildPath(outPoints),
    inArea: buildAreaPath(inPoints),
    outArea: buildAreaPath(outPoints),
    inPoints,
    outPoints,
    maxVal,
  }
})

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

const fetchDashboardData = async (isSilent = false) => {
  if (!isSilent) loading.value = true
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

const startCountdown = () => {
  countdown.value = 10
  if (countdownTimer) clearInterval(countdownTimer)
  countdownTimer = setInterval(async () => {
    countdown.value -= 1
    if (countdown.value <= 0) {
      countdown.value = 10
      await fetchDashboardData(true)
    }
  }, 1000)
}

const handleManualRefresh = async () => {
  countdown.value = 10
  await fetchDashboardData(false)
}

onMounted(() => {
  fetchDashboardData()
  startCountdown()
})

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
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

      <div class="refresh-container">
        <span class="countdown-text">Auto refresh: {{ countdown }}s</span>
        <button class="primary-button" type="button" @click="handleManualRefresh">
          <RefreshCcw :size="18" />
          <span>Refresh</span>
        </button>
      </div>
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

        <!-- New Statistics Panel: Request Status Summary Donut Chart -->
        <article class="panel">
          <div class="panel-header">
            <div>
              <p>Analisis</p>
              <h3>Status Pengajuan</h3>
            </div>
            <ClipboardList :size="22" />
          </div>

          <div class="donut-chart-container">
            <div class="donut-chart-wrapper">
              <svg viewBox="0 0 160 160" class="donut-svg">
                <!-- Background Circle -->
                <circle cx="80" cy="80" r="60" fill="transparent" stroke="#f3f4f6" stroke-width="14" />
                
                <!-- Segment Circles -->
                <circle
                  v-for="seg in donutSegments"
                  :key="seg.status"
                  cx="80"
                  cy="80"
                  r="60"
                  fill="transparent"
                  :stroke="seg.color"
                  stroke-width="14"
                  :stroke-dasharray="`${seg.strokeLength} ${377 - seg.strokeLength}`"
                  :stroke-dashoffset="seg.strokeOffset"
                  transform="rotate(-90 80 80)"
                  stroke-linecap="round"
                  class="donut-segment"
                />
              </svg>
              
              <div class="donut-center-text">
                <h2>{{ requests.length }}</h2>
                <span>Total Request</span>
              </div>
            </div>

            <div class="donut-legend">
              <div v-for="seg in donutSegments" :key="seg.status" class="legend-item">
                <span class="legend-dot" :style="{ backgroundColor: seg.color }"></span>
                <div class="legend-info">
                  <span class="legend-label">{{ seg.label }}</span>
                  <span class="legend-val"><strong>{{ seg.count }}</strong> request ({{ Math.round(seg.percentage) }}%)</span>
                </div>
              </div>
            </div>
          </div>
        </article>

        <!-- New Statistics Panel: Item Categories Distribution Bar Chart -->
        <article class="panel">
          <div class="panel-header">
            <div>
              <p>Inventori</p>
              <h3>Sebaran Kategori Barang</h3>
            </div>
            <Boxes :size="22" />
          </div>

          <div class="bar-chart-container">
            <svg viewBox="0 0 500 240" class="bar-chart-svg">
              <defs>
                <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#3b82f6" />
                  <stop offset="100%" stop-color="#2563eb" />
                </linearGradient>
              </defs>

              <!-- Gridlines -->
              <line x1="50" y1="20" x2="480" y2="20" stroke="#f3f4f6" stroke-width="1" />
              <line x1="50" y1="65" x2="480" y2="65" stroke="#f3f4f6" stroke-width="1" />
              <line x1="50" y1="110" x2="480" y2="110" stroke="#f3f4f6" stroke-width="1" />
              <line x1="50" y1="155" x2="480" y2="155" stroke="#f3f4f6" stroke-width="1" />
              <line x1="50" y1="200" x2="480" y2="200" stroke="#e5e7eb" stroke-width="2" />

              <!-- Y-Axis Labels -->
              <text x="42" y="24" text-anchor="end" class="chart-label">{{ Math.round(maxStockVal) }}</text>
              <text x="42" y="69" text-anchor="end" class="chart-label">{{ Math.round(maxStockVal * 0.75) }}</text>
              <text x="42" y="114" text-anchor="end" class="chart-label">{{ Math.round(maxStockVal * 0.5) }}</text>
              <text x="42" y="159" text-anchor="end" class="chart-label">{{ Math.round(maxStockVal * 0.25) }}</text>
              <text x="42" y="204" text-anchor="end" class="chart-label">0</text>

              <!-- Bars -->
              <g v-for="(cat, index) in categoryStats" :key="cat.category">
                <!-- Bar rect -->
                <rect
                  :x="65 + index * 84"
                  :y="200 - (cat.stock * (180 / maxStockVal))"
                  width="44"
                  :height="cat.stock * (180 / maxStockVal)"
                  fill="url(#barGrad)"
                  rx="6"
                  class="chart-bar"
                />
                <!-- Value above bar -->
                <text
                  :x="65 + index * 84 + 22"
                  :y="200 - (cat.stock * (180 / maxStockVal)) - 6"
                  text-anchor="middle"
                  class="bar-value"
                >
                  {{ cat.stock }}
                </text>
                <!-- X-Axis Label -->
                <text
                  :x="65 + index * 84 + 22"
                  y="220"
                  text-anchor="middle"
                  class="chart-x-label"
                >
                  {{ cat.category.slice(0, 10) }}{{ cat.category.length > 10 ? '..' : '' }}
                </text>
              </g>
            </svg>
          </div>
        </article>

        <!-- Trend Transaksi Barang (General & Specific Item Wise) -->
        <article class="panel chart-panel-full">
          <div class="chart-panel-header">
            <div>
              <p>Tren Aktivitas</p>
              <h3>Arus Barang Masuk & Keluar</h3>
            </div>
            
            <div class="chart-controls">
              <!-- Tabs -->
              <div class="chart-tabs">
                <button
                  :class="['tab-btn', activeTab === 'general' ? 'active' : '']"
                  type="button"
                  @click="activeTab = 'general'"
                >
                  General Item Wise
                </button>
                <button
                  :class="['tab-btn', activeTab === 'specific' ? 'active' : '']"
                  type="button"
                  @click="activeTab = 'specific'"
                >
                  Specific Item Wise
                </button>
              </div>

              <!-- Item Selector (only visible for specific item wise tab) -->
              <select
                v-if="activeTab === 'specific'"
                v-model="selectedChartItem"
                class="chart-item-select"
              >
                <option value="">-- Pilih Barang --</option>
                <option v-for="item in items" :key="item.id" :value="item.id">
                  {{ item.nama_barang }}
                </option>
              </select>
            </div>
          </div>

          <!-- Chart Display -->
          <div class="chart-body">
            <!-- General Tab -->
            <div v-if="activeTab === 'general'">
              <div v-if="generalChartData.length === 0" class="empty-chart">
                <TrendingUp :size="34" />
                <strong>Belum ada data transaksi</strong>
                <span>Aktivitas stok IN/OUT akan terekam dalam grafik ini.</span>
              </div>

              <div v-else class="line-chart-container">
                <svg viewBox="0 0 500 240" class="line-chart-svg">
                  <defs>
                    <!-- Gradients for Area Fills -->
                    <linearGradient id="inAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stop-color="#10b981" stop-opacity="0.25" />
                      <stop offset="100%" stop-color="#10b981" stop-opacity="0.0" />
                    </linearGradient>
                    <linearGradient id="outAreaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stop-color="#ef4444" stop-opacity="0.25" />
                      <stop offset="100%" stop-color="#ef4444" stop-opacity="0.0" />
                    </linearGradient>
                  </defs>

                  <!-- Gridlines -->
                  <line x1="50" y1="20" x2="480" y2="20" stroke="#f3f4f6" stroke-width="1" />
                  <line x1="50" y1="65" x2="480" y2="65" stroke="#f3f4f6" stroke-width="1" />
                  <line x1="50" y1="110" x2="480" y2="110" stroke="#f3f4f6" stroke-width="1" />
                  <line x1="50" y1="155" x2="480" y2="155" stroke="#f3f4f6" stroke-width="1" />
                  <line x1="50" y1="200" x2="480" y2="200" stroke="#e5e7eb" stroke-width="2" />

                  <!-- Y-Axis Labels -->
                  <text x="42" y="24" text-anchor="end" class="chart-label">{{ Math.round(generalLinePaths.maxVal) }}</text>
                  <text x="42" y="69" text-anchor="end" class="chart-label">{{ Math.round(generalLinePaths.maxVal * 0.75) }}</text>
                  <text x="42" y="114" text-anchor="end" class="chart-label">{{ Math.round(generalLinePaths.maxVal * 0.5) }}</text>
                  <text x="42" y="159" text-anchor="end" class="chart-label">{{ Math.round(generalLinePaths.maxVal * 0.25) }}</text>
                  <text x="42" y="204" text-anchor="end" class="chart-label">0</text>

                  <!-- Area Fills -->
                  <path :d="generalLinePaths.inArea" fill="url(#inAreaGrad)" />
                  <path :d="generalLinePaths.outArea" fill="url(#outAreaGrad)" />

                  <!-- Stroke Lines -->
                  <path :d="generalLinePaths.inPath" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" />
                  <path :d="generalLinePaths.outPath" fill="none" stroke="#ef4444" stroke-width="3" stroke-linecap="round" />

                  <!-- X-Axis Labels & Tooltip Points (IN) -->
                  <g v-for="(p, i) in generalLinePaths.inPoints" :key="'in-'+i">
                    <circle :cx="p.x" :cy="p.y" r="5" fill="#10b981" stroke="#ffffff" stroke-width="2" class="chart-point" />
                    <text :x="p.x" y="220" text-anchor="middle" class="chart-x-label">{{ p.date }}</text>
                    <text :x="p.x" :y="p.y - 8" text-anchor="middle" class="point-hover-val in-val">{{ p.val }}</text>
                  </g>

                  <!-- Tooltip Points (OUT) -->
                  <g v-for="(p, i) in generalLinePaths.outPoints" :key="'out-'+i">
                    <circle :cx="p.x" :cy="p.y" r="5" fill="#ef4444" stroke="#ffffff" stroke-width="2" class="chart-point" />
                    <text :x="p.x" :y="p.y - 8" text-anchor="middle" class="point-hover-val out-val">{{ p.val }}</text>
                  </g>
                </svg>

                <!-- Legends -->
                <div class="line-chart-legend">
                  <div class="legend-item">
                    <span class="legend-line in"></span>
                    <span>Total IN (Barang Masuk)</span>
                  </div>
                  <div class="legend-item">
                    <span class="legend-line out"></span>
                    <span>Total OUT (Barang Keluar)</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Specific Tab -->
            <div v-if="activeTab === 'specific'">
              <div v-if="!selectedChartItem" class="empty-chart">
                <TrendingUp :size="34" />
                <strong>Pilih Barang Terlebih Dahulu</strong>
                <span>Gunakan menu dropdown di atas untuk memilih barang.</span>
              </div>

              <div v-else-if="specificChartData.length === 0" class="empty-chart">
                <TrendingUp :size="34" />
                <strong>Belum ada transaksi untuk barang ini</strong>
                <span>Aktivitas stok barang ini akan terekam setelah transaksi diproses.</span>
              </div>

              <div v-else class="line-chart-container">
                <svg viewBox="0 0 500 240" class="line-chart-svg">
                  <defs>
                    <linearGradient id="inAreaGradSpec" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stop-color="#10b981" stop-opacity="0.25" />
                      <stop offset="100%" stop-color="#10b981" stop-opacity="0.0" />
                    </linearGradient>
                    <linearGradient id="outAreaGradSpec" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stop-color="#ef4444" stop-opacity="0.25" />
                      <stop offset="100%" stop-color="#ef4444" stop-opacity="0.0" />
                    </linearGradient>
                  </defs>

                  <!-- Gridlines -->
                  <line x1="50" y1="20" x2="480" y2="20" stroke="#f3f4f6" stroke-width="1" />
                  <line x1="50" y1="65" x2="480" y2="65" stroke="#f3f4f6" stroke-width="1" />
                  <line x1="50" y1="110" x2="480" y2="110" stroke="#f3f4f6" stroke-width="1" />
                  <line x1="50" y1="155" x2="480" y2="155" stroke="#f3f4f6" stroke-width="1" />
                  <line x1="50" y1="200" x2="480" y2="200" stroke="#e5e7eb" stroke-width="2" />

                  <!-- Y-Axis Labels -->
                  <text x="42" y="24" text-anchor="end" class="chart-label">{{ Math.round(specificLinePaths.maxVal) }}</text>
                  <text x="42" y="69" text-anchor="end" class="chart-label">{{ Math.round(specificLinePaths.maxVal * 0.75) }}</text>
                  <text x="42" y="114" text-anchor="end" class="chart-label">{{ Math.round(specificLinePaths.maxVal * 0.5) }}</text>
                  <text x="42" y="159" text-anchor="end" class="chart-label">{{ Math.round(specificLinePaths.maxVal * 0.25) }}</text>
                  <text x="42" y="204" text-anchor="end" class="chart-label">0</text>

                  <!-- Area Fills -->
                  <path :d="specificLinePaths.inArea" fill="url(#inAreaGradSpec)" />
                  <path :d="specificLinePaths.outArea" fill="url(#outAreaGradSpec)" />

                  <!-- Stroke Lines -->
                  <path :d="specificLinePaths.inPath" fill="none" stroke="#10b981" stroke-width="3" stroke-linecap="round" />
                  <path :d="specificLinePaths.outPath" fill="none" stroke="#ef4444" stroke-width="3" stroke-linecap="round" />

                  <!-- X-Axis Labels & Tooltip Points (IN) -->
                  <g v-for="(p, i) in specificLinePaths.inPoints" :key="'spec-in-'+i">
                    <circle :cx="p.x" :cy="p.y" r="5" fill="#10b981" stroke="#ffffff" stroke-width="2" class="chart-point" />
                    <text :x="p.x" y="220" text-anchor="middle" class="chart-x-label">{{ p.date }}</text>
                    <text :x="p.x" :y="p.y - 8" text-anchor="middle" class="point-hover-val in-val">{{ p.val }}</text>
                  </g>

                  <!-- Tooltip Points (OUT) -->
                  <g v-for="(p, i) in specificLinePaths.outPoints" :key="'spec-out-'+i">
                    <circle :cx="p.x" :cy="p.y" r="5" fill="#ef4444" stroke="#ffffff" stroke-width="2" class="chart-point" />
                    <text :x="p.x" :y="p.y - 8" text-anchor="middle" class="point-hover-val out-val">{{ p.val }}</text>
                  </g>
                </svg>

                <!-- Legends -->
                <div class="line-chart-legend">
                  <div class="legend-item">
                    <span class="legend-line in"></span>
                    <span>Stok IN (Masuk)</span>
                  </div>
                  <div class="legend-item">
                    <span class="legend-line out"></span>
                    <span>Stok OUT (Keluar)</span>
                  </div>
                </div>
              </div>
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
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 18px;
}

/* Trend Chart styles */
.chart-panel-full {
  grid-column: span 2;
}

.chart-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
  border-bottom: 1px solid #e5e7eb;
  padding-bottom: 16px;
}

.chart-panel-header h3 {
  margin: 0;
  color: #111827;
  font-size: 20px;
  letter-spacing: -0.03em;
}

.chart-panel-header p {
  margin: 0 0 4px;
  color: #6b7280;
  font-size: 12px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.chart-controls {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.chart-tabs {
  display: flex;
  background: #f3f4f6;
  padding: 4px;
  border-radius: 10px;
  border: 1px solid #e5e7eb;
}

.tab-btn {
  border: 0;
  background: transparent;
  padding: 8px 14px;
  font-size: 13px;
  font-weight: 800;
  color: #4b5563;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn.active {
  background: #ffffff;
  color: #2563eb;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
}

.chart-item-select {
  height: 38px;
  padding: 0 10px;
  border: 1px solid #d1d5db;
  border-radius: 9px;
  background: #ffffff;
  font-size: 13px;
  outline: none;
  font-weight: 800;
  color: #374151;
}

.chart-item-select:focus {
  border-color: #2563eb;
}

.chart-body {
  min-height: 240px;
}

.empty-chart {
  min-height: 240px;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 8px;
  text-align: center;
  color: #6b7280;
}

.empty-chart strong {
  color: #111827;
}

.line-chart-container {
  display: grid;
  gap: 14px;
}

.line-chart-svg {
  width: 100%;
  height: auto;
  max-height: 260px;
}

.chart-point {
  cursor: pointer;
  transition: r 0.2s ease, stroke-width 0.2s ease;
}

.chart-point:hover {
  r: 7;
  stroke-width: 3px;
}

.point-hover-val {
  font-size: 10px;
  font-weight: 900;
  opacity: 0.9;
}

.point-hover-val.in-val {
  fill: #10b981;
}

.point-hover-val.out-val {
  fill: #ef4444;
}

.line-chart-legend {
  display: flex;
  justify-content: center;
  gap: 24px;
  margin-top: 10px;
}

.line-chart-legend .legend-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #4b5563;
  font-weight: 700;
}

.legend-line {
  width: 24px;
  height: 4px;
  border-radius: 99px;
}

.legend-line.in {
  background: #10b981;
}

.legend-line.out {
  background: #ef4444;
}

.donut-chart-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 10px 0;
}

.donut-chart-wrapper {
  position: relative;
  width: 160px;
  height: 160px;
  flex: 0 0 auto;
}

.donut-svg {
  width: 100%;
  height: 100%;
}

.donut-segment {
  transition: stroke-dashoffset 0.5s ease-in-out, stroke-width 0.2s ease;
}

.donut-segment:hover {
  stroke-width: 18px;
}

.donut-center-text {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

.donut-center-text h2 {
  margin: 0;
  font-size: 28px;
  color: #111827;
  font-weight: 900;
  line-height: 1;
}

.donut-center-text span {
  font-size: 11px;
  color: #6b7280;
  font-weight: 800;
  text-transform: uppercase;
  margin-top: 4px;
}

.donut-legend {
  display: grid;
  gap: 8px;
  flex: 1;
}

.legend-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex: 0 0 auto;
  margin-top: 4px;
}

.legend-info {
  display: grid;
  line-height: 1.2;
}

.legend-label {
  font-size: 13px;
  font-weight: 700;
  color: #374151;
}

.legend-val {
  font-size: 12px;
  color: #6b7280;
}

.legend-val strong {
  color: #111827;
}

/* Bar chart styles */
.bar-chart-container {
  padding: 10px 0;
}

.bar-chart-svg {
  width: 100%;
  height: auto;
  max-height: 240px;
}

.chart-label {
  font-size: 11px;
  fill: #9ca3af;
  font-weight: 700;
}

.chart-x-label {
  font-size: 11px;
  fill: #4b5563;
  font-weight: 800;
}

.bar-value {
  font-size: 12px;
  fill: #2563eb;
  font-weight: 900;
}

.chart-bar {
  transition: opacity 0.2s ease;
  cursor: pointer;
}

.chart-bar:hover {
  opacity: 0.85;
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

@media (max-width: 1100px) {
  .stats-grid,
  .dashboard-grid {
    grid-template-columns: 1fr 1fr;
  }
  
  .chart-panel-full {
    grid-column: span 1;
  }
}

@media (max-width: 720px) {
  .page-heading {
    align-items: flex-start;
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

  .donut-chart-container {
    flex-direction: column;
    gap: 16px;
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

