<script setup>
import { RouterLink, RouterView, useRouter } from 'vue-router'
import {
  Barcode,
  Boxes,
  ClipboardCheck,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  PackageCheck,
  PackagePlus,
  ScanBarcode,
  UserRound,
  UsersRound,
} from 'lucide-vue-next'
import { useAuthStore } from '../stores/authStore'

const router = useRouter()
const authStore = useAuthStore()

const menus = [
  {
    label: 'Dashboard',
    path: '/admin/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Master Barang',
    path: '/admin/items',
    icon: Boxes,
  },
  {
    label: 'Cetak Barcode',
    path: '/admin/barcode',
    icon: Barcode,
  },
  {
    label: 'Barang Masuk',
    path: '/admin/restock',
    icon: PackagePlus,
  },
  {
    label: 'Master Karyawan',
    path: '/admin/users',
    icon: UsersRound,
  },
  {
    label: 'Approval Request',
    path: '/admin/requests',
    icon: ClipboardCheck,
  },
  {
    label: 'Riwayat Stok',
    path: '/admin/logs',
    icon: ClipboardList,
  },
  {
    label: 'Profil Saya',
    path: '/admin/profile',
    icon: UserRound,
  },
]

const handleLogout = () => {
  authStore.logout()
  router.push('/login')
}
</script>

<template>
  <main class="admin-layout">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-icon">
          <PackageCheck :size="26" />
        </div>

        <div>
          <h1>WMS</h1>
          <p>Admin Panel</p>
        </div>
      </div>

      <nav class="nav-menu">
        <RouterLink
          v-for="menu in menus"
          :key="menu.path"
          :to="menu.path"
          class="nav-link"
        >
          <component :is="menu.icon" :size="20" />
          <span>{{ menu.label }}</span>
        </RouterLink>
      </nav>

      <div class="scanner-card">
        <div class="scanner-icon">
          <ScanBarcode :size="22" />
        </div>
        <div>
          <h3>Scanner Ready</h3>
          <p>Validasi barang masuk dan serah terima.</p>
        </div>
      </div>

      <button class="logout-button" type="button" @click="handleLogout">
        <LogOut :size="19" />
        <span>Logout</span>
      </button>
    </aside>

    <section class="main-area">
      <header class="topbar">
        <div>
          <p class="topbar-label">Frontend Warehouse</p>
          <h2>Sistem Pengelolaan Stok Barang</h2>
        </div>

        <div class="user-card">
          <div class="avatar">
            {{ authStore.user?.nama?.charAt(0) || authStore.user?.name?.charAt(0) || 'A' }}
          </div>
          <div>
            <strong>{{ authStore.user?.nama || authStore.user?.name || 'Admin' }}</strong>
            <span>{{ authStore.user?.role || 'admin' }}</span>
          </div>
        </div>
      </header>

      <div class="content">
        <RouterView />
      </div>
    </section>
  </main>
</template>

<style scoped>
.admin-layout {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 280px 1fr;
  background: #f3f4f6;
}

.sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 22px;
  background: #0f172a;
  color: #ffffff;
}

.brand {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-bottom: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.brand-icon {
  width: 48px;
  height: 48px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: #2563eb;
}

.brand h1 {
  margin: 0;
  font-size: 22px;
  letter-spacing: -0.03em;
}

.brand p {
  margin: 2px 0 0;
  color: #94a3b8;
  font-size: 13px;
}

.nav-menu {
  display: grid;
  gap: 8px;
  margin-top: 26px;
  overflow-y: auto;
  padding-right: 4px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 46px;
  padding: 0 14px;
  border-radius: 10px;
  color: #cbd5e1;
  font-weight: 700;
  transition: 0.2s ease;
}

.nav-link:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
}

.nav-link.router-link-active {
  background: #2563eb;
  color: #ffffff;
}

.scanner-card {
  display: flex;
  gap: 12px;
  margin-top: auto;
  padding: 16px;
  border-radius: 12px;
  background: rgba(37, 99, 235, 0.14);
  border: 1px solid rgba(147, 197, 253, 0.16);
}

.scanner-icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  border-radius: 10px;
  background: rgba(37, 99, 235, 0.32);
  color: #93c5fd;
}

.scanner-card h3 {
  margin: 0 0 4px;
  font-size: 14px;
}

.scanner-card p {
  margin: 0;
  color: #94a3b8;
  font-size: 12px;
  line-height: 1.5;
}

.logout-button {
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 16px;
  border: 0;
  border-radius: 10px;
  background: #1e293b;
  color: #e5e7eb;
  font-weight: 800;
}

.logout-button:hover {
  background: #334155;
}

.main-area {
  min-width: 0;
}

.topbar {
  height: 82px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 30px;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
}

.topbar-label {
  margin: 0 0 4px;
  color: #2563eb;
  font-size: 13px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.topbar h2 {
  margin: 0;
  color: #111827;
  font-size: 22px;
  letter-spacing: -0.03em;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  background: #f9fafb;
}

.avatar {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: #2563eb;
  color: #ffffff;
  font-weight: 900;
  text-transform: uppercase;
}

.user-card strong,
.user-card span {
  display: block;
}

.user-card strong {
  color: #111827;
  font-size: 14px;
}

.user-card span {
  margin-top: 2px;
  color: #6b7280;
  font-size: 12px;
  text-transform: capitalize;
}

.content {
  padding: 28px 30px;
}

@media (max-width: 920px) {
  .admin-layout {
    grid-template-columns: 1fr;
  }

  .sidebar {
    position: static;
    height: auto;
  }

  .topbar {
    height: auto;
    align-items: flex-start;
    flex-direction: column;
    gap: 16px;
    padding: 22px;
  }

  .content {
    padding: 22px;
  }
}
</style>
