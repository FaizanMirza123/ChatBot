import { Header } from '@/components/layout/header'
import { SettingsSidebar } from '@/components/settings/settings-sidebar'

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Header title="Settings" />
      <div className="flex flex-1 overflow-hidden">
        <SettingsSidebar />
        {children}
      </div>
    </>
  )
}