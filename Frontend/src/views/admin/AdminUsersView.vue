<script setup>
import { computed, onMounted, ref } from 'vue'
import {
  Edit3,
  IdCard,
  Loader2,
  Plus,
  RefreshCcw,
  RotateCcwKey,
  Search,
  Trash2,
  UserRound,
  UsersRound,
  X,
} from 'lucide-vue-next'
import { createUser, deleteUser, getUsers, resetUserPin, updateUser } from '../../api/userApi'
import { departments, getDepartmentIdByName } from '../../constants/departments'

const users = ref([])
const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const search = ref('')

const isModalOpen = ref(false)
const editingUser = ref(null)

const form = ref({
  nik: '',
  pin: '123456',
  nama: '',
  departemen_id: '',
  nama_leader: '',
  tipe_karyawan: 'tetap',
  role: 'karyawan',
})

const modalTitle = computed(() => (editingUser.value ? 'Edit Karyawan' : 'Tambah Karyawan'))

const filteredUsers = computed(() => {
  const keyword = search.value.toLowerCase().trim()
  if (!keyword) return users.value

  return users.value.filter((user) => {
    return (
      user.nik?.toLowerCase().includes(keyword) ||
      user.nama?.toLowerCase().includes(keyword) ||
      user.departemen?.toLowerCase().includes(keyword) ||
      user.role?.toLowerCase().includes(keyword)
    )
  })
})

const totalAdmin = computed(() => users.value.filter((user) => user.role === 'admin').length)
const totalKaryawan = computed(() => users.value.filter((user) => user.role === 'karyawan').length)

const clearMessage = () => {
  errorMessage.value = ''
  successMessage.value = ''
}

const resetForm = () => {
  form.value = {
    nik: '',
    pin: '123456',
    nama: '',
    departemen_id: '',
    nama_leader: '',
    tipe_karyawan: 'tetap',
    role: 'karyawan',
  }
  editingUser.value = null
}

const fetchUsers = async () => {
  loading.value = true
  clearMessage()

  try {
    const response = await getUsers()
    users.value = Array.isArray(response) ? response : response?.value || []
  } catch (error) {
    errorMessage.value =
      error.response?.data?.message ||
      error.response?.data?.error ||
      'Gagal mengambil data karyawan.'
  } finally {
    loading.value = false
  }
}

const openCreateModal = () => {
  clearMessage()
  resetForm()
  isModalOpen.value = true
}

const openEditModal = (user) => {
  clearMessage()
  editingUser.value = user

  form.value = {
    nik: user.nik || '',
    pin: '',
    nama: user.nama || '',
    departemen_id: getDepartmentIdByName(user.departemen),
    nama_leader: user.nama_leader || '',
    tipe_karyawan: user.tipe_karyawan || 'tetap',
    role: user.role || 'karyawan',
  }

  isModalOpen.value = true
}

const closeModal = () => {
  isModalOpen.value = false
  resetForm()
}

const handleSubmit = async () => {
  saving.value = true
  clearMessage()

  try {
    if (editingUser.value) {
      await updateUser(editingUser.value.id, {
        departemen_id: form.value.departemen_id || null,
        role: form.value.role,
        tipe_karyawan: form.value.tipe_karyawan,
        nama_leader: form.value.nama_leader || null,
      })

      successMessage.value = 'Data karyawan berhasil diperbarui.'
    } else {
      await createUser({
        nik: form.value.nik,
        pin: form.value.pin,
        nama: form.value.nama,
        departemen_id: form.value.departemen_id || null,
        nama_leader: form.value.nama_leader || null,
        tipe_karyawan: form.value.tipe_karyawan,
        role: form.value.role,
      })

      successMessage.value = 'Akun karyawan berhasil dibuat.'
    }

    closeModal()
    fetchUsers()
  } catch (error) {
    errorMessage.value =
      error.response?.data?.message ||
      error.response?.data?.error ||
      'Gagal menyimpan data karyawan.'
  } finally {
    saving.value = false
  }
}

const handleResetPin = async (user) => {
  const confirmed = confirm(`Reset PIN "${user.nama}" menjadi 123456?`)
  if (!confirmed) return

  loading.value = true
  clearMessage()

  try {
    await resetUserPin(user.id)
    successMessage.value = `PIN ${user.nama} berhasil di-reset menjadi 123456.`
  } catch (error) {
    errorMessage.value =
      error.response?.data?.message ||
      error.response?.data?.error ||
      'Gagal reset PIN karyawan.'
  } finally {
    loading.value = false
  }
}

const handleDelete = async (user) => {
  const confirmed = confirm(`Nonaktifkan akun "${user.nama}"?`)
  if (!confirmed) return

  loading.value = true
  clearMessage()

  try {
    await deleteUser(user.id, 'soft')
    successMessage.value = 'Akun berhasil dinonaktifkan.'
    fetchUsers()
  } catch (error) {
    errorMessage.value =
      error.response?.data?.message ||
      error.response?.data?.error ||
      'Gagal menonaktifkan akun.'
  } finally {
    loading.value = false
  }
}

onMounted(fetchUsers)
</script>

<template>
  <section class="users-page">
    <div class="page-heading">
      <div>
        <p>Access Control</p>
        <h1>Master Karyawan</h1>
        <span>Kelola akun, departemen, role akses, dan reset PIN.</span>
      </div>

      <button class="primary-button" type="button" @click="openCreateModal">
        <Plus :size="18" />
        <span>Tambah Karyawan</span>
      </button>
    </div>

    <div class="summary-grid">
      <article class="summary-card">
        <UsersRound :size="24" />
        <div>
          <p>Total Akun</p>
          <h2>{{ users.length }}</h2>
        </div>
      </article>

      <article class="summary-card">
        <IdCard :size="24" />
        <div>
          <p>Admin / HRGA</p>
          <h2>{{ totalAdmin }}</h2>
        </div>
      </article>

      <article class="summary-card">
        <UserRound :size="24" />
        <div>
          <p>Karyawan</p>
          <h2>{{ totalKaryawan }}</h2>
        </div>
      </article>
    </div>

    <div v-if="errorMessage" class="alert error">{{ errorMessage }}</div>
    <div v-if="successMessage" class="alert success">{{ successMessage }}</div>

    <article class="toolbar-card">
      <div class="search-box">
        <Search :size="18" />
        <input
          v-model="search"
          type="text"
          placeholder="Cari NIK, nama, departemen, atau role..."
        />
      </div>

      <button class="icon-button" type="button" title="Refresh" @click="fetchUsers">
        <RefreshCcw :size="18" />
      </button>
    </article>

    <article class="table-card">
      <div class="table-header">
        <div>
          <h2>Daftar Karyawan</h2>
          <p>Menampilkan {{ filteredUsers.length }} dari {{ users.length }} akun</p>
        </div>
      </div>

      <div v-if="loading" class="loading-state">
        <Loader2 class="spin" :size="28" />
        <span>Memuat data karyawan...</span>
      </div>

      <div v-else class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Profil</th>
              <th>NIK</th>
              <th>Nama</th>
              <th>Departemen</th>
              <th>Tipe</th>
              <th>Role</th>
              <th class="text-right">Aksi</th>
            </tr>
          </thead>

          <tbody>
            <tr v-for="user in filteredUsers" :key="user.id">
              <td>
                <img
                  v-if="user.foto_profil"
                  class="avatar-img"
                  :src="user.foto_profil"
                  :alt="user.nama"
                />
                <div v-else class="avatar-fallback">
                  {{ user.nama?.charAt(0) || 'U' }}
                </div>
              </td>

              <td>
                <code>{{ user.nik }}</code>
              </td>

              <td>
                <strong>{{ user.nama || '-' }}</strong>
              </td>

              <td>{{ user.departemen || '-' }}</td>

              <td>
                <span class="type-pill">{{ user.tipe_karyawan || '-' }}</span>
              </td>

              <td>
                <span :class="['role-pill', user.role === 'admin' ? 'admin' : 'karyawan']">
                  {{ user.role }}
                </span>
              </td>

              <td class="text-right">
                <div class="action-group">
                  <button class="small-button" type="button" title="Edit" @click="openEditModal(user)">
                    <Edit3 :size="16" />
                  </button>

                  <button class="small-button warning" type="button" title="Reset PIN" @click="handleResetPin(user)">
                    <RotateCcwKey :size="16" />
                  </button>

                  <button class="small-button danger" type="button" title="Nonaktifkan" @click="handleDelete(user)">
                    <Trash2 :size="16" />
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="filteredUsers.length === 0">
              <td colspan="7">
                <div class="empty-state">
                  <UsersRound :size="30" />
                  <strong>Data karyawan tidak ditemukan</strong>
                  <span>Coba ubah kata pencarian atau tambah akun baru.</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </article>

    <div v-if="isModalOpen" class="modal-backdrop">
      <form class="modal-card" @submit.prevent="handleSubmit">
        <div class="modal-header">
          <div>
            <p>Master Karyawan</p>
            <h2>{{ modalTitle }}</h2>
          </div>

          <button class="close-button" type="button" @click="closeModal">
            <X :size="20" />
          </button>
        </div>

        <div class="form-grid">
          <label class="form-group">
            <span>NIK</span>
            <input
              v-model="form.nik"
              type="text"
              placeholder="Contoh: SEC004"
              :disabled="!!editingUser"
              required
            />
          </label>

          <label v-if="!editingUser" class="form-group">
            <span>PIN Awal</span>
            <input v-model="form.pin" type="text" placeholder="123456" required />
          </label>

          <label class="form-group full">
            <span>Nama Karyawan</span>
            <input
              v-model="form.nama"
              type="text"
              placeholder="Nama lengkap"
              :disabled="!!editingUser"
              required
            />
          </label>

          <label class="form-group">
            <span>Departemen</span>
            <select v-model="form.departemen_id">
              <option value="">Pilih departemen</option>
              <option v-for="department in departments" :key="department.id" :value="department.id">
                {{ department.name }}
              </option>
            </select>
          </label>

          <label class="form-group">
            <span>Tipe Karyawan</span>
            <select v-model="form.tipe_karyawan">
              <option value="tetap">Tetap</option>
              <option value="kontrak">Kontrak</option>
              <option value="magang">Magang</option>
            </select>
          </label>

          <label class="form-group">
            <span>Role</span>
            <select v-model="form.role" required>
              <option value="karyawan">Karyawan</option>
              <option value="admin">Admin / HRGA</option>
            </select>
          </label>

          <label class="form-group">
            <span>Nama Leader</span>
            <input v-model="form.nama_leader" type="text" placeholder="Opsional" />
          </label>
        </div>

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
.users-page {
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

.small-button.warning {
  background: #fffbeb;
  color: #d97706;
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

.avatar-img,
.avatar-fallback {
  width: 44px;
  height: 44px;
  border-radius: 12px;
}

.avatar-img {
  object-fit: cover;
  border: 1px solid #e5e7eb;
}

.avatar-fallback {
  display: grid;
  place-items: center;
  background: #eff6ff;
  color: #2563eb;
  font-weight: 900;
  text-transform: uppercase;
}

.type-pill,
.role-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 82px;
  padding: 7px 10px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 900;
  text-transform: capitalize;
}

.type-pill {
  background: #f3f4f6;
  color: #374151;
}

.role-pill.admin {
  background: #eff6ff;
  color: #2563eb;
}

.role-pill.karyawan {
  background: #ecfdf5;
  color: #047857;
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
  width: min(680px, 100%);
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

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.form-group {
  display: grid;
  gap: 8px;
}

.form-group.full {
  grid-column: 1 / -1;
}

.form-group span {
  color: #374151;
  font-size: 14px;
  font-weight: 800;
}

.form-group input,
.form-group select {
  width: 100%;
  height: 44px;
  padding: 0 12px;
  border: 1px solid #d1d5db;
  border-radius: 10px;
  outline: none;
  background: #ffffff;
}

.form-group input:disabled {
  background: #f3f4f6;
  color: #6b7280;
}

.form-group input:focus,
.form-group select:focus {
  border-color: #2563eb;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
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
  .toolbar-card {
    align-items: stretch;
    flex-direction: column;
  }

  .summary-grid,
  .form-grid {
    grid-template-columns: 1fr;
  }

  .primary-button,
  .secondary-button {
    justify-content: center;
    width: 100%;
  }
}
</style>
