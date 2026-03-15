import { useState } from 'react'

export default function DrumProcessor({ fileData }) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [separationResult, setSeparationResult] = useState(null)
  const [resynthesisResult, setResynthesisResult] = useState(null)
  const [technique, setTechnique] = useState('fm')

  const handleSeparate = async () => {
    setIsProcessing(true)
    setSeparationResult(null)

    try {
      const response = await fetch('/api/audio/drums/separate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: fileData.fileId,
        }),
      })

      const data = await response.json()
      setSeparationResult(data)
    } catch (error) {
      console.error('Drum separation error:', error)
      alert('Drum separation failed: ' + error.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleResynthesize = async (drumFileId) => {
    setIsProcessing(true)
    setResynthesisResult(null)

    try {
      const response = await fetch('/api/synthesis/drums/resynthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drumFileId,
          technique,
          parameters: {
            modulationIndex: 8,
            grainSize: 50,
          },
        }),
      })

      const data = await response.json()
      setResynthesisResult(data)
    } catch (error) {
      console.error('Drum resynthesis error:', error)
      alert('Drum resynthesis failed: ' + error.message)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="card">
      <h2>🥁 Drum Processor</h2>
      <p style={{ opacity: 0.8, marginBottom: '24px' }}>
        Detect, separate, and resynthesize drum sounds with advanced techniques
      </p>

      <div className="card" style={{ background: 'rgba(0, 0, 0, 0.2)' }}>
        <h3>Step 1: Separate Drum Sounds</h3>
        <p style={{ marginBottom: '16px', opacity: 0.8 }}>
          Analyzes your audio and separates it into individual drum types (kick, snare, hi-hat, etc.)
        </p>
        <button className="button" onClick={handleSeparate} disabled={isProcessing}>
          {isProcessing ? (
            <>
              <span className="loading"></span> Separating Drums...
            </>
          ) : (
            '🔍 Detect & Separate Drums'
          )}
        </button>
      </div>

      {separationResult && separationResult.success && (
        <div className="result-section">
          <h3>✅ Drums Separated!</h3>
          <p>Found {separationResult.totalHits} drum hits</p>

          <div className="grid grid-2" style={{ marginTop: '16px' }}>
            {Object.entries(separationResult.drums).map(([drumType, info]) => (
              <div key={drumType} className="card" style={{ background: 'rgba(0, 0, 0, 0.3)' }}>
                <h4 style={{ textTransform: 'capitalize' }}>
                  {drumType.replace('_', ' / ')}
                </h4>
                <p>Count: {info.count}</p>
                <p>Avg Centroid: {info.avgCentroid?.toFixed(2)} Hz</p>
                <audio controls src={info.url} style={{ width: '100%', marginTop: '8px' }} />
                <a
                  href={info.url}
                  download
                  className="button button-small button-secondary"
                  style={{ marginTop: '8px' }}
                >
                  💾 Download
                </a>
              </div>
            ))}
          </div>

          <div className="card" style={{ background: 'rgba(0, 0, 0, 0.2)', marginTop: '24px' }}>
            <h3>Step 2: Resynthesize (Optional)</h3>
            <p style={{ marginBottom: '16px', opacity: 0.8 }}>
              Apply FM or concatenative synthesis to create new drum sounds
            </p>

            <div className="control-group">
              <label>Synthesis Technique</label>
              <select
                className="select"
                value={technique}
                onChange={(e) => setTechnique(e.target.value)}
              >
                <option value="fm">FM Synthesis</option>
                <option value="concatenative">Concatenative Synthesis</option>
              </select>
            </div>

            <p style={{ fontSize: '14px', opacity: 0.7, marginTop: '8px' }}>
              Note: Resynthesis feature coming soon! This will transform your separated drums into
              entirely new sounds.
            </p>
          </div>
        </div>
      )}

      {resynthesisResult && resynthesisResult.success && (
        <div className="result-section">
          <h3>✅ Drum Resynthesized!</h3>
          <audio controls src={resynthesisResult.url} style={{ width: '100%', marginTop: '16px' }} />
          <a
            href={resynthesisResult.url}
            download
            className="button button-secondary"
            style={{ marginTop: '16px', display: 'inline-block' }}
          >
            💾 Download
          </a>
        </div>
      )}

      <div className="card" style={{ background: 'rgba(0, 0, 0, 0.2)', marginTop: '24px' }}>
        <h4>💡 Drum Processing Tips</h4>
        <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
          <li>Works best with clear, percussive audio</li>
          <li>Kicks are detected by low frequency content (&#60;200 Hz)</li>
          <li>Snares have mid-range frequency content (200-1000 Hz)</li>
          <li>Hi-hats and cymbals are high frequency (&#62;5000 Hz)</li>
        </ul>
      </div>
    </div>
  )
}
