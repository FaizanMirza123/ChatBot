import { Header } from '@/components/layout/header'

export default function GuidelinesPage() {
  return (
    <>
      <Header title="Guidelines" />
      <div className="flex-1 p-8">
        <div className="max-w-4xl">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Bot Guidelines
          </h2>
          <p className="text-gray-600">
            Set guidelines and rules for how your bot should behave and respond.
          </p>
        </div>
      </div>
    </>
  )
}