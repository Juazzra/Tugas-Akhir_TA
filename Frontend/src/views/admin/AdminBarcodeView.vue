<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import JsBarcode from 'jsbarcode'
import {
  Barcode,
  CheckSquare,
  Loader2,
  Printer,
  RefreshCcw,
  Search,
  Square,
} from 'lucide-vue-next'
import { getItems } from '../../api/itemApi'

const items = ref([])
const selectedIds = ref([])
const copiesMap = ref({})
const loading = ref(false)
const errorMessage = ref('')
const search = ref('')

const selectedItems = computed(() => {
  return items.value.filter((item) => selectedIds.value.includes(item.id))
})

const barcodeRows = computed(() => {
  const rows = []

  selectedItems.value.forEach((item) => {
    const copies = Number(copiesMap.value[item.id] || 1)

    for (let index = 0; index < copies; index += 1) {
      rows.push({
        ...item,
        rowKey: `${item.id}-${index}`,
      })
    }
  })

  return rows
})

const fetchItems = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    const response = await getItems({
      search: search.value,
      page: 1,
      limit: 100,
    })

    items.value = response.data || []

    items.value.forEach((item) => {
      if (!copiesMap.value[item.id]) {
        copiesMap.value[item.id] = 1
      }
    })

    await nextTick()
    renderBarcodes()
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
  fetchItems()
}

const toggleItem = (item) => {
  if (selectedIds.value.includes(item.id)) {
    selectedIds.value = selectedIds.value.filter((id) => id !== item.id)
  } else {
    selectedIds.value.push(item.id)
  }
}

const selectAll = () => {
  selectedIds.value = items.value.map((item) => item.id)
}

const clearSelection = () => {
  selectedIds.value = []
}

const updateCopies = (itemId, value) => {
  const copies = Number(value)
  copiesMap.value[itemId] = copies > 0 ? copies : 1
}

const renderBarcodes = () => {
  const svgElements = document.querySelectorAll('.barcode-svg')

  svgElements.forEach((svg) => {
    const code = svg.dataset.code

    if (!code) return

    JsBarcode(svg, code, {
      format: 'CODE128',
      width: 1.8,
      height: 48,
      displayValue: true,
      fontSize: 13,
      margin: 4,
    })
  })
}

const handlePrint = async () => {
  await nextTick()
  renderBarcodes()

  const barcodeSheet = document.querySelector('.barcode-sheet')
  if (!barcodeSheet) return

  const printWindow = window.open('', '_blank', 'width=1000,height=800')

  if (!printWindow) {
    alert('Popup print diblokir browser. Izinkan popup untuk halaman ini.')
    return
  }

  printWindow.document.open()
  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>Barcode</title>
        <style>
          @page {
            size: A4;
            margin: 8mm;
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 0;
            background: #ffffff;
            font-family: Arial, sans-serif;
          }

          .barcode-sheet {
            width: 100%;
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 9mm;
          }

          .barcode-label {
            min-height: 46mm;
            display: grid;
            place-items: center;
            padding: 5mm;
            border: 1px solid #000000;
            page-break-inside: avoid;
            break-inside: avoid;
            text-align: center;
          }

          .barcode-label h3 {
            margin: 0;
            color: #000000;
            font-size: 13px;
            line-height: 1.2;
            font-weight: 800;
            text-transform: uppercase;
          }

          .barcode-label svg {
            width: 96%;
            max-width: 100%;
            height: auto;
          }

          .barcode-label p {
            margin: 0;
            color: #000000;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
          }
        </style>
      </head>
      <body>
        <div class="barcode-sheet">${barcodeSheet.innerHTML}</div>
        <script>
          window.onload = function () {
            window.focus()
            window.print()
          }
        <\/script>
      </body>
    </html>
  `)
  printWindow.document.close()
}

watch([selectedIds, copiesMap, barcodeRows], async () => {
  await nextTick()
  renderBarcodes()
}, { deep: true })

onMounted(fetchItems)
</script>

<template>
  <section class="barcode-page">
    <div class="page-heading">
      <div>
        <p>Barcode Label</p>
        <h1>Cetak Barcode</h1>
        <span>Pilih barang dari master data, tentukan jumlah label, lalu cetak barcode.</span>
      </div>

      <button
        class="primary-button no-print"
        type="button"
        :disabled="barcodeRows.length === 0"
        @click="handlePrint"
      >
        <Printer :size="18" />
        <span>Cetak Barcode</span>
      </button>
    </div>

    <div v-if="errorMessage" class="alert error no-print">
      {{ errorMessage }}
    </div>

    <div class="main-grid">
      <article class="selection-panel no-print">
        <div class="toolbar">
          <div class="search-box">
            <Search :size="18" />
            <input
              v-model="search"
              type="text"
              placeholder="Cari nama barang..."
              @keyup.enter="handleSearch"
            />
          </div>

          <button class="icon-button" type="button" @click="fetchItems">
            <RefreshCcw :size="18" />
          </button>
        </div>

        <div class="select-actions">
          <button class="secondary-button" type="button" @click="selectAll">
            Pilih Semua
          </button>

          <button class="secondary-button" type="button" @click="clearSelection">
            Bersihkan
          </button>
        </div>

        <div v-if="loading" class="loading-state">
          <Loader2 class="spin" :size="28" />
          <span>Memuat barang...</span>
        </div>

        <div v-else class="item-list">
          <button
            v-for="item in items"
            :key="item.id"
            :class="['item-row', selectedIds.includes(item.id) ? 'active' : '']"
            type="button"
            @click="toggleItem(item)"
          >
            <div class="check-icon">
              <CheckSquare v-if="selectedIds.includes(item.id)" :size="20" />
              <Square v-else :size="20" />
            </div>

            <div class="item-info">
              <strong>{{ item.nama_barang }}</strong>
              <span>{{ item.barcode }} • Stok {{ item.stok_aktual }}</span>
            </div>

            <input
              class="copies-input"
              type="number"
              min="1"
              :value="copiesMap[item.id] || 1"
              @click.stop
              @input="updateCopies(item.id, $event.target.value)"
            />
          </button>

          <div v-if="items.length === 0" class="empty-state">
            <Barcode :size="34" />
            <strong>Barang tidak ditemukan</strong>
            <span>Coba ubah kata pencarian.</span>
          </div>
        </div>
      </article>

      <article class="preview-panel">
        <div class="preview-header no-print">
          <div>
            <h2>Preview Label</h2>
            <p>{{ selectedItems.length }} barang dipilih • {{ barcodeRows.length }} label</p>
          </div>
        </div>

        <div class="barcode-sheet">
          <div v-for="row in barcodeRows" :key="row.rowKey" class="barcode-label">
            <h3>{{ row.nama_barang }}</h3>
            <svg class="barcode-svg" :data-code="row.barcode"></svg>
            <p>{{ row.jenis || 'Tanpa Kategori' }}</p>
          </div>

          <div v-if="barcodeRows.length === 0" class="empty-preview no-print">
            <Barcode :size="42" />
            <h2>Belum ada barcode</h2>
            <p>Pilih barang dari daftar kiri untuk melihat preview barcode.</p>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.barcode-page {
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
.secondary-button,
.icon-button {
  border: 0;
  border-radius: 10px;
  font-weight: 900;
}

.primary-button {
  min-height: 44px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  background: #2563eb;
  color: #ffffff;
  box-shadow: 0 12px 24px rgba(37, 99, 235, 0.18);
}

.primary-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.secondary-button {
  height: 40px;
  padding: 0 13px;
  background: #eff6ff;
  color: #2563eb;
}

.icon-button {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  background: #f3f4f6;
  color: #374151;
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
  display: grid;
  grid-template-columns: 390px 1fr;
  gap: 18px;
  align-items: start;
}

.selection-panel,
.preview-panel {
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.06);
}

.selection-panel {
  overflow: hidden;
}

.toolbar {
  display: flex;
  gap: 10px;
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
}

.search-box {
  flex: 1;
  height: 42px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 12px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  color: #6b7280;
}

.search-box input {
  width: 100%;
  border: 0;
  outline: 0;
}

.select-actions {
  display: flex;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid #e5e7eb;
}

.loading-state,
.empty-state,
.empty-preview {
  min-height: 260px;
  display: grid;
  place-items: center;
  gap: 8px;
  text-align: center;
  color: #6b7280;
}

.empty-state strong,
.empty-preview h2 {
  margin: 0;
  color: #111827;
}

.empty-preview p {
  margin: 0;
}

.item-list {
  display: grid;
  gap: 10px;
  max-height: 690px;
  overflow-y: auto;
  padding: 14px;
}

.item-row {
  width: 100%;
  display: grid;
  grid-template-columns: 24px 1fr 70px;
  align-items: center;
  gap: 12px;
  padding: 13px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #ffffff;
  text-align: left;
  transition: 0.2s ease;
}

.item-row.active,
.item-row:hover {
  border-color: #2563eb;
  background: #eff6ff;
}

.check-icon {
  color: #2563eb;
}

.item-info strong {
  display: block;
  color: #111827;
  font-size: 14px;
}

.item-info span {
  display: block;
  margin-top: 4px;
  color: #6b7280;
  font-size: 12px;
}

.copies-input {
  width: 70px;
  height: 36px;
  padding: 0 9px;
  border: 1px solid #d1d5db;
  border-radius: 9px;
  text-align: center;
}

.preview-panel {
  min-height: 720px;
  padding: 20px;
}

.preview-header {
  margin-bottom: 18px;
}

.preview-header h2 {
  margin: 0;
  color: #111827;
  font-size: 22px;
}

.preview-header p {
  margin: 4px 0 0;
  color: #6b7280;
  font-size: 13px;
}

.barcode-sheet {
  display: grid;
  grid-template-columns: repeat(2, minmax(260px, 1fr));
  gap: 14px;
}

.barcode-label {
  min-height: 132px;
  display: grid;
  place-items: center;
  padding: 12px;
  border: 1px dashed #9ca3af;
  border-radius: 12px;
  background: #ffffff;
  text-align: center;
  break-inside: avoid;
}

.barcode-label h3 {
  margin: 0;
  color: #111827;
  font-size: 13px;
  line-height: 1.3;
}

.barcode-svg {
  max-width: 100%;
}

.barcode-label p {
  margin: 0;
  color: #6b7280;
  font-size: 11px;
  font-weight: 700;
}

.spin {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1120px) {
  .main-grid {
    grid-template-columns: 1fr;
  }

  .barcode-sheet {
    grid-template-columns: repeat(2, minmax(180px, 1fr));
  }
}

@media (max-width: 700px) {
  .page-heading,
  .select-actions {
    align-items: stretch;
    flex-direction: column;
  }

  .primary-button,
  .secondary-button {
    justify-content: center;
    width: 100%;
  }

  .barcode-sheet {
    grid-template-columns: 1fr;
  }
}

@media print {
  :global(body) {
    background: #ffffff !important;
  }

  .no-print,
  .page-heading,
  .selection-panel {
    display: none !important;
  }

  .barcode-page,
  .main-grid,
  .preview-panel,
  .barcode-sheet {
    display: block !important;
    padding: 0 !important;
    margin: 0 !important;
    box-shadow: none !important;
    border: 0 !important;
  }

  .barcode-sheet {
    display: grid !important;
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 8mm !important;
  }

  .barcode-label {
    border: 1px solid #000 !important;
    border-radius: 0 !important;
    min-height: 32mm !important;
    padding: 4mm !important;
    page-break-inside: avoid;
  }
}

@media print {
  :global(.admin-layout) {
    display: block !important;
    background: #ffffff !important;
  }

  :global(.sidebar),
  :global(.topbar) {
    display: none !important;
  }

  :global(.main-area),
  :global(.content) {
    display: block !important;
    padding: 0 !important;
    margin: 0 !important;
    background: #ffffff !important;
  }

  .barcode-page {
    display: block !important;
    padding: 0 !important;
    margin: 0 !important;
    background: #ffffff !important;
  }

  .no-print,
  .page-heading,
  .selection-panel,
  .preview-header {
    display: none !important;
  }

  .main-grid,
  .preview-panel {
    display: block !important;
    padding: 0 !important;
    margin: 0 !important;
    border: 0 !important;
    box-shadow: none !important;
    background: #ffffff !important;
  }

  .barcode-sheet {
    display: grid !important;
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 8mm !important;
    padding: 0 !important;
    margin: 0 !important;
  }

  .barcode-label {
    border: 1px solid #000000 !important;
    border-radius: 0 !important;
    min-height: 32mm !important;
    padding: 4mm !important;
    page-break-inside: avoid;
    break-inside: avoid;
  }
}
</style>



@media print {
  @page {
    margin: 8mm;
  }

  :global(.mobile-header),
  :global(.topbar),
  :global(.sidebar),
  :global(.sidebar-backdrop),
  :global(.no-print),
  .no-print,
  .page-heading,
  .selection-panel,
  .preview-header {
    display: none !important;
    visibility: hidden !important;
  }

  :global(.admin-layout),
  :global(.main-area),
  :global(.content) {
    display: block !important;
    padding: 0 !important;
    margin: 0 !important;
    background: #ffffff !important;
  }

  .barcode-page,
  .main-grid,
  .preview-panel,
  .barcode-sheet {
    display: block !important;
    padding: 0 !important;
    margin: 0 !important;
    box-shadow: none !important;
    border: 0 !important;
    background: #ffffff !important;
  }

  .barcode-sheet {
    display: grid !important;
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 8mm !important;
  }

  .barcode-label {
    border: 1px solid #000000 !important;
    border-radius: 0 !important;
    min-height: 32mm !important;
    padding: 4mm !important;
    page-break-inside: avoid;
  }
}


@media print {
  @page {
    margin: 8mm;
  }

  :global(body *) {
    visibility: hidden !important;
  }

  .barcode-sheet,
  .barcode-sheet * {
    visibility: visible !important;
  }

  .barcode-sheet {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    width: 100% !important;
    display: grid !important;
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 8mm !important;
    padding: 0 !important;
    margin: 0 !important;
    background: #ffffff !important;
  }

  :global(.mobile-header),
  :global(.topbar),
  :global(.sidebar),
  :global(.sidebar-backdrop),
  :global(.no-print),
  .no-print,
  .page-heading,
  .selection-panel,
  .preview-header {
    display: none !important;
    visibility: hidden !important;
  }

  :global(.admin-layout),
  :global(.main-area),
  :global(.content),
  .barcode-page,
  .main-grid,
  .preview-panel {
    display: block !important;
    padding: 0 !important;
    margin: 0 !important;
    background: #ffffff !important;
    box-shadow: none !important;
    border: 0 !important;
  }

  .barcode-label {
    visibility: visible !important;
    border: 1px solid #000000 !important;
    border-radius: 0 !important;
    min-height: 32mm !important;
    padding: 4mm !important;
    page-break-inside: avoid;
    break-inside: avoid;
  }
}
