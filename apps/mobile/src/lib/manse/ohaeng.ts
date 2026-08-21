import { ohaeng, ohaengTint } from '@/theme'

export function ohaengColor(element: string): string {
  return (ohaeng as Record<string, string>)[element] ?? '#1A1A1A'
}

export function ohaengTintColor(element: string): string {
  return (ohaengTint as Record<string, string>)[element] ?? '#FFFFFF'
}
