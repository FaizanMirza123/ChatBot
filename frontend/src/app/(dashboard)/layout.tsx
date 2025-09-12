import { Sidebar } from '@/components/layout/sidebar'
import { TestChat } from '@/components/chat/test-chat'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {children}
        <TestChat />
      </div>
    </div>
  )
}