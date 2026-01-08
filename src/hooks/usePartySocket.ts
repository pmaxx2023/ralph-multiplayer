import { useState } from 'react'
import type { UserPresence } from '../types'

// Simplified - no WebSocket for Vercel serverless
export function usePartySocket(_projectId: string | null) {
  const [presence] = useState<UserPresence[]>([])

  return {
    connected: false,
    presence,
    sendMessage: () => {},
    updateCursor: () => {},
  }
}
