"use client"

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Zap, 
  BookOpen, 
  FileText, 
  GitBranch, 
  Play, 
  Settings, 
  Puzzle, 
  Link as LinkIcon, 
  Inbox, 
  BarChart3, 
  HelpCircle, 
  Phone, 
  Ticket,
  MessageSquare
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  {
    name: 'Training',
    icon: Zap,
    children: [
      { name: 'Sources', href: '/training/sources', icon: BookOpen },
      { name: 'Guidelines', href: '/training/guidelines', icon: FileText },
      { name: 'Workflows', href: '/training/workflows', icon: GitBranch },
      { name: 'Actions', href: '/training/actions', icon: Play },
    ]
  },
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Integrations', href: '/integrations', icon: Puzzle },
  { name: 'Connect', href: '/connect', icon: LinkIcon },
  { name: 'Inbox', href: '/inbox', icon: Inbox },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Help Center', href: '/help', icon: HelpCircle },
  { name: 'Contact Sales', href: '/contact', icon: Phone },
  { name: 'Submit a Ticket', href: '/ticket', icon: Ticket },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-screen w-64 flex-col bg-gray-900 text-white">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-800">
        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-semibold">Botify</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => {
          if (item.children) {
            return (
              <div key={item.name} className="space-y-1">
                <div className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-gray-300">
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </div>
                <div className="ml-8 space-y-1">
                  {item.children.map((child) => (
                    <Link
                      key={child.name}
                      href={child.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors",
                        pathname === child.href
                          ? "bg-gray-800 text-white"
                          : "text-gray-400 hover:text-white hover:bg-gray-800"
                      )}
                    >
                      <child.icon className="w-4 h-4" />
                      {child.name}
                    </Link>
                  ))}
                </div>
              </div>
            )
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors",
                pathname === item.href
                  ? "bg-gray-800 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-800"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          )
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t border-gray-800 p-4">
        <div className="flex items-center gap-3 px-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-md">
          <MessageSquare className="w-5 h-5" />
          <span className="text-sm font-medium">Earn free Messages</span>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-gray-400 px-3">
          <span>Advanced/Enterprise</span>
          <span>Manage plan</span>
        </div>
      </div>
    </div>
  )
}