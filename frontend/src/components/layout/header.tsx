"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { Share, Play, User } from 'lucide-react'

interface HeaderProps {
  title: string
}

export function Header({ title }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-8 py-4 bg-white border-b border-gray-200">
      <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
      
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" className="gap-2">
          <Share className="w-4 h-4" />
          Share
        </Button>
        
        <Button size="sm" className="gap-2 bg-indigo-600 hover:bg-indigo-700">
          <Play className="w-4 h-4" />
          Test bot
        </Button>
        
        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center ml-2">
          <User className="w-5 h-5 text-gray-600" />
        </div>
      </div>
    </header>
  )
}