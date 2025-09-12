"use client"

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export function GeneralSettings() {
  const [botName, setBotName] = useState('Botify')
  const [description, setDescription] = useState('')

  const handleSave = () => {
    // Handle save logic here
    console.log('Saving settings:', { botName, description })
  }

  const handleDiscard = () => {
    setBotName('Botify')
    setDescription('')
  }

  return (
    <div className="flex-1 p-8">
      <div className="max-w-2xl">
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-2">
            Configure your bot according to your needs
          </h2>
        </div>

        <div className="space-y-8">
          {/* Bot Name */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Bot name
            </label>
            <p className="text-sm text-gray-600 mb-4">
              Give your bot a friendly name. Only for internal reference.
            </p>
            <Input
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              className="max-w-md"
              placeholder="Enter bot name"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Description
            </label>
            <p className="text-sm text-gray-600 mb-4">
              Bot description for internal references
            </p>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="max-w-2xl min-h-[120px]"
              placeholder="Enter bot description"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mt-12 pt-6 border-t border-gray-200">
          <Button 
            variant="outline" 
            onClick={handleDiscard}
            className="text-gray-600"
          >
            Discard changes
          </Button>
          <Button 
            onClick={handleSave}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            Save changes
          </Button>
        </div>
      </div>
    </div>
  )
}