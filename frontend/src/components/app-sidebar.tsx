import * as React from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart3,
  ChevronRight,
  Hash,
  LogOut,
  Plus,
  Radio,
  Settings,
  Trash2,
} from 'lucide-react'

import { MyChannel, SourceChannel } from '@/types'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
  SidebarSeparator,
} from '@/components/ui/sidebar'

interface Props extends React.ComponentProps<typeof Sidebar> {
  myChannels: MyChannel[]
  sourceChannels: Record<number, SourceChannel[]>
  selectedSourceId: number | null
  onSelectSource: (src: SourceChannel) => void
  onAddChannel: (username: string) => Promise<void>
  onAddSource: (myChannelId: number, url: string) => Promise<void>
  onDeleteChannel: (id: number) => Promise<void>
  onDeleteSource: (id: number) => Promise<void>
  onLogout: () => Promise<void>
}

export function AppSidebar({
  myChannels,
  sourceChannels,
  selectedSourceId,
  onSelectSource,
  onAddChannel,
  onAddSource,
  onDeleteChannel,
  onDeleteSource,
  onLogout,
  ...props
}: Props) {
  const [addingChannel, setAddingChannel] = React.useState(false)
  const [newChannel, setNewChannel] = React.useState('')
  const [addingSourceFor, setAddingSourceFor] = React.useState<number | null>(null)
  const [newSource, setNewSource] = React.useState('')
  const [busy, setBusy] = React.useState(false)

  async function submitChannel(e: React.FormEvent) {
    e.preventDefault()
    if (!newChannel.trim()) return
    setBusy(true)
    try {
      await onAddChannel(newChannel.trim())
      setNewChannel('')
      setAddingChannel(false)
    } finally {
      setBusy(false)
    }
  }

  async function submitSource(e: React.FormEvent, myChannelId: number) {
    e.preventDefault()
    if (!newSource.trim()) return
    setBusy(true)
    try {
      await onAddSource(myChannelId, newSource.trim())
      setNewSource('')
      setAddingSourceFor(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex h-9 items-center gap-2 px-2">
          <div className="flex aspect-square size-6 items-center justify-center rounded-sm bg-primary text-primary-foreground">
            <Radio className="size-3.5" />
          </div>
          <span className="font-mono text-sm font-medium tracking-wide group-data-[collapsible=icon]:hidden">
            telexa
          </span>
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>My Channels</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {myChannels.map(ch => {
                const sources = sourceChannels[ch.id] || []
                const hasSelected = sources.some(s => s.id === selectedSourceId)
                return (
                  <Collapsible
                    key={ch.id}
                    asChild
                    defaultOpen={hasSelected || sources.length > 0}
                    className="group/collapsible"
                  >
                    <SidebarMenuItem>
                      <CollapsibleTrigger asChild>
                        <SidebarMenuButton tooltip={ch.title || ch.username}>
                          <Hash />
                          <span className="truncate">{ch.title || ch.username}</span>
                          <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                        </SidebarMenuButton>
                      </CollapsibleTrigger>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <SidebarMenuAction showOnHover>
                            <Trash2 />
                            <span className="sr-only">Delete channel</span>
                          </SidebarMenuAction>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete @{ch.username}?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will also remove all attached source channels and posts.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDeleteChannel(ch.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>

                      <CollapsibleContent>
                        <SidebarMenuSub>
                          {sources.map(src => (
                            <SidebarMenuSubItem key={src.id}>
                              <SidebarMenuSubButton
                                isActive={selectedSourceId === src.id}
                                onClick={() => onSelectSource(src)}
                                className="cursor-pointer"
                              >
                                <span className="font-mono text-xs">@{src.username}</span>
                              </SidebarMenuSubButton>
                              <SidebarMenuAction
                                showOnHover
                                onClick={e => {
                                  e.stopPropagation()
                                  onDeleteSource(src.id)
                                }}
                              >
                                <Trash2 />
                                <span className="sr-only">Remove source</span>
                              </SidebarMenuAction>
                            </SidebarMenuSubItem>
                          ))}

                          {addingSourceFor === ch.id ? (
                            <SidebarMenuSubItem>
                              <form
                                onSubmit={e => submitSource(e, ch.id)}
                                className="flex items-center gap-1 px-2 py-1"
                              >
                                <Input
                                  autoFocus
                                  value={newSource}
                                  onChange={e => setNewSource(e.target.value)}
                                  placeholder="t.me/channel"
                                  className="h-7 font-mono text-xs"
                                  disabled={busy}
                                />
                                <Button
                                  type="submit"
                                  size="sm"
                                  className="h-7 px-2"
                                  disabled={busy}
                                >
                                  Add
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-1.5"
                                  onClick={() => {
                                    setAddingSourceFor(null)
                                    setNewSource('')
                                  }}
                                >
                                  ✕
                                </Button>
                              </form>
                            </SidebarMenuSubItem>
                          ) : (
                            <SidebarMenuSubItem>
                              <SidebarMenuSubButton
                                onClick={() => setAddingSourceFor(ch.id)}
                                className="cursor-pointer text-muted-foreground"
                              >
                                <Plus className="size-3" />
                                <span>Add source</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          )}
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    </SidebarMenuItem>
                  </Collapsible>
                )
              })}

              {addingChannel ? (
                <SidebarMenuItem>
                  <form onSubmit={submitChannel} className="flex items-center gap-1 px-2 py-1">
                    <Input
                      autoFocus
                      value={newChannel}
                      onChange={e => setNewChannel(e.target.value)}
                      placeholder="@yourchannel"
                      className="h-7 font-mono text-xs"
                      disabled={busy}
                    />
                    <Button type="submit" size="sm" className="h-7 px-2" disabled={busy}>
                      Add
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-1.5"
                      onClick={() => {
                        setAddingChannel(false)
                        setNewChannel('')
                      }}
                    >
                      ✕
                    </Button>
                  </form>
                </SidebarMenuItem>
              ) : (
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => setAddingChannel(true)}
                    className="text-muted-foreground"
                  >
                    <Plus />
                    <span>Add channel</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Stats">
              <Link to="/stats">
                <BarChart3 />
                <span>Stats</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Admin">
              <Link to="/admin">
                <Settings />
                <span>Admin</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onLogout} tooltip="Log out">
              <LogOut />
              <span>Log out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
