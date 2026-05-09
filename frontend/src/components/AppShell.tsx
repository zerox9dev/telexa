import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/api/client'
import { AppSidebar } from '@/components/app-sidebar'
import { Separator } from '@/components/ui/separator'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { useChannels } from '@/contexts/ChannelsContext'

interface Props {
  onLogout: () => void
  /** Header rendered to the right of the sidebar trigger. */
  header?: React.ReactNode
  children: React.ReactNode
}

export default function AppShell({ onLogout, header, children }: Props) {
  const navigate = useNavigate()
  const ch = useChannels()

  async function handleLogout() {
    await api.post('/auth/logout')
    onLogout()
  }

  return (
    <SidebarProvider>
      <AppSidebar
        myChannels={ch.myChannels}
        sourceChannels={ch.sourceChannels}
        selectedSourceId={ch.selectedSource?.id ?? null}
        onSelectSource={src => {
          ch.setSelectedSource(src)
          navigate('/')
        }}
        onAddChannel={ch.addChannel}
        onAddSource={ch.addSource}
        onDeleteChannel={ch.deleteChannel}
        onDeleteSource={ch.deleteSource}
        onLogout={handleLogout}
      />
      <SidebarInset>
        <header className="flex h-12 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          {header}
        </header>
        <main className="flex-1 overflow-hidden">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
