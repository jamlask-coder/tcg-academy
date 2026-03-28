// TCG Academy — Types

export interface Product {
  id: number
  name: string
  slug: string
  price: string
  regular_price: string
  sale_price: string
  stock_status: 'instock' | 'outofstock' | 'onbackorder'
  stock_quantity: number | null
  images: { id: number; src: string; alt: string }[]
  categories: { id: number; name: string; slug: string }[]
  description: string
  short_description: string
  rating_count: number
  average_rating: string
  on_sale: boolean
  featured: boolean
  meta_data: { key: string; value: string }[]
  // language?: string  — reserved for future multi-language support (EN/ES/JP/FR/DE/IT/KO/PT per game)
  //                       until promoted: read via meta_data.find(m => m.key === 'language')?.value
}

export interface Category {
  id: number
  name: string
  slug: string
  description: string
  image: { src: string; alt: string } | null
  count: number
  parent: number
}

export interface CartItem {
  key: string
  product_id: number
  quantity: number
  name: string
  price: number
  image: string
}

export interface Store {
  id: string
  name: string
  city: string
  address: string
  phone: string
  email: string
  hours: string
  mapUrl: string
  color: string
}

export interface Event {
  id: number
  title: string
  date: string
  store: string
  game: string
  price: number
  image: string
  description: string
}

export interface B2BApplication {
  empresa: string
  nif: string
  email: string
  telefono: string
  volumen: string
  juegos: string[]
  mensaje: string
}

export type GameSlug = 'pokemon' | 'magic' | 'yugioh' | 'naruto' | 'lorcana' | 'dragon-ball'

export interface Game {
  slug: GameSlug
  name: string
  emoji: string
  color: string
  bgColor: string
  description: string
  categorySlug: string
}
