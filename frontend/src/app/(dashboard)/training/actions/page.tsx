import { Header } from '@/components/layout/header'

export default function ActionsPage() {
  return (
    <>
      <Header title="Actions" />
      <div className="flex-1 p-8">
        <div className="max-w-4xl">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Bot Actions
          </h2>
          <p className="text-gray-600">
            Configure actions your bot can perform during conversations.
          </p>
        </div>
      </div>
    </>
  )
}