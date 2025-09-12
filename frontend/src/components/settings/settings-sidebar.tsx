"use client"

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const settingsNavigation = [
  { name: 'General', href: '/settings' },
  { name: 'Appearance', href: '/settings/appearance' },
  { name: 'Messaging', href: '/settings/messaging' },
  { name: 'Starter questions', href: '/settings/starter-questions' },
  { name: 'Email setup', href: '/settings/email' },
  { name: 'Usage and security', href: '/settings/security' },
  { name: 'User form', href: '/settings/user-form' },
  { name: 'Working hours', href: '/settings/working-hours' },
]

export function SettingsSidebar() {
  const pathname = usePathname()

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 p-6">
      <nav className="space-y-1">
        {settingsNavigation.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className={cn(
              "block px-3 py-2 text-sm rounded-md transition-colors",
              pathname === item.href
                ? "bg-gray-200 text-gray-900 font-medium"
                : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            )}
          >
            {item.name}
          </Link>
        ))}
      </nav>
    </div>
  )
}