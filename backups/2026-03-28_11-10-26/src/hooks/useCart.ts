'use client'
import { useState, useEffect } from 'react'
import type { CartItem } from '@/types'

const CART_KEY = 'tcga_cart'

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CART_KEY)
      if (stored) setItems(JSON.parse(stored))
    } catch {}
  }, [])

  const save = (newItems: CartItem[]) => {
    setItems(newItems)
    try { localStorage.setItem(CART_KEY, JSON.stringify(newItems)) } catch {}
  }

  const addItem = async (productId: number, quantity = 1) => {
    setLoading(true)
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: productId, quantity }),
      })
      const data = await res.json()
      if (data.items) save(data.items)
    } finally {
      setLoading(false)
    }
  }

  const removeItem = (key: string) => save(items.filter(i => i.key !== key))

  const updateQuantity = (key: string, quantity: number) => {
    if (quantity <= 0) { removeItem(key); return }
    save(items.map(i => i.key === key ? { ...i, quantity } : i))
  }

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const count = items.reduce((sum, i) => sum + i.quantity, 0)

  return { items, count, total, loading, addItem, removeItem, updateQuantity, clearCart: () => save([]) }
}
