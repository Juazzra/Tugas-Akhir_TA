<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Package, Lock, UserRound } from 'lucide-vue-next'
import { useAuthStore } from '../../stores/authStore'

const router = useRouter()
const authStore = useAuthStore()

const form = ref({
  nik: '',
  pin: '',
})

const showPin = ref(false)

const handleLogin = async () => {
  try {
    const user = await authStore.login({
      nik: form.value.nik,
      pin: form.value.pin,
    })

    if (user?.role === 'admin') {
      router.push('/admin/dashboard')
    } else {
      router.push('/client/catalog')
    }
  } catch (error) {
    console.error(error)
  }
}
</script>

<template>
  <main class="login-page">
    <section class="login-left">
      <div class="brand-card">
        <div class="brand-icon">
          <Package :size="34" />
        </div>

        <p class="brand-label">Warehouse Management System</p>
        <h1>Sistem Pengelolaan Stok Barang</h1>
        <p class="brand-desc">
          Kelola stok, request barang, approval, dan serah terima dengan akses multi-user
          serta sinkronisasi real-time.
        </p>

        <div class="feature-list">
          <div class="feature-item">Admin Dashboard</div>
          <div class="feature-item">Client Request Page</div>
          <div class="feature-item">Barcode Scanner Ready</div>
        </div>
      </div>
    </section>

    <section class="login-right">
      <form class="login-card" @submit.prevent="handleLogin">
        <div class="login-header">
          <div class="small-icon">
            <Lock :size="22" />
          </div>
          <h2>Masuk Akun</h2>
          <p>Gunakan NIK dan PIN yang sudah terdaftar.</p>
        </div>

        <div v-if="authStore.error" class="alert-error">
          {{ authStore.error }}
        </div>

        <label class="form-group">
          <span>NIK</span>
          <div class="input-wrap">
            <UserRound :size="18" />
            <input
              v-model="form.nik"
              type="text"
              placeholder="Masukkan NIK"
              autocomplete="username"
              required
            />
          </div>
        </label>

        <label class="form-group">
          <span>PIN</span>
          <div class="input-wrap">
            <Lock :size="18" />
            <input
              v-model="form.pin"
              :type="showPin ? 'text' : 'password'"
              placeholder="Masukkan PIN"
              autocomplete="current-password"
              required
            />
            <button type="button" class="toggle-pin" @click="showPin = !showPin">
              {{ showPin ? 'Hide' : 'Show' }}
            </button>
          </div>
        </label>

        <button class="login-button" type="submit" :disabled="authStore.loading">
          {{ authStore.loading ? 'Memproses...' : 'Login' }}
        </button>

        <p class="login-note">
          Akses halaman akan otomatis menyesuaikan role Admin atau Karyawan.
        </p>
      </form>
    </section>
  </main>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  background:
    radial-gradient(circle at 20% 20%, rgba(37, 99, 235, 0.22), transparent 28%),
    radial-gradient(circle at 80% 80%, rgba(14, 165, 233, 0.2), transparent 30%),
    linear-gradient(135deg, #0f172a 0%, #111827 45%, #f3f4f6 45%, #f9fafb 100%);
}

.login-left {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
  color: #ffffff;
}

.brand-card {
  width: min(520px, 100%);
  padding: 36px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.68);
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(18px);
}

.brand-icon,
.small-icon {
  width: 58px;
  height: 58px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: #2563eb;
  color: #ffffff;
  box-shadow: 0 16px 35px rgba(37, 99, 235, 0.35);
}

.brand-label {
  margin: 24px 0 10px;
  color: #93c5fd;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-size: 13px;
}

.brand-card h1 {
  margin: 0;
  font-size: clamp(34px, 5vw, 58px);
  line-height: 1.02;
  letter-spacing: -0.04em;
}

.brand-desc {
  max-width: 470px;
  margin: 20px 0 0;
  color: #cbd5e1;
  line-height: 1.7;
}

.feature-list {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 28px;
}

.feature-item {
  padding: 10px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  color: #e5e7eb;
  font-size: 13px;
  font-weight: 600;
}

.login-right {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px;
}

.login-card {
  width: min(430px, 100%);
  padding: 34px;
  border-radius: 18px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 24px 70px rgba(15, 23, 42, 0.14);
}

.login-header {
  margin-bottom: 28px;
}

.small-icon {
  width: 48px;
  height: 48px;
  border-radius: 13px;
  margin-bottom: 18px;
}

.login-header h2 {
  margin: 0 0 8px;
  color: #111827;
  font-size: 30px;
  letter-spacing: -0.03em;
}

.login-header p {
  margin: 0;
  color: #6b7280;
}

.alert-error {
  margin-bottom: 18px;
  padding: 12px 14px;
  border-radius: 12px;
  background: #fef2f2;
  color: #b91c1c;
  font-weight: 600;
  font-size: 14px;
}

.form-group {
  display: block;
  margin-bottom: 18px;
}

.form-group span {
  display: block;
  margin-bottom: 8px;
  color: #374151;
  font-size: 14px;
  font-weight: 700;
}

.input-wrap {
  height: 52px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  border: 1px solid #d1d5db;
  border-radius: 12px;
  background: #ffffff;
  color: #6b7280;
  transition: 0.2s ease;
}

.input-wrap:focus-within {
  border-color: #2563eb;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.12);
}

.input-wrap input {
  width: 100%;
  border: 0;
  outline: 0;
  background: transparent;
  color: #111827;
}

.toggle-pin {
  border: 0;
  background: transparent;
  color: #2563eb;
  font-size: 13px;
  font-weight: 700;
}

.login-button {
  width: 100%;
  height: 52px;
  margin-top: 6px;
  border: 0;
  border-radius: 12px;
  background: #2563eb;
  color: #ffffff;
  font-weight: 800;
  box-shadow: 0 14px 26px rgba(37, 99, 235, 0.28);
}

.login-button:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.login-note {
  margin: 18px 0 0;
  color: #6b7280;
  text-align: center;
  font-size: 13px;
}

@media (max-width: 900px) {
  .login-page {
    grid-template-columns: 1fr;
    background: #f3f4f6;
  }

  .login-left {
    padding: 28px 20px 0;
  }

  .brand-card {
    background: #0f172a;
  }

  .login-right {
    padding: 24px 20px 36px;
  }
}
</style>

