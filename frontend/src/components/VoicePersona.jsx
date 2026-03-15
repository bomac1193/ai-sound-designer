import { useState } from 'react'

export default function VoicePersona({ fileData }) {
  const [personaType, setPersonaType] = useState('robotic')
  const [intensity, setIntensity] = useState(0.5)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState(null)

  const personaTypes = [
    { value: 'robotic', label: '🤖 Robotic', description: 'Vocoder-style robotic voice' },
    { value: 'ethereal', label: '✨ Ethereal', description: 'Reverb and pitch shimmer' },
    { value: 'granular', label: '🌊 Granular', description: 'Time-stretched granular effect' },
    { value: 'pitched', label: '🎵 Pitched', description: 'Pitch shift transformation' },
    { value: 'formant', label: '🗣️ Formant', description: 'Formant manipulation' },
  ]

  const handleCreatePersona = async () => {
    setIsProcessing(true)
    setResult(null)

    try {
      const response = await fetch('/api/ml/persona/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: fileData.fileId,
          personaType,
          intensity,
        }),
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Persona creation error:', error)
      alert('Failed to create persona: ' + error.message)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="card">
      <h2>🎭 Voice Persona Creator</h2>
      <p style={{ opacity: 0.8, marginBottom: '24px' }}>
        Transform your audio into unique personas with AI-powered voice manipulation
      </p>

      <div className="control-group">
        <label>Persona Type</label>
        <div className="grid grid-2">
          {personaTypes.map((type) => (
            <div
              key={type.value}
              className={`card ${personaType === type.value ? '' : 'button-secondary'}`}
              style={{
                cursor: 'pointer',
                padding: '16px',
                background:
                  personaType === type.value
                    ? 'linear-gradient(135deg, var(--primary), var(--secondary))'
                    : 'rgba(255, 255, 255, 0.1)',
                border: personaType === type.value ? '2px solid var(--accent)' : 'none',
              }}
              onClick={() => setPersonaType(type.value)}
            >
              <strong>{type.label}</strong>
              <p style={{ fontSize: '14px', opacity: 0.8, marginTop: '4px' }}>
                {type.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="control-group">
        <label>
          Intensity
          <span className="control-value">{(intensity * 100).toFixed(0)}%</span>
        </label>
        <input
          type="range"
          className="slider"
          min="0"
          max="1"
          step="0.01"
          value={intensity}
          onChange={(e) => setIntensity(parseFloat(e.target.value))}
        />
      </div>

      <button className="button" onClick={handleCreatePersona} disabled={isProcessing}>
        {isProcessing ? (
          <>
            <span className="loading"></span> Creating Persona...
          </>
        ) : (
          '🎭 Create Voice Persona'
        )}
      </button>

      {result && result.success && (
        <div className="result-section">
          <h3>✅ Persona Created!</h3>
          <div className="badge badge-success" style={{ marginTop: '8px' }}>
            Type: {result.personaType}
          </div>
          <audio controls src={result.url} style={{ width: '100%', marginTop: '16px' }} />
          <a
            href={result.url}
            download
            className="button button-secondary"
            style={{ marginTop: '16px', display: 'inline-block' }}
          >
            💾 Download Persona
          </a>
        </div>
      )}

      <div className="card" style={{ background: 'rgba(0, 0, 0, 0.2)', marginTop: '24px' }}>
        <h4>💡 Tips</h4>
        <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
          <li>Start with 50% intensity and adjust to taste</li>
          <li>Robotic works great with vocals and spoken word</li>
          <li>Ethereal adds dreamy, spacious qualities</li>
          <li>Granular creates abstract, textured sounds</li>
        </ul>
      </div>
    </div>
  )
}
