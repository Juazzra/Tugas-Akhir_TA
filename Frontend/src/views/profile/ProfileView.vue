<script setup>
import { onMounted, ref } from 'vue'
import {
  Camera,
  IdCard,
  KeyRound,
  Loader2,
  Save,
  ShieldCheck,
  UserRound,
} from 'lucide-vue-next'
import {
  changeMyPin,
  getMyProfile,
  updateMyProfile,
  uploadMyProfilePhoto,
} from '../../api/userApi'

const profile = ref(null)
const loading = ref(false)
const savingProfile = ref(false)
const savingPin = ref(false)
const uploadingPhoto = ref(false)
const errorMessage = ref('')
const successMessage = ref('')

const profileForm = ref({
  nama_leader: '',
})

const pinForm = ref({
  pin_lama: '',
  pin_baru: '',
  konfirmasi_pin: '',
})

const clearMessage = () => {
  errorMessage.value = ''
  successMessage.value = ''
}

const fetchProfile = async () => {
  loading.value = true
  clearMessage()

  try {
    const response = await getMyProfile()
    profile.value = response
    profileForm.value.nama_leader = response?.nama_leader || ''
  } catch (error) {
    errorMessage.value =
      error.response?.data?.message ||
      error.response?.data?.error ||
      'Gagal mengambil data profil.'
  } finally {
    loading.value = false
  }
}

const handleUpdateProfile = async () => {
  savingProfile.value = true
  clearMessage()

  try {
    await updateMyProfile({
      nama_leader: profileForm.value.nama_leader,
    })

    successMessage.value = 'Profil berhasil diperbarui.'
    await fetchProfile()
  } catch (error) {
    errorMessage.value =
      error.response?.data?.message ||
      error.response?.data?.error ||
      'Gagal memperbarui profil.'
  } finally {
    savingProfile.value = false
  }
}

const handleChangePin = async () => {
  clearMessage()

  if (pinForm.value.pin_baru !== pinForm.value.konfirmasi_pin) {
    errorMessage.value = 'Konfirmasi PIN baru tidak sama.'
    return
  }

  savingPin.value = true

  try {
    await changeMyPin({
      pin_lama: pinForm.value.pin_lama,
      pin_baru: pinForm.value.pin_baru,
    })

    pinForm.value = {
      pin_lama: '',
      pin_baru: '',
      konfirmasi_pin: '',
    }

    successMessage.value = 'PIN berhasil diubah.'
  } catch (error) {
    errorMessage.value =
      error.response?.data?.message ||
      error.response?.data?.error ||
      'Gagal mengganti PIN.'
  } finally {
    savingPin.value = false
  }
}

const handlePhotoChange = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return

  uploadingPhoto.value = true
  clearMessage()

  try {
    const reader = new FileReader()

    reader.onload = async () => {
      try {
        await uploadMyProfilePhoto(reader.result)
        successMessage.value = 'Foto profil berhasil diperbarui.'
        await fetchProfile()
      } catch (error) {
        errorMessage.value =
          error.response?.data?.message ||
          error.response?.data?.error ||
          'Gagal upload foto profil.'
      } finally {
        uploadingPhoto.value = false
      }
    }

    reader.readAsDataURL(file)
  } catch {
    uploadingPhoto.value = false
    errorMessage.value = 'Gagal membaca file foto.'
  }
}

onMounted(fetchProfile)
</script>

<template>
  <section class="profile-page">
    <div class="page-heading">
      <div>
        <p>Akun</p>
        <h1>Profil Saya</h1>
        <span>Kelola foto profil, nama leader, dan PIN akun.</span>
      </div>
    </div>

    <div v-if="errorMessage" class="alert error">{{ errorMessage }}</div>
    <div v-if="successMessage" class="alert success">{{ successMessage }}</div>

    <div v-if="loading" class="loading-state">
      <Loader2 class="spin" :size="30" />
      <span>Memuat profil...</span>
    </div>

    <div v-else class="profile-grid">
      <article class="profile-card">
        <div class="photo-wrap">
          <img
            v-if="profile?.foto_profil"
            class="profile-photo"
            :src="profile.foto_profil"
            :alt="profile?.nama"
          />

          <div v-else class="photo-placeholder">
            <UserRound :size="42" />
          </div>

          <label class="photo-button">
            <Camera :size="17" />
            <span>{{ uploadingPhoto ? 'Uploading...' : 'Ganti Foto' }}</span>
            <input type="file" accept="image/*" @change="handlePhotoChange" />
          </label>
        </div>

        <div class="identity">
          <h2>{{ profile?.nama || 'User' }}</h2>
          <p>{{ profile?.nik }}</p>
        </div>

        <div class="info-list">
          <div class="info-row">
            <IdCard :size="19" />
            <div>
              <span>Departemen</span>
              <strong>{{ profile?.nama_dept || profile?.departemen || '-' }}</strong>
            </div>
          </div>

          <div class="info-row">
            <ShieldCheck :size="19" />
            <div>
              <span>Role</span>
              <strong>{{ profile?.role || '-' }}</strong>
            </div>
          </div>
        </div>
      </article>

      <div class="form-column">
        <form class="form-card" @submit.prevent="handleUpdateProfile">
          <div class="form-header">
            <UserRound :size="22" />
            <div>
              <h2>Data Profil</h2>
              <p>Karyawan hanya dapat mengubah nama leader.</p>
            </div>
          </div>

          <label class="form-group">
            <span>Nama Leader</span>
            <input
              v-model="profileForm.nama_leader"
              type="text"
              placeholder="Masukkan nama leader"
            />
          </label>

          <button class="primary-button" type="submit" :disabled="savingProfile">
            <Save :size="18" />
            {{ savingProfile ? 'Menyimpan...' : 'Simpan Profil' }}
          </button>
        </form>

        <form class="form-card" @submit.prevent="handleChangePin">
          <div class="form-header">
            <KeyRound :size="22" />
            <div>
              <h2>Ganti PIN</h2>
              <p>Gunakan PIN lama untuk membuat PIN baru.</p>
            </div>
          </div>

          <label class="form-group">
            <span>PIN Lama</span>
            <input
              v-model="pinForm.pin_lama"
              type="password"
              placeholder="Masukkan PIN lama"
              required
            />
          </label>

          <label class="form-group">
            <span>PIN Baru</span>
            <input
              v-model="pinForm.pin_baru"
              type="password"
              placeholder="Masukkan PIN baru"
              required
            />
          </label>

          <label class="form-group">
            <span>Konfirmasi PIN Baru</span>
            <input
              v-model="pinForm.konfirmasi_pin"
              type="password"
              placeholder="Ulangi PIN baru"
              required
            />
          </label>

          <button class="primary-button" type="submit" :disabled="savingPin">
            <KeyRound :size="18" />
            {{ savingPin ? 'Menyimpan...' : 'Ganti PIN' }}
          </button>
        </form>
      </div>
    </div>
  </section>
</template>

<style scoped>
.profile-page {
  display: grid;
  gap: 20px;
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

.loading-state {
  min-height: 320px;
  display: grid;
  place-items: center;
  gap: 10px;
  color: #6b7280;
}

.profile-grid {
  display: grid;
  grid-template-columns: 340px 1fr;
  gap: 18px;
  align-items: start;
}

.profile-card,
.form-card {
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 14px 36px rgba(15, 23, 42, 0.06);
}

.profile-card {
  display: grid;
  gap: 18px;
  padding: 22px;
}

.photo-wrap {
  display: grid;
  place-items: center;
  gap: 14px;
}

.profile-photo,
.photo-placeholder {
  width: 148px;
  height: 148px;
  border-radius: 24px;
}

.profile-photo {
  object-fit: cover;
  border: 1px solid #e5e7eb;
}

.photo-placeholder {
  display: grid;
  place-items: center;
  background: #eff6ff;
  color: #2563eb;
}

.photo-button {
  position: relative;
  height: 42px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  border-radius: 10px;
  background: #2563eb;
  color: #ffffff;
  font-weight: 900;
  overflow: hidden;
  cursor: pointer;
}

.photo-button input {
  position: absolute;
  inset: 0;
  opacity: 0;
  cursor: pointer;
}

.identity {
  text-align: center;
}

.identity h2 {
  margin: 0;
  color: #111827;
  font-size: 24px;
}

.identity p {
  margin: 6px 0 0;
  color: #6b7280;
  font-weight: 800;
}

.info-list {
  display: grid;
  gap: 10px;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px;
  border-radius: 12px;
  background: #f9fafb;
  color: #2563eb;
}

.info-row span {
  display: block;
  color: #6b7280;
  font-size: 12px;
  font-weight: 800;
}

.info-row strong {
  display: block;
  margin-top: 3px;
  color: #111827;
  text-transform: capitalize;
}

.form-column {
  display: grid;
  gap: 18px;
}

.form-card {
  display: grid;
  gap: 16px;
  padding: 22px;
}

.form-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  color: #2563eb;
}

.form-header h2 {
  margin: 0;
  color: #111827;
  font-size: 22px;
}

.form-header p {
  margin: 4px 0 0;
  color: #6b7280;
  font-size: 13px;
}

.form-group {
  display: grid;
  gap: 8px;
}

.form-group span {
  color: #374151;
  font-size: 14px;
  font-weight: 900;
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

.primary-button {
  width: fit-content;
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

.primary-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.spin {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 920px) {
  .profile-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .primary-button {
    justify-content: center;
    width: 100%;
  }
}
</style>
