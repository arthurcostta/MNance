import type { HTMLAttributes } from 'react'

export default function Card({ className = '', ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`rounded border border-gray-200 bg-white p-4 ${className}`} {...props} />
}
