import { Header } from '@/components/layout/header'

export default function WorkflowsPage() {
  return (
    <>
      <Header title="Workflows" />
      <div className="flex-1 p-8">
        <div className="max-w-4xl">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            Conversation Workflows
          </h2>
          <p className="text-gray-600">
            Create automated workflows and conversation flows for your bot.
          </p>
        </div>
      </div>
    </>
  )
}