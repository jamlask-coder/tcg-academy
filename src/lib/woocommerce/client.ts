// WooCommerce REST API client

const WC_URL = process.env.NEXT_PUBLIC_WC_URL || 'https://tcgacademy.infinityfreeapp.com'
const WC_KEY = process.env.WC_CONSUMER_KEY || ''
const WC_SECRET = process.env.WC_CONSUMER_SECRET || ''

const auth = Buffer.from(`${WC_KEY}:${WC_SECRET}`).toString('base64')

async function wcFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${WC_URL}/wp-json/wc/v3${endpoint}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    next: { revalidate: 60 },
  })
  if (!res.ok) {
    throw new Error(`WC API error: ${res.status} ${endpoint}`)
  }
  return res.json()
}

export const wc = {
  // Products
  getProducts: (params?: Record<string, string | number>) => {
    const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : ''
    return wcFetch<import('@/types').Product[]>(`/products${qs}`)
  },
  getProduct: (id: number) => wcFetch<import('@/types').Product>(`/products/${id}`),
  getProductBySlug: async (slug: string) => {
    const products = await wcFetch<import('@/types').Product[]>(`/products?slug=${slug}`)
    return products[0] || null
  },

  // Categories
  getCategories: (params?: Record<string, string | number>) => {
    const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : ''
    return wcFetch<import('@/types').Category[]>(`/products/categories${qs}`)
  },
  getCategoryBySlug: async (slug: string) => {
    const cats = await wcFetch<import('@/types').Category[]>(`/products/categories?slug=${slug}`)
    return cats[0] || null
  },

  // Orders
  createOrder: (data: Record<string, unknown>) =>
    wcFetch('/orders', { method: 'POST', body: JSON.stringify(data) }),
}
