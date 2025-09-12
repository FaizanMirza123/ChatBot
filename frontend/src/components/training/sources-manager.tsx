"use client"

import React, { useState } from 'react'
import { useApi, useAsyncAction } from '@/hooks/useApi'
import { apiClient } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Upload, FileText, Trash2, CheckCircle, Clock } from 'lucide-react'

export function SourcesManager() {
  const [dragActive, setDragActive] = useState(false)

  // Load documents
  const { data: documentsData, loading, error, refetch } = useApi(
    () => apiClient.getDocuments(),
    []
  )

  // Upload document action
  const { execute: uploadDocument, loading: uploading, error: uploadError } = useAsyncAction(
    (file: File) => apiClient.uploadDocument(file)
  )

  // Delete document action
  const { execute: deleteDocument, loading: deleting } = useAsyncAction(
    (id: number) => apiClient.deleteDocument(id)
  )

  const documents = documentsData?.documents || []

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      await handleFileUpload(file)
    }
  }

  const handleFileUpload = async (file: File) => {
    const result = await uploadDocument(file)
    if (result) {
      refetch()
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0])
    }
  }

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this document?')) {
      const result = await deleteDocument(id)
      if (result) {
        refetch()
      }
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-gray-200 rounded-lg"></div>
        <div className="space-y-2">
          <div className="h-16 bg-gray-200 rounded"></div>
          <div className="h-16 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-indigo-500 bg-indigo-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".pdf,.txt,.docx"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={uploading}
        />
        
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {uploading ? 'Uploading...' : 'Upload Documents'}
        </h3>
        <p className="text-gray-600 mb-4">
          Drag and drop files here, or click to browse
        </p>
        <p className="text-sm text-gray-500">
          Supports PDF, TXT, and DOCX files
        </p>
        
        {uploadError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{uploadError}</p>
          </div>
        )}
      </div>

      {/* Documents List */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">Error loading documents: {error}</p>
        </div>
      )}

      {documents.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900">
            Uploaded Documents ({documents.length})
          </h3>
          
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-gray-400" />
                  <div>
                    <h4 className="font-medium text-gray-900">{doc.filename}</h4>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>Uploaded {formatDate(doc.upload_date)}</span>
                      <span>{doc.chunk_count} chunks</span>
                      <div className="flex items-center gap-1">
                        {doc.processed ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-500" />
                            <span className="text-green-600">Processed</span>
                          </>
                        ) : (
                          <>
                            <Clock className="h-4 w-4 text-yellow-500" />
                            <span className="text-yellow-600">Processing...</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(doc.id)}
                  disabled={deleting}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {documents.length === 0 && !loading && (
        <div className="text-center py-8">
          <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No documents uploaded</h3>
          <p className="text-gray-600">
            Upload your first document to start training your bot
          </p>
        </div>
      )}
    </div>
  )
}