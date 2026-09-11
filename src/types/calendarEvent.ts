import type { Timestamp } from 'firebase/firestore'

export type CalendarEventType = 'automatic' | 'custom'

export interface CalendarEvent {
  title: string
  date: Timestamp
  type: CalendarEventType
  description: string | null
  createdAt: Timestamp
}
