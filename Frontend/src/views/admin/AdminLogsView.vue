<script setup>
import { onMounted, ref } from 'vue'
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardList,
  FileDown,
  Loader2,
  RefreshCcw,
} from 'lucide-vue-next'
import { getInventoryLogs } from '../../api/itemApi'
import { exportToCsv } from '../../utils/exportCsv'

const logs = ref([])
const loading = ref(false)
const errorMessage = ref('')
const exportStartDate = ref('')
const exportEndDate = ref('')
const exportLoading = ref(false)

const page = ref(1)
const limit = ref(10)
const totalItems = ref(0)
const totalPages = ref(1)

const formatDateTime = (value) => {
  if (!value) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

const fetchLogs = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await getInventoryLogs({
      page: page.value,
      limit: limit.value,
    })

    logs.value = response.data || []
    totalItems.value = response.totalItems || 0
    totalPages.value = response.totalPages || 1
    page.value = response.currentPage || 1
  } catch (error) {
    errorMessage.value =
      error.response?.data?.message ||
      error.response?.data?.error ||
      'Gagal mengambil riwayat stok.'
  } finally {
    loading.value = false
  }
}

const formatPengambilanOleh = (value) => {
  const labels = {
    ambil_sendiri: 'Ambil sendiri',
    admin_departemen: 'Admin Departemen',
    admin_hrga: 'Admin HRGA',
  }

  return labels[value] || '-'
}

const handleExportCsv = async () => {
  errorMessage.value = ''

  if ((exportStartDate.value && !exportEndDate.value) || (!exportStartDate.value && exportEndDate.value)) {
    errorMessage.value = 'Isi tanggal awal dan tanggal akhir untuk export berdasarkan range.'
    return
  }

  if (exportStartDate.value && exportEndDate.value && exportStartDate.value > exportEndDate.value) {
    errorMessage.value = 'Tanggal awal tidak boleh lebih besar dari tanggal akhir.'
    return
  }

  exportLoading.value = true

  try {
    const response = await getInventoryLogs({
      page: 1,
      limit: 100000,
      startDate: exportStartDate.value,
      endDate: exportEndDate.value,
    })

    const rows = (response.data || []).map((log) => ({
      waktu: formatDateTime(log.created_at),
      nama_barang: log.nama_barang || '',
      tipe_transaksi: log.tipe_transaksi || '',
      qty: log.qty ?? 0,
      diambil_oleh: log.tipe_transaksi === 'OUT' ? formatPengambilanOleh(log.pengambilan_oleh) : '',
      karyawan_pengambil: log.karyawan_pengambil || '',
    }))

    const suffix = exportStartDate.value && exportEndDate.value
      ? `${exportStartDate.value}-sd-${exportEndDate.value}`
      : `page-${page.value}`

    exportToCsv(`riwayat-stok-${suffix}.csv`, rows)
  } catch (error) {
    errorMessage.value =
      error.response?.data?.message ||
      error.response?.data?.error ||
      'Gagal export CSV riwayat stok.'
  } finally {
    exportLoading.value = false
  }
}
const goToPage = (targetPage) => {
  if (targetPage < 1 || targetPage > totalPages.value || targetPage === page.value) return

  page.value = targetPage
  fetchLogs()
}

onMounted(fetchLogs)
</script>

<template>
  <section class="logs-page">
    <div class="page-heading">
      <div>
        <p>Inventory Logs</p>
        <h1>Riwayat Stok</h1>
        <span>Catatan transaksi barang masuk dan barang keluar dari gudang.</span>
      </div>

      <div class="export-filter">
        <label>
          <span>Dari tanggal</span>
          <input v-model="exportStartDate" type="date" />
        </label>

        <label>
          <span>Sampai tanggal</span>
          <input v-model="exportEndDate" type="date" />
        </label>

        <button class="secondary-button" type="button" :disabled="exportLoading" @click="handleExportCsv">
          <FileDown :size="18" />
          <span>{{ exportLoading ? 'Exporting...' : 'Export CSV' }}</span>
        </button>
      </div>
      <button class="primary-button" type="button" @click="fetchLogs">
        <RefreshCcw :size="18" />
        <span>Refresh</span>
      </button>
    </div>

    <div v-if="errorMessage" class="alert error">
      {{ errorMessage }}
    </div>

    <article class="table-card">
      <div class="table-header">
        <div>
          <h2>Log Transaksi</h2>
          <p>Total {{ totalItems }} riwayat transaksi</p>
        </div>

        <div class="table-badge">
          <ClipboardList :size="17" />
          <span>Page {{ page }} / {{ totalPages }}</span>
        </div>
      </div>

      <div v-if="loading" class="loading-state">
        <Loader2 class="spin" :size="30" />
        <span>Memuat riwayat stok...</span>
      </div>

      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Barang</th>
              <th>Tipe</th>
              <th>Qty</th>
              <th>Diambil Oleh</th>
              <th>Karyawan Pengambil</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="log in logs" :key="log.id">
              <td>{{ formatDateTime(log.created_at) }}</td>

              <td>
                <strong>{{ log.nama_barang || '-' }}</strong>
              </td>

              <td>
                <span :class="['type-pill', log.tipe_transaksi === 'IN' ? 'in' : 'out']">
                  <ArrowDownToLine v-if="log.tipe_transaksi === 'IN'" :size="15" />
                  <ArrowUpFromLine v-else :size="15" />
                  {{ log.tipe_transaksi }}
                </span>
              </td>

              <td>
                <b>{{ log.qty }}</b>
              </td>

              <td>{{ log.tipe_transaksi === 'OUT' ? formatPengambilanOleh(log.pengambilan_oleh) : '-' }}</td>
              <td>{{ log.karyawan_pengambil || '-' }}</td>
            </tr>

            <tr v-if="logs.length === 0">
              <td colspan="6">
                <div class="empty-state">
                  <ClipboardList :size="34" />
                  <strong>Riwayat stok belum ada</strong>
                  <span>Transaksi barang masuk atau keluar akan tampil di sini.</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pagination">
        <button type="button" :disabled="page <= 1" @click="goToPage(page - 1)">
          Sebelumnya
        </button>

        <span>Halaman {{ page }} dari {{ totalPages }}</span>

        <button type="button" :disabled="page >= totalPages" @click="goToPage(page + 1)">
          Berikutnya
        </button>
      </div>
    </article>
  </section>
</template>

<style scoped>
.export-filter {
  display: flex;
  align-items: end;
  gap: 10px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.export-filter label {
  display: grid;
  gap: 6px;
}

.export-filter label span {
  color: #6b7280;
  font-size: 12px;
  font-weight: 800;
}

.export-filter input {
  border: 1px solid #d1d5db;
  border-radius: 12px;
  padding: 10px 12px;
  color: #111827;
  font-weight: 700;
  outline: none;
}

.export-filter input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.logs-page {
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

.primary-button,
.secondary-button {
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

.secondary-button {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  border: 0;
  border-radius: 10px;
  background: #eff6ff;
  color: #2563eb;
  font-weight: 900;
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

.table-card {
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.06);
}

.table-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 20px;
  border-bottom: 1px solid #e5e7eb;
}

.table-header h2 {
  margin: 0;
  color: #111827;
  font-size: 20px;
}

.table-header p {
  margin: 4px 0 0;
  color: #6b7280;
  font-size: 13px;
}

.table-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 12px;
  border-radius: 999px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 13px;
  font-weight: 900;
}

.loading-state,
.empty-state {
  min-height: 240px;
  display: grid;
  place-items: center;
  gap: 8px;
  text-align: center;
  color: #6b7280;
}

.empty-state strong {
  color: #111827;
}

.table-wrap {
  width: 100%;
  overflow-x: auto;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 15px 18px;
  border-bottom: 1px solid #f1f5f9;
  text-align: left;
  color: #374151;
  font-size: 14px;
}

th {
  background: #f9fafb;
  color: #6b7280;
  font-size: 12px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

td strong {
  color: #111827;
}

td b {
  color: #111827;
}

.type-pill {
  width: fit-content;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 900;
}

.type-pill.in {
  background: #ecfdf5;
  color: #047857;
}

.type-pill.out {
  background: #fef2f2;
  color: #dc2626;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
}

.pagination button {
  height: 38px;
  padding: 0 14px;
  border: 0;
  border-radius: 10px;
  background: #f3f4f6;
  color: #374151;
  font-weight: 900;
}

.pagination button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.pagination span {
  color: #6b7280;
  font-size: 13px;
  font-weight: 800;
}

.spin {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 760px) {
  .page-heading,
  .table-header,
  .pagination {
    align-items: stretch;
    flex-direction: column;
  }

  .primary-button,
.secondary-button {
    justify-content: center;
    width: 100%;
  }
}
</style>

