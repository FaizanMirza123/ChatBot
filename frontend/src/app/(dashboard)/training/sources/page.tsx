import { Header } from '@/components/layout/header'
import { SourcesManager } from '@/components/training/sources-manager'

export default function SourcesPage() {
  return (
    <>
      <Header title="Training Sources" />
      <div className="flex-1 p-8">
        <div className="max-w-6xl">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Manage your training sources
          </h2>
          <p className="text-gray-600">
            Upload documents, add URLs, or connect data sources to train your bot.
          </p>
          
          <div className="mt-8">
            <SourcesManager />
          </div>
        </div>
      </div>
    </>
  )
}