<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  Boxes,
  Edit3,
  FileDown,
  ImagePlus,
  Loader2,
  PackagePlus,
  RefreshCcw,
  Search,
  Trash2,
  X,
} from 'lucide-vue-next'
import { createItem, deleteItem, getItems, updateItem } from '../../api/itemApi'
import { exportToCsv } from '../../utils/exportCsv'

const route = useRoute()
const items = ref([])
const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const search = ref('')
const page = ref(1)
const limit = ref(5)
const totalItems = ref(0)
const totalPages = ref(1)

const isModalOpen = ref(false)
const editingItem = ref(null)

const form = ref({
  barcode: '',
  nama_barang: '',
  jenis: '',
  stok_aktual: 0,
  foto_base64: '',
  stok_min: 0,
  stok_safety: 0,
  stok_max: 0,
  rata_kebutuhan_bulanan: 0,
  harga_per_unit: 0,
})

const modalTitle = computed(() => (editingItem.value ? 'Edit Barang' : 'Tambah Barang'))

const resetForm = () => {
  form.value = {
    barcode: '',
    nama_barang: '',
    jenis: '',
    stok_aktual: 0,
    foto_base64: '',
    stok_min: 0,
    stok_safety: 0,
    stok_max: 0,
    rata_kebutuhan_bulanan: 0,
    harga_per_unit: 0,
  }
  editingItem.value = null
}

const clearMessage = () => {
  errorMessage.value = ''
  successMessage.value = ''
}

const fetchItems = async () => {
  loading.value = true
  clearMessage()

  try {
    const response = await getItems({
      search: search.value,
      page: page.value,
      limit: limit.value,
    })

    items.value = response.data || []
    totalItems.value = response.totalItems || 0
    totalPages.value = response.totalPages || 1
    page.value = response.currentPage || 1
  } catch (error) {
    errorMessage.value =
      error.response?.data?.message ||
      error.response?.data?.error ||
      'Gagal mengambil data barang.'
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  page.value = 1
  fetchItems()
}

const handleExportCsv = () => {
  const rows = items.value.map((item) => ({
    barcode: item.barcode || '',
    nama_barang: item.nama_barang || '',
    jenis: item.jenis || '',
    stok_aktual: item.stok_aktual ?? 0,
    stok_min: item.stok_min ?? 0,
    stok_safety: item.stok_safety ?? 0,
    stok_max: item.stok_max ?? 0,
    rata_kebutuhan_bulanan: item.rata_kebutuhan_bulanan ?? 0,
    harga_per_unit: item.harga_per_unit ?? 0,
    status: item.is_active ? 'Aktif' : 'Nonaktif',
    foto_barang: item.foto_barang || '',
    created_at: item.created_at || '',
    updated_at: item.updated_at || '',
  }))

  exportToCsv(`master-barang-page-${page.value}.csv`, rows)
}

const openCreateModal = () => {
  clearMessage()
  resetForm()
  isModalOpen.value = true
}

const openEditModal = (item) => {
  clearMessage()
  editingItem.value = item
  form.value = {
    barcode: item.barcode || '',
    nama_barang: item.nama_barang || '',
    jenis: item.jenis || '',
    stok_aktual: item.stok_aktual || 0,
    foto_base64: '',
    stok_min: item.stok_min || 0,
    stok_safety: item.stok_safety || 0,
    stok_max: item.stok_max || 0,
    rata_kebutuhan_bulanan: item.rata_kebutuhan_bulanan || 0,
    harga_per_unit: item.harga_per_unit || 0,
  }
  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
  resetForm()
}

const handleFileChange = (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    form.value.foto_base64 = reader.result
  }
  reader.readAsDataURL(file)
}

const handleSubmit = async () => {
  saving.value = true
  clearMessage()

  try {
    if (editingItem.value) {
      await updateItem(editingItem.value.id, {
        barcode: form.value.barcode,
        nama_barang: form.value.nama_barang,
        jenis: form.value.jenis,
        foto_base64: form.value.foto_base64,
        stok_min: Number(form.value.stok_min) || 0,
        stok_safety: Number(form.value.stok_safety) || 0,
        stok_max: Number(form.value.stok_max) || 0,
        rata_kebutuhan_bulanan: Number(form.value.rata_kebutuhan_bulanan) || 0,
        harga_per_unit: Number(form.value.harga_per_unit) || 0,
      })

      successMessage.value = 'Data barang berhasil diperbarui.'
    } else {
      await createItem({
        barcode: form.value.barcode,
        nama_barang: form.value.nama_barang,
        jenis: form.value.jenis,
        stok_aktual: Number(form.value.stok_aktual) || 0,
        foto_base64: form.value.foto_base64,
        stok_min: Number(form.value.stok_min) || 0,
        stok_safety: Number(form.value.stok_safety) || 0,
        stok_max: Number(form.value.stok_max) || 0,
        rata_kebutuhan_bulanan: Number(form.value.rata_kebutuhan_bulanan) || 0,
        harga_per_unit: Number(form.value.harga_per_unit) || 0,
      })

      successMessage.value = 'Barang baru berhasil ditambahkan.'
    }

    closeModal()
    fetchItems()
  } catch (error) {
    errorMessage.value =
      error.response?.data?.message ||
      error.response?.data?.error ||
      'Gagal menyimpan data barang.'
  } finally {
    saving.value = false
  }
}

const handleDelete = async (item) => {
  const confirmed = confirm(`Hapus barang "${item.nama_barang}" dari katalog?`)
  if (!confirmed) return

  loading.value = true
  clearMessage()

  try {
    await deleteItem(item.id)
    successMessage.value = 'Barang berhasil dihapus dari katalog.'
    fetchItems()
  } catch (error) {
    errorMessage.value =
      error.response?.data?.message ||
      error.response?.data?.error ||
      'Gagal menghapus barang.'
  } finally {
    loading.value = false
  }
}

const goToPage = (targetPage) => {
  if (targetPage < 1 || targetPage > totalPages.value || targetPage === page.value) return
  page.value = targetPage
  fetchItems()
}

onMounted(() => {
  fetchItems()
  if (route.query.addBarcode) {
    openCreateModal()
    form.value.barcode = route.query.addBarcode
  }
})

watch(
  () => route.query.addBarcode,
  (newBarcode) => {
    if (newBarcode) {
      openCreateModal()
      form.value.barcode = newBarcode
    }
  }
)

const formatPrice = (value) => {
  if (value === undefined || value === null) return 'Rp 0'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value)
}
</script>

<template>
  <section class="items-page">
    <div class="page-heading">
      <div>
        <p>Inventory</p>
        <h1>Master Barang</h1>
        <span>Kelola barcode, nama barang, jenis, stok, dan foto barang.</span>
      </div>

      <button class="primary-button" type="button" @click="openCreateModal">
        <PackagePlus :size="18" />
        <span>Tambah Barang</span>
      </button>
    </div>

    <div v-if="errorMessage" class="alert error">{{ errorMessage }}</div>
    <div v-if="successMessage" class="alert success">{{ successMessage }}</div>

    <article class="toolbar-card">
      <div class="search-box">
        <Search :size="18" />
        <input
          v-model="search"
          type="text"
          placeholder="Cari nama barang..."
          @keyup.enter="handleSearch"
        />
      </div>

      <button class="secondary-button" type="button" @click="handleSearch">
        Cari
      </button>

      <button class="secondary-button" type="button" @click="handleExportCsv">
        <FileDown :size="18" />
        Export CSV
      </button>

      <button class="icon-button" type="button" title="Refresh" @click="fetchItems">
        <RefreshCcw :size="18" />
      </button>
    </article>

    <article class="table-card">
      <div class="table-header">
        <div>
          <h2>Daftar Barang</h2>
          <p>Total {{ totalItems }} barang aktif</p>
        </div>

        <div class="table-badge">
          <Boxes :size="17" />
          <span>Page {{ page }} / {{ totalPages }}</span>
        </div>
      </div>

      <div v-if="loading" class="loading-state">
        <Loader2 class="spin" :size="28" />
        <span>Memuat data barang...</span>
      </div>

      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Foto</th>
              <th>Barcode</th>
              <th>Nama Barang</th>
              <th>Jenis</th>
              <th>Stok</th>
              <th>Harga/Unit</th>
              <th>Status</th>
              <th class="text-right">Aksi</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="item in items" :key="item.id">
              <td>
                <img
                  v-if="item.foto_barang"
                  class="item-photo"
                  :src="item.foto_barang"
                  :alt="item.nama_barang"
                />
                <div v-else class="photo-placeholder">
                  <Boxes :size="18" />
                </div>
              </td>

              <td>
                <code>{{ item.barcode || '-' }}</code>
              </td>

              <td>
                <strong>{{ item.nama_barang || '-' }}</strong>
              </td>

              <td>{{ item.jenis || '-' }}</td>

              <td>
                <div class="stock-info">
                  <span :class="['stock-pill', item.stok_aktual < item.stok_min ? 'danger' : (item.stok_aktual < item.stok_safety ? 'warning' : 'safe')]">
                    {{ item.stok_aktual }} pcs
                  </span>
                  <div class="stock-limits">
                    Min: {{ item.stok_min || 0 }} | Max: {{ item.stok_max || 0 }}
                  </div>
                </div>
              </td>

              <td>
                <strong>{{ formatPrice(item.harga_per_unit) }}</strong>
              </td>

              <td>
                <span class="status-pill">Aktif</span>
              </td>

              <td class="text-right">
                <div class="action-group">
                  <button class="small-button" type="button" @click="openEditModal(item)">
                    <Edit3 :size="16" />
                  </button>

                  <button class="small-button danger" type="button" @click="handleDelete(item)">
                    <Trash2 :size="16" />
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="items.length === 0">
              <td colspan="8">
                <div class="empty-state">
                  <Boxes :size="30" />
                  <strong>Data barang belum ditemukan</strong>
                  <span>Coba ubah kata pencarian atau tambah barang baru.</span>
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

    <div v-if="isModalOpen" class="modal-backdrop">
      <form class="modal-card" @submit.prevent="handleSubmit">
        <div class="modal-header">
          <div>
            <p>Master Barang</p>
            <h2>{{ modalTitle }}</h2>
          </div>

          <button class="close-button" type="button" @click="closeModal">
            <X :size="20" />
          </button>
        </div>

        <label class="form-group">
          <span>Barcode</span>
          <input v-model="form.barcode" type="text" placeholder="Contoh: 5E01A902" required />
        </label>

        <label class="form-group">
          <span>Nama Barang</span>
          <input v-model="form.nama_barang" type="text" placeholder="Contoh: Helm Safety" required />
        </label>

        <label class="form-group">
          <span>Jenis / Kategori</span>
          <input v-model="form.jenis" type="text" placeholder="Contoh: APD" />
        </label>

        <label v-if="!editingItem" class="form-group">
          <span>Stok Awal</span>
          <input v-model="form.stok_aktual" type="number" min="0" placeholder="0" />
        </label>

        <div class="form-row">
          <label class="form-group">
            <span>Stok Min</span>
            <input v-model="form.stok_min" type="number" min="0" placeholder="0" />
          </label>
          <label class="form-group">
            <span>Safety Stock</span>
            <input v-model="form.stok_safety" type="number" min="0" placeholder="0" />
          </label>
          <label class="form-group">
            <span>Stok Max</span>
            <input v-model="form.stok_max" type="number" min="0" placeholder="0" />
          </label>
        </div>

        <div class="form-row">
          <label class="form-group">
            <span>Rata-rata Kebutuhan / Bulan</span>
            <input v-model="form.rata_kebutuhan_bulanan" type="number" min="0" placeholder="0" />
          </label>
          <label class="form-group">
            <span>Harga / Unit (Rp)</span>
            <input v-model="form.harga_per_unit" type="number" min="0" placeholder="0" />
          </label>
        </div>

        <label class="form-group">
          <span>Foto Barang</span>
          <div class="file-input">
            <ImagePlus :size="18" />
            <input type="file" accept="image/*" @change="handleFileChange" />
          </div>
          <small v-if="form.foto_base64">Foto sudah dipilih.</small>
        </label>

        <div class="modal-actions">
          <button class="secondary-button" type="button" @click="closeModal">
            Batal
          </button>

          <button class="primary-button" type="submit" :disabled="saving">
            {{ saving ? 'Menyimpan...' : 'Simpan' }}
          </button>
        </div>
      </form>
    </div>
  </section>
</template>

<style scoped>
.items-page {
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

.primary-button,
.secondary-button,
.icon-button,
.small-button {
  border: 0;
  border-radius: 10px;
  font-weight: 800;
}

.primary-button {
  height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 0 16px;
  background: #2563eb;
  color: #ffffff;
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.22);
}

.secondary-button {
  height: 44px;
  padding: 0 16px;
  background: #eff6ff;
  color: #2563eb;
}

.icon-button,
.small-button {
  width: 42px;
  height: 42px;
  display: inline-grid;
  place-items: center;
  background: #f3f4f6;
  color: #374151;
}

.small-button.danger {
  background: #fef2f2;
  color: #dc2626;
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

.toolbar-card,
.table-card {
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #ffffff;
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.06);
}

.toolbar-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
}

.search-box {
  min-width: 240px;
  flex: 1;
  height: 44px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  color: #6b7280;
}

.search-box input {
  width: 100%;
  border: 0;
  outline: 0;
  color: #111827;
}

.table-card {
  overflow: hidden;
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
  font-weight: 800;
}

.loading-state,
.empty-state {
  min-height: 220px;
  display: grid;
  place-items: center;
  text-align: center;
  color: #6b7280;
}

.loading-state {
  gap: 10px;
}

.spin {
  animation: spin 0.9s linear infinite;
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
  padding: 14px 16px;
  border-bottom: 1px solid #f1f5f9;
  text-align: left;
  vertical-align: middle;
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

code {
  padding: 5px 8px;
  border-radius: 8px;
  background: #f3f4f6;
  color: #111827;
  font-weight: 800;
}

.text-right {
  text-align: right;
}

.action-group {
  display: inline-flex;
  gap: 8px;
}

.item-photo,
.photo-placeholder {
  width: 46px;
  height: 46px;
  border-radius: 10px;
}

.item-photo {
  object-fit: cover;
  border: 1px solid #e5e7eb;
}

.photo-placeholder {
  display: grid;
  place-items: center;
  background: #f3f4f6;
  color: #9ca3af;
}

.stock-pill,
.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 70px;
  padding: 7px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 900;
}

.stock-pill.safe {
  background: #ecfdf5;
  color: #047857;
}

.stock-pill.danger {
  background: #fef2f2;
  color: #dc2626;
}

.status-pill {
  background: #eff6ff;
  color: #2563eb;
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
  font-weight: 800;
}

.pagination button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.pagination span {
  color: #6b7280;
  font-size: 13px;
  font-weight: 700;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.55);
}

.modal-card {
  width: min(520px, 100%);
  padding: 22px;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 28px 80px rgba(15, 23, 42, 0.32);
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 18px;
}

.modal-header p {
  margin: 0 0 4px;
  color: #2563eb;
  font-size: 12px;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.modal-header h2 {
  margin: 0;
  color: #111827;
  font-size: 24px;
}

.close-button {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 10px;
  background: #f3f4f6;
  color: #374151;
}

.form-group {
  display: grid;
  gap: 8px;
  margin-bottom: 14px;
}

.form-group span {
  color: #374151;
  font-size: 14px;
  font-weight: 800;
}

.form-group input {
  width: 100%;
  height: 44px;
  padding: 0 12px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  outline: none;
}

.form-group input:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
}

.form-group small {
  color: #047857;
  font-weight: 700;
}

.file-input {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 9px 12px;
  border: 1px dashed #93c5fd;
  border-radius: 10px;
  background: #eff6ff;
  color: #2563eb;
}

.file-input input {
  height: auto;
  padding: 0;
  border: 0;
  box-shadow: none;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 760px) {
  .page-heading,
  .toolbar-card,
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

.form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
}

.stock-limits {
  font-size: 11px;
  color: #6b7280;
  margin-top: 4px;
}

.stock-pill.warning {
  background: #fffbeb;
  color: #d97706;
}
</style>

