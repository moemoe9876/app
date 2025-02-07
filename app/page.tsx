'use client'

import { useState } from 'react'
import { FileUpload } from '@/components/FileUpload'
import { PromptInput } from '@/components/PromptInput'
import { ResultDisplay } from '@/components/ResultDisplay'
import { FileText } from 'lucide-react'

export default function Home() {
  const [currentStep, setCurrentStep] = useState<'upload' | 'prompt' | 'result'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<any>(null)

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile)
    setCurrentStep('prompt')
  }

  const handlePromptSubmit = async (prompt: string) => {
    try {
      // First, get the JSON schema
      const schemaResponse = await fetch('/api/generate-schema', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      })

      const { schema } = await schemaResponse.json()

      // Then, process the PDF with the schema
      const formData = new FormData()
      formData.append('file', file!)
      formData.append('schema', JSON.stringify(schema))

      const extractResponse = await fetch('/api/extract-data', {
        method: 'POST',
        body: formData,
      })

      const data = await extractResponse.json()
      setResult(data)
      setCurrentStep('result')
    } catch (error) {
      console.error('Error processing request:', error)
    }
  }

  const handleReset = () => {
    setFile(null)
    setResult(null)
    setCurrentStep('upload')
  }

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-center mb-8">
          <FileText className="w-8 h-8 mr-2 text-primary" />
          <h1 className="text-3xl font-bold text-primary">PDF to Structured Data</h1>
        </div>

        <div className="space-y-8">
          {currentStep === 'upload' && <FileUpload onFileSelect={handleFileSelect} />}

          {currentStep === 'prompt' && <PromptInput onSubmit={handlePromptSubmit} />}

          {currentStep === 'result' && <ResultDisplay result={result} onReset={handleReset} />}
        </div>
      </div>
    </main>
  )
}
