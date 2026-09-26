import {
  Boxes,
  Send,
  Settings,
  Image as ImageIcon,
  LayoutDashboard,
  Package,
  Receipt,
  ShoppingCart,
  TrendingUp,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type NavItem = {
  href: string
  label: string
  icon: LucideIcon
}

export const navItems: NavItem[] = [
  { href: '/admin', label: 'Хяналтын самбар', icon: LayoutDashboard },
  { href: '/admin/products', label: 'Бараа', icon: Package },
  { href: '/admin/inventory', label: 'Нөөц', icon: Boxes },
  { href: '/admin/orders', label: 'Захиалга', icon: ShoppingCart },
  { href: '/admin/expenses', label: 'Зардал', icon: Receipt },
  { href: '/admin/analytics', label: 'Ашиг орлого', icon: TrendingUp },
  { href: '/admin/posters', label: 'Постер', icon: ImageIcon },
  { href: '/admin/posts', label: 'Нийтлэл', icon: Send },
  { href: '/admin/settings/social', label: 'Сошиал холболт', icon: Settings },
]
