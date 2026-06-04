import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

const routes = [
  {
    path: '/',
    redirect: '/login',
  },
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/auth/LoginView.vue'),
    meta: {
      guestOnly: true,
    },
  },
  {
    path: '/admin',
    component: () => import('../layouts/AdminLayout.vue'),
    meta: {
      requiresAuth: true,
      role: 'admin',
    },
    children: [
      {
        path: '',
        redirect: '/admin/dashboard',
      },
      {
        path: 'dashboard',
        name: 'admin-dashboard',
        component: () => import('../views/admin/AdminDashboardView.vue'),
      },
      {
        path: 'items',
        name: 'admin-items',
        component: () => import('../views/admin/AdminItemsView.vue'),
      },
      {
        path: 'users',
        name: 'admin-users',
        component: () => import('../views/admin/AdminUsersView.vue'),
      },
      {
        path: 'requests',
        name: 'admin-requests',
        component: () => import('../views/admin/AdminRequestsView.vue'),
      },      {
        path: 'barcode',
        name: 'admin-barcode',
        component: () => import('../views/admin/AdminBarcodeView.vue'),
      },
      {
        path: 'restock',
        name: 'admin-restock',
        component: () => import('../views/admin/AdminRestockView.vue'),
      },

      {
        path: 'logs',
        name: 'admin-logs',
        component: () => import('../views/admin/AdminLogsView.vue'),
      },
      {
        path: 'profile',
        name: 'admin-profile',
        component: () => import('../views/profile/ProfileView.vue'),
      },
    ],
  },
  {
    path: '/client',
    component: () => import('../layouts/ClientLayout.vue'),
    meta: {
      requiresAuth: true,
      role: 'karyawan',
    },
    children: [
      {
        path: '',
        redirect: '/client/catalog',
      },
      {
        path: 'catalog',
        name: 'client-catalog',
        component: () => import('../views/client/ClientCatalogView.vue'),
      },
      {
        path: 'requests',
        name: 'client-requests',
        component: () => import('../views/client/ClientRequestsView.vue'),
      },
      {
        path: 'profile',
        name: 'client-profile',
        component: () => import('../views/profile/ProfileView.vue'),
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach((to) => {
  const authStore = useAuthStore()

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    return '/login'
  }

  if (to.meta.guestOnly && authStore.isAuthenticated) {
    if (authStore.isAdmin) return '/admin/dashboard'
    if (authStore.isKaryawan) return '/client/catalog'
  }

  if (to.meta.role && authStore.role !== to.meta.role) {
    if (authStore.isAdmin) return '/admin/dashboard'
    if (authStore.isKaryawan) return '/client/catalog'
    return '/login'
  }

  return true
})

export default router




