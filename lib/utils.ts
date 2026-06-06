import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type ExternalLinkType = "video" | "site" | "document" | "other"

export interface ExternalLink {
  url: string
  displayText: string
  type: ExternalLinkType
  domain: string
}

function classifyLink(url: string): ExternalLinkType {
  const host = (() => {
    try {
      return new URL(url).hostname.toLowerCase()
    } catch {
      return ""
    }
  })()

  if (/^(www\.)?(youtube\.com|youtu\.be|vimeo\.com|dailymotion\.com|twitch\.tv)/.test(host)) return "video"
  if (/\.(pdf|doc|docx|xls|xlsx|ppt|pptx)$/i.test(url)) return "document"
  return "site"
}

function cleanUrl(url: string): string {
  return url.replace(/\\_/g, "_")
}

function cleanDisplayText(text: string): string {
  let cleaned = text.replace(/\\_/g, "_")
  cleaned = cleaned.replace(/^https?:\/\/(www\.)?/i, "")
  if (cleaned.length > 60) {
    cleaned = cleaned.substring(0, 57) + "..."
  }
  return cleaned
}

export function extractExternalLinks(content: string): ExternalLink[] {
  const seen = new Set<string>()
  const results: ExternalLink[] = []

  const inlineRe = /\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g
  let match: RegExpExecArray | null
  while ((match = inlineRe.exec(content)) !== null) {
    const url = cleanUrl(match[2])
    if (seen.has(url)) continue
    seen.add(url)
    try {
      const u = new URL(url)
      const rawText = match[1] || u.hostname
      results.push({
        url,
        displayText: cleanDisplayText(rawText),
        type: classifyLink(url),
        domain: u.hostname.replace(/^www\./, ""),
      })
    } catch { /* skip invalid */ }
  }

  const bareRe = /(?<![(\[/\w])https?:\/\/[^\s<>")\]]+/g
  while ((match = bareRe.exec(content)) !== null) {
    const url = cleanUrl(match[0].replace(/[.,;:!?\)}\]]+$/, ""))
    if (seen.has(url)) continue
    seen.add(url)
    try {
      const u = new URL(url)
      results.push({
        url,
        displayText: cleanDisplayText(u.hostname),
        type: classifyLink(url),
        domain: u.hostname.replace(/^www\./, ""),
      })
    } catch { /* skip invalid */ }
  }

  return results
}
