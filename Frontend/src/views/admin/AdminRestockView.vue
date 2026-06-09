<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  AlertTriangle,
  ArrowDownToLine,
  CheckCircle2,
  Loader2,
  PackagePlus,
  RefreshCcw,
  Trash2,
} from 'lucide-vue-next'
import { approveRestock, getRestockQueue, rejectRestock, getItems } from '../../api/itemApi'

const router = useRouter()

const queue = ref([])
const qtyMap = ref({})
const loading = ref(false)
const actionLoading = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
let autoRefreshTimer = null
const countdown = ref(10)
let countdownTimer = null

const manualBarcode = ref('')
const manualQty = ref(1)
const showRegisterPrompt = ref(false)
const unregisteredBarcode = ref('')

const handleManualRestock = async () => {
  const barcode = manualBarcode.value.trim()
  const qty = Number(manualQty.value)

  if (!barcode || qty <= 0) {
    errorMessage.value = 'Barcode dan Qty tidak valid.'
    return
  }

  actionLoading.value = true
  clearMessage()
  showRegisterPrompt.value = false
  unregisteredBarcode.value = ''

  try {
    // Verify if item exists in master list first
    const checkResponse = await getItems({ search: barcode, page: 1, limit: 1 })
    const matchedItem = checkResponse.data?.find((i) => i.barcode === barcode)
    
    if (!matchedItem) {
      errorMessage.value = `Barang dengan barcode "${barcode}" belum terdaftar di Master Barang.`
      unregisteredBarcode.value = barcode
      showRegisterPrompt.value = true
      actionLoading.value = false
      return
    }

    const response = await approveRestock([
      {
        barcode,
        qty,
      },
    ])

    successMessage.value = response.message || `Restock manual "${matchedItem.nama_barang}" sebanyak ${qty} pcs berhasil diproses.`
    manualBarcode.value = ''
    manualQty.value = 1
    
    // Refresh the queue
    await fetchQueue()
  } catch (error) {
    errorMessage.value =
      error.response?.data?.message ||
      error.response?.data?.error ||
      'Gagal memproses restock manual.'
  } finally {
    actionLoading.value = false
  }
}

const redirectToRegister = (barcode) => {
  router.push({
    path: '/admin/items',
    query: { addBarcode: barcode }
  })
}

const knownItems = computed(() => queue.value.filter((item) => item.item_id))
const unknownItems = computed(() => queue.value.filter((item) => !item.item_id))

const clearMessage = () => {
  errorMessage.value = ''
  successMessage.value = ''
}

const fetchQueue = async (isSilent = false) => {
  if (!isSilent) loading.value = true
  clearMessage()

  try {
    const response = await getRestockQueue()
    queue.value = Array.isArray(response) ? response : response?.value || []

    const nextQtyMap = {}
    queue.value.forEach((item) => {
      nextQtyMap[item.barcode] = Number(qtyMap.value[item.barcode] || item.jumlah_masuk || 1)
    })
    qtyMap.value = nextQtyMap
  } catch (error) {
    errorMessage.value =
      error.response?.data?.message ||
      error.response?.data?.error ||
      'Gagal mengambil antrean barang masuk.'
  } finally {
    loading.value = false
  }
}

const updateQty = (barcode, value) => {
  const qty = Number(value)
  qtyMap.value[barcode] = qty > 0 ? qty : 1
}

const handleApproveItem = async (item) => {
  const qty = Number(qtyMap.value[item.barcode] || item.jumlah_masuk || 1)

  if (!item.item_id) {
    errorMessage.value = 'Barang belum terdaftar di Master Barang. Daftarkan barang dulu atau reject antrean ini.'
    return
  }

  const confirmed = confirm(`ACC restock "${item.nama_barang}" sebanyak ${qty} pcs?`)
  if (!confirmed) return

  actionLoading.value = true
  clearMessage()

  try {
    await approveRestock([
      {
        barcode: item.barcode,
        qty,
      },
    ])

    successMessage.value = `Restock ${item.nama_barang} berhasil diproses.`
    await fetchQueue()
  } catch (error) {
    errorMessage.value =
      error.response?.data?.message ||
      error.response?.data?.error ||
      'Gagal memproses restock.'
  } finally {
    actionLoading.value = false
  }
}

const handleApproveAll = async () => {
  if (knownItems.value.length === 0) {
    errorMessage.value = 'Tidak ada barang terdaftar yang bisa di-ACC.'
    return
  }

  const payload = knownItems.value.map((item) => ({
    barcode: item.barcode,
    qty: Number(qtyMap.value[item.barcode] || item.jumlah_masuk || 1),
  }))

  const confirmed = confirm(`ACC ${payload.length} antrean restock yang sudah terdaftar?`)
  if (!confirmed) return

  actionLoading.value = true
  clearMessage()

  try {
    await approveRestock(payload)
    successMessage.value = 'Semua restock barang terdaftar berhasil diproses.'
    await fetchQueue()
  } catch (error) {
    errorMessage.value =
      error.response?.data?.message ||
      error.response?.data?.error ||
      'Gagal memproses semua restock.'
  } finally {
    actionLoading.value = false
  }
}

const handleReject = async (item) => {
  const confirmed = confirm(`Reject antrean barcode "${item.barcode}"?`)
  if (!confirmed) return

  actionLoading.value = true
  clearMessage()

  try {
    await rejectRestock(item.barcode)
    successMessage.value = `Antrean barcode ${item.barcode} berhasil direject.`
    await fetchQueue()
  } catch (error) {
    errorMessage.value =
      error.response?.data?.message ||
      error.response?.data?.error ||
      'Gagal menolak antrean restock.'
  } finally {
    actionLoading.value = false
  }
}

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

const startCountdown = () => {
  countdown.value = 10
  if (countdownTimer) clearInterval(countdownTimer)
  countdownTimer = setInterval(async () => {
    countdown.value -= 1
    if (countdown.value <= 0) {
      countdown.value = 10
      await fetchQueue(true)
    }
  }, 1000)
}

const handleManualRefresh = async () => {
  countdown.value = 10
  await fetchQueue(false)
}

onMounted(() => {
  fetchQueue()
  startCountdown()
})

onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
})
</script>

<template>
  <section class="restock-page">
    <div class="page-heading">
      <div>
        <p>Inbound Scanner</p>
        <h1>Barang Masuk</h1>
        <span>Validasi antrean scan mode IN sebelum stok gudang bertambah.</span>
      </div>

      <div class="heading-actions">
        <div class="refresh-container">
          <span class="countdown-text">Auto refresh: {{ countdown }}s</span>
          <button class="secondary-button" type="button" @click="handleManualRefresh">
            <RefreshCcw :size="18" />
            <span>Refresh</span>
          </button>
        </div>

        <button
          class="primary-button"
          type="button"
          :disabled="actionLoading || knownItems.length === 0"
          @click="handleApproveAll"
        >
          <CheckCircle2 :size="18" />
          <span>ACC Semua</span>
        </button>
      </div>
    </div>

    <div class="summary-grid">
      <article class="summary-card">
        <PackagePlus :size="24" />
        <div>
          <p>Total Antrean</p>
          <h2>{{ queue.length }}</h2>
        </div>
      </article>

      <article class="summary-card">
        <CheckCircle2 :size="24" />
        <div>
          <p>Terdaftar</p>
          <h2>{{ knownItems.length }}</h2>
        </div>
      </article>

      <article class="summary-card warning">
        <AlertTriangle :size="24" />
        <div>
          <p>Belum Terdaftar</p>
          <h2>{{ unknownItems.length }}</h2>
        </div>
      </article>
    </div>

    <div v-if="errorMessage" class="alert error">
      <span>{{ errorMessage }}</span>
      <button
        v-if="showRegisterPrompt"
        class="register-prompt-btn"
        type="button"
        @click="redirectToRegister(unregisteredBarcode)"
      >
        Daftarkan Barang Baru
      </button>
    </div>
    <div v-if="successMessage" class="alert success">{{ successMessage }}</div>

    <!-- Manual Restock Card -->
    <article class="manual-restock-card no-print">
      <div>
        <h3>Restock Manual</h3>
        <span>Input barcode & qty secara manual tanpa alat scan.</span>
      </div>
      <form class="manual-form" @submit.prevent="handleManualRestock">
        <div class="input-box">
          <input
            v-model="manualBarcode"
            type="text"
            placeholder="Scan / Ketik Barcode..."
            required
          />
        </div>
        <div class="input-box qty-box">
          <input
            v-model.number="manualQty"
            type="number"
            min="1"
            placeholder="Qty"
            required
          />
        </div>
        <button class="primary-button" type="submit" :disabled="actionLoading">
          Tambah Stok
        </button>
      </form>
    </article>

    <article class="queue-card">
      <div class="table-header">
        <div>
          <h2>Antrean Restock</h2>
          <p>Data berasal dari scanner barcode mode IN.</p>
        </div>

        <div class="table-badge">
          <ArrowDownToLine :size="17" />
          <span>Mode IN</span>
        </div>
      </div>

      <div v-if="loading" class="loading-state">
        <Loader2 class="spin" :size="30" />
        <span>Memuat antrean restock...</span>
      </div>

      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Barcode</th>
              <th>Nama Barang</th>
              <th>Scan Masuk</th>
              <th>Qty Aktual</th>
              <th>Waktu Scan</th>
              <th>Status</th>
              <th class="text-right">Aksi</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="item in queue" :key="item.barcode">
              <td>
                <code>{{ item.barcode }}</code>
              </td>

              <td>
                <strong>{{ item.nama_barang || 'Barang Belum Terdaftar' }}</strong>
                <span v-if="!item.item_id" class="register-hint">
                  Daftarkan dulu di Master Barang jika ingin dipakai.
                  <button
                    class="register-inline-btn"
                    type="button"
                    @click="redirectToRegister(item.barcode)"
                  >
                    Daftarkan
                  </button>
                </span>
              </td>

              <td>{{ item.jumlah_masuk }} scan</td>

              <td>
                <input
                  class="qty-input"
                  type="number"
                  min="1"
                  :value="qtyMap[item.barcode]"
                  :disabled="!item.item_id"
                  @input="updateQty(item.barcode, $event.target.value)"
                />
              </td>

              <td>{{ formatDateTime(item.waktu_scan_pertama) }}</td>

              <td>
                <span :class="['status-pill', item.item_id ? 'known' : 'unknown']">
                  {{ item.item_id ? 'Terdaftar' : 'Belum Terdaftar' }}
                </span>
              </td>

              <td class="text-right">
                <div class="action-group">
                  <button
                    class="small-button success"
                    type="button"
                    :disabled="actionLoading || !item.item_id"
                    title="ACC Restock"
                    @click="handleApproveItem(item)"
                  >
                    <CheckCircle2 :size="16" />
                  </button>

                  <button
                    class="small-button danger"
                    type="button"
                    :disabled="actionLoading"
                    title="Reject"
                    @click="handleReject(item)"
                  >
                    <Trash2 :size="16" />
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="queue.length === 0">
              <td colspan="7">
                <div class="empty-state">
                  <PackagePlus :size="34" />
                  <strong>Belum ada antrean barang masuk</strong>
                  <span>Scan barang dengan mode IN dari alat scanner agar muncul di sini.</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>
  </section>
</template>

<style scoped>
.restock-page {
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

.heading-actions {
  display: flex;
  gap: 10px;
}

.primary-button,
.secondary-button,
.small-button {
  border: 0;
  border-radius: 10px;
  font-weight: 900;
}

.primary-button,
.secondary-button {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
}

.primary-button {
  background: #2563eb;
  color: #ffffff;
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.18);
}

.secondary-button {
  background: #eff6ff;
  color: #2563eb;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
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

.summary-card.warning {
  color: #d97706;
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

.alert.success {
  background: #ecfdf5;
  color: #047857;
}

.queue-card {
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
  background: #ecfdf5;
  color: #047857;
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
  vertical-align: middle;
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
  display: block;
  color: #111827;
}

td span:not(.status-pill) {
  display: block;
  margin-top: 4px;
  color: #6b7280;
  font-size: 12px;
}

code {
  padding: 5px 8px;
  border-radius: 8px;
  background: #f3f4f6;
  color: #111827;
  font-weight: 800;
}

.qty-input {
  width: 96px;
  height: 38px;
  padding: 0 10px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  outline: none;
}

.qty-input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
}

.qty-input:disabled {
  background: #f3f4f6;
  color: #9ca3af;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 7px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 900;
}

.status-pill.known {
  background: #ecfdf5;
  color: #047857;
}

.status-pill.unknown {
  background: #fffbeb;
  color: #d97706;
}

.text-right {
  text-align: right;
}

.action-group {
  display: inline-flex;
  gap: 8px;
}

.small-button {
  width: 38px;
  height: 38px;
  display: inline-grid;
  place-items: center;
}

.small-button.success {
  background: #ecfdf5;
  color: #047857;
}

.small-button.danger {
  background: #fef2f2;
  color: #dc2626;
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

@media (max-width: 760px) {
  .page-heading,
  .table-header,
  .heading-actions {
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

  .summary-grid {
    grid-template-columns: 1fr;
  }

  .primary-button,
  .secondary-button {
    justify-content: center;
    width: 100%;
  }

  .manual-restock-card {
    flex-direction: column;
    align-items: stretch;
    gap: 14px;
  }

  .manual-form {
    flex-direction: column;
    align-items: stretch;
  }

  .manual-form .input-box.qty-box {
    width: 100%;
  }
}

.manual-restock-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px 20px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.06);
}

.manual-restock-card h3 {
  margin: 0 0 4px;
  color: #111827;
  font-size: 16px;
  font-weight: 800;
}

.manual-restock-card span {
  font-size: 12px;
  color: #6b7280;
}

.manual-form {
  display: flex;
  align-items: center;
  gap: 10px;
}

.manual-form .input-box {
  height: 42px;
  display: flex;
  align-items: center;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  padding: 0 12px;
  background: #f9fafb;
}

.manual-form .input-box.qty-box {
  width: 90px;
}

.manual-form input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  font-size: 14px;
  color: #111827;
}

.register-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.register-inline-btn {
  padding: 4px 8px;
  background: #eff6ff;
  color: #2563eb;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s ease;
}

.register-inline-btn:hover {
  background: #2563eb;
  color: #ffffff;
  border-color: #2563eb;
}

.alert.error {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.register-prompt-btn {
  padding: 6px 12px;
  background: #b91c1c;
  color: #ffffff;
  border: 0;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  transition: opacity 0.2s;
}

.register-prompt-btn:hover {
  opacity: 0.9;
}
</style>

