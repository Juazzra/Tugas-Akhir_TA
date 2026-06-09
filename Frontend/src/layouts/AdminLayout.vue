<script setup>
import { ref } from 'vue'
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
  Menu,
  X,
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
    <!-- Overlay/backdrop for mobile sidebar drawer -->
    <div v-if="isSidebarOpen" class="sidebar-backdrop no-print" @click="closeSidebar"></div>

    <!-- Mobile Header (Visible only on mobile/tablet) -->
    <header class="mobile-header no-print">
      <button class="menu-toggle" type="button" @click="toggleSidebar" aria-label="Toggle Menu">
        <Menu v-if="!isSidebarOpen" :size="24" />
        <X v-else :size="24" />
      </button>

      <div class="mobile-brand">
        <PackageCheck :size="20" class="brand-blue" />
        <strong>WMS Admin</strong>
      </div>

      <div class="mobile-user-avatar">
        {{ authStore.user?.nama?.charAt(0) || authStore.user?.name?.charAt(0) || 'A' }}
      </div>
    </header>

    <aside class="sidebar" :class="{ 'is-open': isSidebarOpen }">
      <div class="brand">
        <div class="brand-icon">
          <PackageCheck :size="26" />
        </div>

        <div>
          <h1>WMS</h1>
          <p>Admin Panel</p>
        </div>

        <button class="sidebar-close-btn no-print" type="button" @click="closeSidebar">
          <X :size="20" />
        </button>
      </div>

      <nav class="nav-menu">
        <RouterLink
          v-for="menu in menus"
          :key="menu.path"
          :to="menu.path"
          class="nav-link"
          @click="closeSidebar"
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

      <button class="logout-button" type="button" @click="handleLogout(); closeSidebar()">
        <LogOut :size="19" />
        <span>Logout</span>
      </button>
    </aside>

    <section class="main-area">
      <header class="topbar no-print">
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

/* Sidebar close button hidden on desktop */
.sidebar-close-btn {
  display: none;
}

/* Mobile header hidden on desktop */
.mobile-header {
  display: none;
}

@media (max-width: 920px) {
  .admin-layout {
    grid-template-columns: 1fr;
  }

  .mobile-header {
    display: flex;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 60px;
    background: #0f172a;
    color: #ffffff;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    z-index: 80;
    box-shadow: 0 4px 12px rgba(15, 23, 42, 0.15);
  }

  .menu-toggle {
    background: transparent;
    border: 0;
    color: #cbd5e1;
    display: grid;
    place-items: center;
    padding: 8px;
    border-radius: 8px;
  }

  .menu-toggle:active {
    background: rgba(255, 255, 255, 0.1);
  }

  .mobile-brand {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
  }

  .brand-blue {
    color: #2563eb;
  }

  .mobile-user-avatar {
    width: 34px;
    height: 34px;
    background: #2563eb;
    color: #ffffff;
    display: grid;
    place-items: center;
    border-radius: 50%;
    font-weight: 800;
    text-transform: uppercase;
  }

  .sidebar-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(15, 23, 42, 0.6);
    backdrop-filter: blur(3px);
    z-index: 90;
  }

  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 280px;
    height: 100vh;
    z-index: 100;
    transform: translateX(-100%);
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .sidebar.is-open {
    transform: translateX(0);
  }

  .sidebar-close-btn {
    display: grid;
    place-items: center;
    width: 36px;
    height: 36px;
    border: 0;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.08);
    color: #cbd5e1;
    margin-left: auto;
  }

  .sidebar-close-btn:active {
    background: rgba(255, 255, 255, 0.15);
  }

  .topbar {
    display: none; /* Hide the big desktop header on mobile */
  }

  .main-area {
    padding-top: 60px; /* Offset the mobile header height */
  }

  .content {
    padding: 16px;
  }
}
</style>
