import { useState, useRef } from 'react'

export default function AudioUploader({ onFileUploaded }) {
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true)
    } else if (e.type === 'dragleave') {
      setIsDragging(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      uploadFile(files[0])
    }
  }

  const handleFileSelect = (e) => {
    const files = e.target.files
    if (files && files.length > 0) {
      uploadFile(files[0])
    }
  }

  const uploadFile = async (file) => {
    if (!file.type.startsWith('audio/')) {
      setError('Please upload an audio file')
      return
    }

    setIsUploading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/audio/upload', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const data = await response.json()
      onFileUploaded(data)
    } catch (err) {
      setError(err.message || 'Failed to upload file')
      console.error('Upload error:', err)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="card">
      <div
        className={`drop-zone ${isDragging ? 'active' : ''}`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="drop-zone-icon">
          {isUploading ? '⏳' : '🎵'}
        </div>
        <h2>{isUploading ? 'Uploading...' : 'Upload Audio File'}</h2>
        <p>
          {isUploading
            ? 'Analyzing your audio...'
            : 'Drag and drop your audio file here, or click to browse'}
        </p>
        <p style={{ fontSize: '14px', marginTop: '16px', opacity: 0.7 }}>
          Supported formats: WAV, MP3, OGG, FLAC
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
      />

      {error && (
        <div className="card" style={{ background: 'rgba(248, 113, 113, 0.2)', marginTop: '16px' }}>
          <p><strong>Error:</strong> {error}</p>
        </div>
      )}

      <div className="card" style={{ background: 'rgba(0, 0, 0, 0.2)', marginTop: '24px' }}>
        <h3>What can you do?</h3>
        <ul style={{ marginLeft: '20px', marginTop: '12px' }}>
          <li>🎭 Create voice personas with AI transformation</li>
          <li>🥁 Detect and separate drum sounds</li>
          <li>🎹 Resynthesize audio with FM synthesis</li>
          <li>🌊 Apply concatenative synthesis for unique textures</li>
          <li>🌀 Warp audio in spectral, temporal, and granular domains</li>
          <li>🤖 Generate new sounds with Magenta.js and AI models</li>
        </ul>
      </div>
    </div>
  )
}
