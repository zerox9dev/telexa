import { supabase, isSupabaseConfigured } from './supabase'

export async function uploadMedia(file: File): Promise<string> {
  // Local fallback (Base64)
  if (!isSupabaseConfigured) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  // Supabase Storage
  const fileExt = file.name.split('.').pop()
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
  const filePath = `post-media/${fileName}`

  const { error: uploadError } = await (supabase as any).storage
    .from('media')
    .upload(filePath, file, { cacheControl: '3600', upsert: false })

  if (uploadError) {
    throw new Error(`Не вдалося завантажити зображення: ${uploadError.message}`)
  }

  const { data } = (supabase as any).storage.from('media').getPublicUrl(filePath)
  return data.publicUrl
}
