"use client"

import React, { useState } from 'react'
import { useApi, useAsyncAction } from '@/hooks/useApi'
import { apiClient } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export function GeneralSettings() {
  const [botName, setBotName] = useState('')
  const [description, setDescription] = useState('')
  const [hasChanges, setHasChanges] = useState(false)

  // Load current system prompt
  const { data: systemPrompt, loading, error, refetch } = useApi(
    () => apiClient.getSystemPrompt(),
    []
  )

  // Update system prompt action
  const { execute: updatePrompt, loading: updating, error: updateError } = useAsyncAction(
    (text: string) => apiClient.updateSystemPrompt(text)
  )

  // Initialize form with loaded data
  React.useEffect(() => {
    if (systemPrompt && !hasChanges) {
      // Extract bot name and description from system prompt if structured
      // For now, just use the prompt text as description
      setBotName('Botify') // Default name
      setDescription(systemPrompt.text || '')
    }
  }, [systemPrompt, hasChanges])

  const handleSave = async () => {
    const success = await updatePrompt(description)
    if (success) {
      setHasChanges(false)
      refetch()
    }
  }

  const handleDiscard = () => {
    if (systemPrompt) {
      setBotName('Botify')
      setDescription(systemPrompt.text || '')
      setHasChanges(false)
    }
  }

  const handleBotNameChange = (value: string) => {
    setBotName(value)
    setHasChanges(true)
  }

  const handleDescriptionChange = (value: string) => {
    setDescription(value)
    setHasChanges(true)
  }

  if (loading) {
    return (
      <div className="flex-1 p-8">
        <div className="max-w-2xl">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
            <div className="space-y-4">
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 p-8">
      <div className="max-w-2xl">
        <div className="mb-8">
          <h2 className="text-lg font-medium text-gray-900 mb-2">
            Configure your bot according to your needs
          </h2>
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">Error loading settings: {error}</p>
            </div>
          )}
          {updateError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">Error saving: {updateError}</p>
            </div>
          )}
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
              onChange={(e) => handleBotNameChange(e.target.value)}
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
              onChange={(e) => handleDescriptionChange(e.target.value)}
              className="max-w-2xl min-h-[120px]"
              placeholder="Enter system prompt for your bot..."
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 mt-12 pt-6 border-t border-gray-200">
          <Button 
            variant="outline" 
            onClick={handleDiscard}
            disabled={!hasChanges || updating}
            className="text-gray-600"
          >
            Discard changes
          </Button>
          <Button 
            onClick={handleSave}
            disabled={!hasChanges || updating}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {updating ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      </div>
    </div>
  )
}