<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  CalendarDays,
  ImagePlus,
  Loader2,
  Minus,
  PackageSearch,
  Plus,
  RefreshCcw,
  Search,
  ShoppingCart,
  Trash2,
} from 'lucide-vue-next'
import { getItems } from '../../api/itemApi'
import { createRequest } from '../../api/requestApi'
import { useCartStore } from '../../stores/cartStore'

const cartStore = useCartStore()

const items = ref([])
const loading = ref(false)
const submitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const toastMessage = ref('')
const showToast = ref(false)
let toastTimer = null

const triggerToast = (message) => {
  toastMessage.value = message
  showToast.value = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    showToast.value = false
  }, 2500)
}

const search = ref('')
const page = ref(1)
const limit = ref(8)
const totalPages = ref(1)
const totalItems = ref(0)
const tglPengambilan = ref('')

const availableItems = computed(() => {
  return items.value
})

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
      'Gagal mengambil katalog barang.'
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  page.value = 1
  fetchItems()
}

const goToPage = (targetPage) => {
  if (targetPage < 1 || targetPage > totalPages.value || targetPage === page.value) return
  page.value = targetPage
  fetchItems()
}

const handleAddToCart = (item) => {
  clearMessage()
  cartStore.addToCart(item)
  triggerToast(`${item.nama_barang} berhasil ditambahkan ke keranjang!`)
}

const handleProofPhoto = (event, itemId) => {
  const file = event.target.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = () => {
    cartStore.updateProofPhoto(itemId, reader.result)
  }
  reader.readAsDataURL(file)
}

const validateCart = () => {
  if (cartStore.isEmpty) {
    errorMessage.value = 'Keranjang masih kosong.'
    return false
  }

  if (!tglPengambilan.value) {
    errorMessage.value = 'Tanggal pengambilan wajib dipilih.'
    return false
  }

  const invalidReasonItem = cartStore.items.find((item) => !item.alasan)
  if (invalidReasonItem) {
    errorMessage.value = `Alasan untuk ${invalidReasonItem.nama_barang} wajib diisi.`
    return false
  }

  const needPhotoItem = cartStore.items.find((item) => {
    const reason = item.alasan.toLowerCase()
    return (reason === 'rusak' || reason === 'hilang') && !item.foto_bukti
  })

  if (needPhotoItem) {
    errorMessage.value = `Foto bukti wajib diunggah untuk alasan ${needPhotoItem.alasan} pada ${needPhotoItem.nama_barang}.`
    return false
  }

  return true
}

const submitRequest = async () => {
  clearMessage()

  if (!validateCart()) return

  submitting.value = true

  try {
    await createRequest({
      tgl_pengambilan: tglPengambilan.value,
      keranjang: cartStore.items.map((item) => ({
        item_id: item.item_id,
        jumlah: item.jumlah,
        alasan: item.alasan,
        foto_bukti: item.foto_bukti || null,
      })),
    })

    cartStore.clearCart()
    tglPengambilan.value = ''
    successMessage.value = 'Request barang berhasil dikirim. Silakan cek status di menu Request Saya.'
    await fetchItems()
  } catch (error) {
    errorMessage.value =
      error.response?.data?.message ||
      error.response?.data?.error ||
      'Gagal mengirim request barang.'
  } finally {
    submitting.value = false
  }
}

onMounted(fetchItems)

</script>

<template>
  <section class="catalog-page">
    <div class="page-heading">
      <div>
        <p>Karyawan</p>
        <h1>Katalog Barang</h1>
        <span>Pilih barang yang tersedia, masukkan ke keranjang, lalu kirim request.</span>
      </div>

      <div class="cart-badge">
        <ShoppingCart :size="18" />
        <span>{{ cartStore.totalTypes }} jenis / {{ cartStore.totalItems }} item</span>
      </div>
    </div>

    <div v-if="errorMessage" class="alert error">{{ errorMessage }}</div>
    <div v-if="successMessage" class="alert success">{{ successMessage }}</div>

    <div class="main-grid">
      <section class="catalog-section">
        <article class="toolbar-card">
          <div class="search-box">
            <Search :size="18" />
            <input
              v-model="search"
              type="text"
              placeholder="Cari barang..."
              @keyup.enter="handleSearch"
            />
          </div>

          <button class="secondary-button" type="button" @click="handleSearch">
            Cari
          </button>

          <button class="icon-button" type="button" title="Refresh" @click="fetchItems">
            <RefreshCcw :size="18" />
          </button>
        </article>

        <div v-if="loading" class="loading-state">
          <Loader2 class="spin" :size="30" />
          <span>Memuat katalog...</span>
        </div>

        <div v-else class="items-grid">
          <article v-for="item in availableItems" :key="item.id" class="item-card">
            <img
              v-if="item.foto_barang"
              class="item-photo"
              :src="item.foto_barang"
              :alt="item.nama_barang"
            />

            <div v-else class="photo-placeholder">
              <PackageSearch :size="34" />
            </div>

            <div class="item-body">
              <span class="item-type">{{ item.jenis || 'Tanpa Kategori' }}</span>
              <h2>{{ item.nama_barang }}</h2>

              <div class="stock-row">
                <span>Stok tersedia</span>
                <strong>{{ item.stok_aktual }} pcs</strong>
              </div>
<button class="primary-button" type="button" @click="handleAddToCart(item)" :disabled="item.stok_aktual <= 0">
                <Plus v-if="item.stok_aktual > 0" :size="17" />
                {{ item.stok_aktual > 0 ? 'Tambah' : 'Stok Habis' }}
              </button>
            </div>
          </article>

          <div v-if="availableItems.length === 0" class="empty-state">
            <PackageSearch :size="34" />
            <strong>Barang tidak ditemukan</strong>
            <span>Coba ubah kata pencarian atau halaman.</span>
          </div>
        </div>

        <div class="pagination">
          <button type="button" :disabled="page <= 1" @click="goToPage(page - 1)">
            Sebelumnya
          </button>

          <span>Halaman {{ page }} dari {{ totalPages }} • Total {{ totalItems }}</span>

          <button type="button" :disabled="page >= totalPages" @click="goToPage(page + 1)">
            Berikutnya
          </button>
        </div>
      </section>

      <aside class="cart-panel">
        <div class="cart-header">
          <div>
            <p>Checkout</p>
            <h2>Keranjang Request</h2>
          </div>
          <ShoppingCart :size="24" />
        </div>

        <label class="pickup-date">
          <span>Tanggal Pengambilan</span>
          <div>
            <CalendarDays :size="18" />
            <input v-model="tglPengambilan" type="date" />
          </div>
        </label>

        <div class="cart-list">
          <article v-for="item in cartStore.items" :key="item.item_id" class="cart-item">
            <div class="cart-item-top">
              <div>
                <strong>{{ item.nama_barang }}</strong>
                <span>{{ item.jenis || '-' }} • Stok {{ item.stok_aktual }}</span>
              </div>

              <button class="delete-button" type="button" @click="cartStore.removeFromCart(item.item_id)">
                <Trash2 :size="16" />
              </button>
            </div>

            <div class="qty-row">
              <button type="button" @click="cartStore.updateQuantity(item.item_id, item.jumlah - 1)">
                <Minus :size="15" />
              </button>

              <input
                :value="item.jumlah"
                type="number"
                min="1"
                :max="item.stok_aktual"
                @input="cartStore.updateQuantity(item.item_id, $event.target.value)"
              />

              <button type="button" @click="cartStore.updateQuantity(item.item_id, item.jumlah + 1)">
                <Plus :size="15" />
              </button>
            </div>

            <label class="cart-field">
              <span>Alasan</span>
              <select
                :value="item.alasan"
                @change="cartStore.updateReason(item.item_id, $event.target.value)"
              >
                <option value="">Pilih alasan</option>
                <option value="Kebutuhan Baru">Kebutuhan Baru</option>
                <option value="Rusak">Rusak</option>
                <option value="Hilang">Hilang</option>
                <option value="Penggantian Berkala">Penggantian Berkala</option>
              </select>
            </label>

            <label class="file-field">
              <ImagePlus :size="17" />
              <span>{{ item.foto_bukti ? 'Foto bukti dipilih' : 'Upload foto bukti' }}</span>
              <input type="file" accept="image/*" @change="handleProofPhoto($event, item.item_id)" />
            </label>
          </article>

          <div v-if="cartStore.isEmpty" class="cart-empty">
            <ShoppingCart :size="32" />
            <strong>Keranjang kosong</strong>
            <span>Tambahkan barang dari katalog.</span>
          </div>
        </div>

        <button
          class="submit-button"
          type="button"
          :disabled="submitting || cartStore.isEmpty"
          @click="submitRequest"
        >
          {{ submitting ? 'Mengirim...' : 'Kirim Request' }}
        </button>
      </aside>
    </div>

    <!-- Floating Toast Notification -->
    <div class="toast-notification" :class="{ 'show': showToast }">
      <span>{{ toastMessage }}</span>
    </div>
  </section>
</template>

<style scoped>
.catalog-page {
  display: grid;
  gap: 20px;
}

.page-heading,
.main-grid,
.toolbar-card,
.cart-header,
.cart-item-top,
.stock-row,
.qty-row,
.pickup-date div,
.file-field,
.pagination {
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

.cart-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 14px;
  border-radius: 999px;
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

.alert.success {
  background: #ecfdf5;
  color: #047857;
}

.main-grid {
  align-items: flex-start;
  gap: 18px;
}

.catalog-section {
  flex: 1;
  min-width: 0;
}

.toolbar-card,
.cart-panel {
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.06);
}

.toolbar-card {
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
  padding: 16px;
}

.search-box {
  min-width: 220px;
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
}

.primary-button,
.secondary-button,
.icon-button,
.submit-button {
  border: 0;
  border-radius: 10px;
  font-weight: 900;
}

.primary-button,
.secondary-button,
.icon-button {
  height: 44px;
}

.primary-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  background: #2563eb;
  color: #ffffff;
}

.primary-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
  background: #9ca3af;
}

.secondary-button {
  padding: 0 16px;
  background: #eff6ff;
  color: #2563eb;
}

.icon-button {
  width: 44px;
  display: grid;
  place-items: center;
  background: #f3f4f6;
  color: #374151;
}

.loading-state,
.empty-state,
.cart-empty {
  min-height: 260px;
  display: grid;
  place-items: center;
  gap: 8px;
  text-align: center;
  color: #6b7280;
}

.empty-state,
.cart-empty {
  border: 1px dashed #d1d5db;
  border-radius: 16px;
  background: #ffffff;
}

.empty-state strong,
.cart-empty strong {
  color: #111827;
}

.items-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.item-card {
  overflow: hidden;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.06);
}

.item-photo,
.photo-placeholder {
  width: 100%;
  height: 170px;
}

.item-photo {
  object-fit: cover;
}

.photo-placeholder {
  display: grid;
  place-items: center;
  background: #f3f4f6;
  color: #9ca3af;
}

.item-body {
  display: grid;
  gap: 10px;
  padding: 16px;
}

.item-type {
  width: fit-content;
  padding: 6px 9px;
  border-radius: 999px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 12px;
  font-weight: 900;
}

.item-body h2 {
  margin: 0;
  color: #111827;
  font-size: 19px;
}

code {
  width: fit-content;
  padding: 5px 8px;
  border-radius: 8px;
  background: #f3f4f6;
  color: #111827;
  font-weight: 800;
}

.stock-row {
  align-items: center;
  justify-content: space-between;
  color: #6b7280;
}

.stock-row strong {
  color: #047857;
}

.cart-panel {
  position: sticky;
  top: 96px;
  width: 390px;
  padding: 18px;
}

.cart-header {
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  color: #2563eb;
}

.cart-header p {
  margin: 0 0 4px;
  color: #6b7280;
  font-size: 12px;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.cart-header h2 {
  margin: 0;
  color: #111827;
  font-size: 22px;
}

.pickup-date {
  display: grid;
  gap: 8px;
  margin-bottom: 14px;
}

.pickup-date span,
.cart-field span {
  color: #374151;
  font-size: 13px;
  font-weight: 900;
}

.pickup-date div {
  align-items: center;
  gap: 9px;
  height: 44px;
  padding: 0 12px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  color: #6b7280;
}

.pickup-date input {
  width: 100%;
  border: 0;
  outline: 0;
}

.cart-list {
  display: grid;
  gap: 12px;
  max-height: 570px;
  overflow-y: auto;
  padding-right: 4px;
}

.cart-item {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid #e5e7eb;
  border-radius: 14px;
  background: #f9fafb;
}

.cart-item-top {
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.cart-item strong {
  display: block;
  color: #111827;
}

.cart-item span {
  display: block;
  margin-top: 4px;
  color: #6b7280;
  font-size: 12px;
}

.delete-button {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 9px;
  background: #fef2f2;
  color: #dc2626;
}

.qty-row {
  align-items: center;
  gap: 8px;
}

.qty-row button {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 9px;
  background: #eff6ff;
  color: #2563eb;
}

.qty-row input {
  width: 100%;
  height: 36px;
  border: 1px solid #d1d5db;
  border-radius: 9px;
  text-align: center;
}

.cart-field {
  display: grid;
  gap: 7px;
}

.cart-field select {
  height: 40px;
  padding: 0 10px;
  border: 1px solid #d1d5db;
  border-radius: 9px;
  background: #ffffff;
}

.file-field {
  position: relative;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  padding: 0 10px;
  border: 1px dashed #93c5fd;
  border-radius: 10px;
  background: #eff6ff;
  color: #2563eb;
  font-weight: 900;
  overflow: hidden;
}

.file-field input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.submit-button {
  width: 100%;
  height: 48px;
  margin-top: 16px;
  background: #047857;
  color: #ffffff;
}

.submit-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.pagination {
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-top: 18px;
}

.pagination button {
  height: 38px;
  padding: 0 14px;
  border: 0;
  border-radius: 10px;
  background: #ffffff;
  color: #374151;
  font-weight: 900;
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
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

@media (max-width: 1080px) {
  .main-grid {
    flex-direction: column;
    align-items: stretch;
  }

  .cart-panel {
    position: static;
    width: 100%;
  }
}

@media (max-width: 760px) {
  .page-heading,
  .toolbar-card,
  .pagination {
    align-items: stretch;
    flex-direction: column;
  }

  .items-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .item-photo,
  .photo-placeholder {
    height: 115px;
  }

  .item-body {
    padding: 10px;
    gap: 6px;
  }

  .item-body h2 {
    font-size: 14px;
    line-height: 1.2;
  }

  .item-type {
    font-size: 10px;
    padding: 4px 8px;
  }

  .stock-row {
    font-size: 11px;
  }

  .secondary-button,
  .icon-button {
    width: 100%;
  }

  .toast-notification {
    left: 16px;
    right: 16px;
    bottom: 16px;
    text-align: center;
  }
}

.toast-notification {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 1000;
  background: #047857; /* nice green */
  color: #ffffff;
  padding: 12px 20px;
  border-radius: 12px;
  font-weight: 800;
  font-size: 14px;
  box-shadow: 0 10px 30px rgba(4, 120, 87, 0.35);
  transform: translateY(100px);
  opacity: 0;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
}

.toast-notification.show {
  transform: translateY(0);
  opacity: 1;
}
</style>
