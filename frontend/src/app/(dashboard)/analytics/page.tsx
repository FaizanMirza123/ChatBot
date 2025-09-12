import { Header } from '@/components/layout/header'

export default function AnalyticsPage() {
  return (
    <>
      <Header title="Analytics" />
      <div className="flex-1 p-8">
        <div className="max-w-4xl">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Bot Analytics
          </h2>
          <p className="text-gray-600">
            View detailed analytics and insights about your bot's performance.
          </p>
        </div>
      </div>
    </>
  )
}