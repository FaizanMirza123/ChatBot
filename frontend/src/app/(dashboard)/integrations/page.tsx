import { Header } from '@/components/layout/header'

export default function IntegrationsPage() {
  return (
    <>
      <Header title="Integrations" />
      <div className="flex-1 p-8">
        <div className="max-w-4xl">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Third-party Integrations
          </h2>
          <p className="text-gray-600">
            Connect your bot with external services and platforms.
          </p>
        </div>
      </div>
    </>
  )
}