'use client'

import { useEffect } from 'react'

interface StructuredDataProps {
  data: object | object[]
}

export default function StructuredData({ data }: StructuredDataProps) {
  useEffect(() => {
    const scripts = Array.isArray(data) ? data : [data]
    const scriptIds: string[] = []
    
    scripts.forEach((schema) => {
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.text = JSON.stringify(schema)
      const scriptId = `structured-data-${Date.now()}-${Math.random()}`
      script.id = scriptId
      scriptIds.push(scriptId)
      document.head.appendChild(script)
    })
    
    return () => {
      scriptIds.forEach((id) => {
        const existingScript = document.getElementById(id)
        if (existingScript) {
          document.head.removeChild(existingScript)
        }
      })
    }
  }, [data])

  return null
}

