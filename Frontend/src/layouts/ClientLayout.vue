<script setup>
import { RouterLink, RouterView, useRouter } from 'vue-router'
import {
  ClipboardList,
  Home,
  LogOut,
  PackageSearch,
  ShoppingCart,
  UserRound,
} from 'lucide-vue-next'
import { useAuthStore } from '../stores/authStore'

const router = useRouter()
const authStore = useAuthStore()

const menus = [
  {
    label: 'Katalog Barang',
    path: '/client/catalog',
    icon: PackageSearch,
  },
  {
    label: 'Request Saya',
    path: '/client/requests',
    icon: ClipboardList,
  },
  {
    label: 'Profil Saya',
    path: '/client/profile',
    icon: UserRound,
  },
]

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <main class="client-layout">
    <header class="client-header">
      <div class="brand">
        <div class="brand-icon">
          <ShoppingCart :size="24" />
        </div>

        <div>
          <h1>WMS Request</h1>
          <p>Client Page</p>
        </div>
      </div>

      <nav class="nav-menu">
        <RouterLink
          v-for="menu in menus"
          :key="menu.path"
          :to="menu.path"
          class="nav-link"
        >
          <component :is="menu.icon" :size="18" />
          <span>{{ menu.label }}</span>
        </RouterLink>
      </nav>

      <button class="logout-button" type="button" @click="handleLogout">
        <LogOut :size="18" />
        <span>Logout</span>
      </button>
    </header>

    <section class="client-main">
      <div class="welcome-card">
        <div>
          <p>Frontend Warehouse</p>
          <h2>Halo, {{ authStore.user?.nama || authStore.user?.nik || 'Karyawan' }}</h2>
          <span>Pilih barang yang tersedia, masukkan ke keranjang, lalu ajukan request ke admin.</span>
        </div>

        <div class="welcome-icon">
          <UserRound :size="30" />
        </div>
      </div>

      <RouterView />
    </section>
  </main>
</template>

<style scoped>
.client-layout {
  min-height: 100vh;
  background: #f3f4f6;
}

.client-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 16px 28px;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.05);
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-right: auto;
}

.brand-icon {
  width: 46px;
  height: 46px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: #2563eb;
  color: #ffffff;
}

.brand h1 {
  margin: 0;
  color: #111827;
  font-size: 19px;
  letter-spacing: -0.03em;
}

.brand p {
  margin: 2px 0 0;
  color: #6b7280;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}

.nav-menu {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-link {
  height: 42px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  border-radius: 10px;
  color: #4b5563;
  font-weight: 800;
  transition: 0.2s ease;
}

.nav-link:hover {
  background: #f3f4f6;
  color: #111827;
}

.nav-link.router-link-active {
  background: #eff6ff;
  color: #2563eb;
}

.logout-button {
  height: 42px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px;
  border: 0;
  border-radius: 10px;
  background: #fef2f2;
  color: #dc2626;
  font-weight: 900;
}

.client-main {
  width: min(1180px, calc(100% - 32px));
  margin: 0 auto;
  padding: 24px 0 40px;
}

.welcome-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 22px;
  padding: 24px;
  border-radius: 18px;
  background:
    radial-gradient(circle at 12% 20%, rgba(37, 99, 235, 0.18), transparent 30%),
    linear-gradient(135deg, #0f172a, #1e293b);
  color: #ffffff;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.18);
}

.welcome-card p {
  margin: 0 0 6px;
  color: #93c5fd;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.welcome-card h2 {
  margin: 0;
  font-size: 30px;
  letter-spacing: -0.04em;
}

.welcome-card span {
  display: block;
  margin-top: 8px;
  color: #cbd5e1;
}

.welcome-icon {
  width: 62px;
  height: 62px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.12);
  color: #bfdbfe;
}

@media (max-width: 820px) {
  .client-header {
    align-items: stretch;
    flex-direction: column;
    padding: 16px;
  }

  .brand {
    margin-right: 0;
  }

  .nav-menu {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .nav-link,
  .logout-button {
    justify-content: center;
    width: 100%;
  }

  .welcome-card {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>

