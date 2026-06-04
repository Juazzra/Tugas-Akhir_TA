import { defineStore } from 'pinia'

const CART_KEY = 'wms_cart'

const loadCart = () => {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || '[]')
  } catch {
    return []
  }
}

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: loadCart(),
  }),

  getters: {
    totalItems: (state) => state.items.reduce((total, item) => total + item.jumlah, 0),
    totalTypes: (state) => state.items.length,
    isEmpty: (state) => state.items.length === 0,
  },

  actions: {
    saveCart() {
      localStorage.setItem(CART_KEY, JSON.stringify(this.items))
    },

    addToCart(item) {
      const existingItem = this.items.find((cartItem) => cartItem.item_id === item.id)

      if (existingItem) {
        if (existingItem.jumlah < item.stok_aktual) {
          existingItem.jumlah += 1
        }
      } else {
        this.items.push({
          item_id: item.id,
          barcode: item.barcode,
          nama_barang: item.nama_barang,
          jenis: item.jenis,
          stok_aktual: item.stok_aktual,
          foto_barang: item.foto_barang,
          jumlah: 1,
          alasan: '',
          foto_bukti: '',
        })
      }

      this.saveCart()
    },

    updateQuantity(itemId, jumlah) {
      const item = this.items.find((cartItem) => cartItem.item_id === itemId)
      if (!item) return

      const nextQuantity = Number(jumlah)

      if (nextQuantity <= 0) {
        this.removeFromCart(itemId)
        return
      }

      item.jumlah = Math.min(nextQuantity, item.stok_aktual)
      this.saveCart()
    },

    updateReason(itemId, alasan) {
      const item = this.items.find((cartItem) => cartItem.item_id === itemId)
      if (!item) return

      item.alasan = alasan
      this.saveCart()
    },

    updateProofPhoto(itemId, fotoBase64) {
      const item = this.items.find((cartItem) => cartItem.item_id === itemId)
      if (!item) return

      item.foto_bukti = fotoBase64
      this.saveCart()
    },

    removeFromCart(itemId) {
      this.items = this.items.filter((item) => item.item_id !== itemId)
      this.saveCart()
    },

    clearCart() {
      this.items = []
      localStorage.removeItem(CART_KEY)
    },
  },
})
