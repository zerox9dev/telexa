import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { toast } from 'sonner'
import { api, unwrap } from '@/api/client'
import { MyChannel, SourceChannel } from '@/types'

interface ChannelsState {
  myChannels: MyChannel[]
  sourceChannels: Record<number, SourceChannel[]>
  selectedSource: SourceChannel | null
  setSelectedSource: (src: SourceChannel | null) => void
  addChannel: (username: string) => Promise<void>
  addSource: (myChannelId: number, url: string) => Promise<void>
  deleteChannel: (id: number) => Promise<void>
  deleteSource: (id: number) => Promise<void>
  updateSource: (src: SourceChannel) => void
}

const Ctx = createContext<ChannelsState | null>(null)

export function ChannelsProvider({ children }: { children: React.ReactNode }) {
  const [myChannels, setMyChannels] = useState<MyChannel[]>([])
  const [sourceChannels, setSourceChannels] = useState<Record<number, SourceChannel[]>>({})
  const [selectedSource, setSelectedSource] = useState<SourceChannel | null>(null)

  useEffect(() => {
    api.get('/channels/my').then(async res => {
      const channels = unwrap<MyChannel[]>(res)
      setMyChannels(channels)
      const sourcesMap: Record<number, SourceChannel[]> = {}
      await Promise.all(channels.map(async ch => {
        const sRes = await api.get(`/channels/sources?my_channel_id=${ch.id}`)
        sourcesMap[ch.id] = unwrap<SourceChannel[]>(sRes)
      }))
      setSourceChannels(sourcesMap)
    }).catch(() => {})
  }, [])

  const addChannel = useCallback(async (username: string) => {
    try {
      const res = await api.post('/channels/my', { username })
      const ch = unwrap<MyChannel>(res)
      setMyChannels(prev => [...prev, ch])
      setSourceChannels(prev => ({ ...prev, [ch.id]: [] }))
      toast.success(`Channel @${ch.username} added`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add channel')
      throw err
    }
  }, [])

  const addSource = useCallback(async (myChannelId: number, url: string) => {
    try {
      const res = await api.post('/channels/sources', { url, my_channel_id: myChannelId })
      const src = unwrap<SourceChannel>(res)
      setSourceChannels(prev => ({
        ...prev,
        [src.my_channel_id]: [...(prev[src.my_channel_id] || []), src],
      }))
      toast.success(`Source @${src.username} added`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add source')
      throw err
    }
  }, [])

  const deleteChannel = useCallback(async (id: number) => {
    try {
      await api.delete(`/channels/my/${id}`)
      setMyChannels(prev => prev.filter(c => c.id !== id))
      setSourceChannels(prev => {
        const next = { ...prev }
        const removed = next[id] || []
        delete next[id]
        if (selectedSource && removed.some(s => s.id === selectedSource.id)) {
          setSelectedSource(null)
        }
        return next
      })
      toast.info('Channel deleted')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete channel')
    }
  }, [selectedSource])

  const deleteSource = useCallback(async (id: number) => {
    try {
      await api.delete(`/channels/sources/${id}`)
      setSourceChannels(prev => {
        const next = { ...prev }
        for (const chId in next) {
          next[chId] = next[Number(chId)].filter(s => s.id !== id)
        }
        return next
      })
      if (selectedSource?.id === id) setSelectedSource(null)
      toast.info('Source removed')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove source')
    }
  }, [selectedSource])

  const updateSource = useCallback((src: SourceChannel) => {
    setSourceChannels(prev => ({
      ...prev,
      [src.my_channel_id]: (prev[src.my_channel_id] || []).map(s =>
        s.id === src.id ? src : s
      ),
    }))
    setSelectedSource(prev => (prev?.id === src.id ? src : prev))
  }, [])

  const value = useMemo<ChannelsState>(() => ({
    myChannels,
    sourceChannels,
    selectedSource,
    setSelectedSource,
    addChannel,
    addSource,
    deleteChannel,
    deleteSource,
    updateSource,
  }), [myChannels, sourceChannels, selectedSource, addChannel, addSource, deleteChannel, deleteSource, updateSource])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useChannels(): ChannelsState {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useChannels must be used within ChannelsProvider')
  return ctx
}
