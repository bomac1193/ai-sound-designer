import { useState } from 'react'

export default function AudioWarper({ fileData }) {
  const [warpType, setWarpType] = useState('spectral')
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState(null)

  const [spectralParams, setSpectralParams] = useState({
    frequencyShift: 100,
    spectralTilt: 0,
    harmonicDistortion: 0,
  })

  const [temporalParams, setTemporalParams] = useState({
    timeStretch: 1.0,
    variableSpeed: false,
    speedCurve: 'linear',
  })

  const [granularParams, setGranularParams] = useState({
    grainSize: 50,
    density: 1.0,
    randomization: 0.5,
    reverse: false,
  })

  const warpTypes = [
    { value: 'spectral', label: '🌈 Spectral', description: 'Frequency domain manipulation' },
    { value: 'temporal', label: '⏱️ Temporal', description: 'Time stretching and compression' },
    { value: 'granular', label: '🌊 Granular', description: 'Extreme granular warping' },
    { value: 'frequency', label: '🎚️ Frequency', description: 'Multi-band frequency warping' },
    { value: 'neural', label: '🤖 Neural', description: 'AI-based transformation' },
  ]

  const handleWarp = async () => {
    setIsProcessing(true)
    setResult(null)

    let parameters = {}
    switch (warpType) {
      case 'spectral':
        parameters = spectralParams
        break
      case 'temporal':
        parameters = temporalParams
        break
      case 'granular':
        parameters = granularParams
        break
      default:
        parameters = {}
    }

    try {
      const response = await fetch('/api/ml/warp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: fileData.fileId,
          warpType,
          parameters,
        }),
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Audio warping error:', error)
      alert('Audio warping failed: ' + error.message)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="card">
      <h2>🌀 Audio Warper</h2>
      <p style={{ opacity: 0.8, marginBottom: '24px' }}>
        Warp and transform your audio in strange and experimental ways
      </p>

      <div className="control-group">
        <label>Warp Type</label>
        <div className="grid grid-2">
          {warpTypes.map((type) => (
            <div
              key={type.value}
              className={`card`}
              style={{
                cursor: 'pointer',
                padding: '16px',
                background:
                  warpType === type.value
                    ? 'linear-gradient(135deg, var(--primary), var(--secondary))'
                    : 'rgba(255, 255, 255, 0.1)',
                border: warpType === type.value ? '2px solid var(--accent)' : 'none',
              }}
              onClick={() => setWarpType(type.value)}
            >
              <strong>{type.label}</strong>
              <p style={{ fontSize: '14px', opacity: 0.8, marginTop: '4px' }}>
                {type.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {warpType === 'spectral' && (
        <div className="grid grid-2">
          <div className="control-group">
            <label>
              Frequency Shift
              <span className="control-value">{spectralParams.frequencyShift} Hz</span>
            </label>
            <input
              type="range"
              className="slider"
              min="-500"
              max="500"
              value={spectralParams.frequencyShift}
              onChange={(e) =>
                setSpectralParams({ ...spectralParams, frequencyShift: parseInt(e.target.value) })
              }
            />
          </div>

          <div className="control-group">
            <label>
              Spectral Tilt
              <span className="control-value">{spectralParams.spectralTilt.toFixed(2)}</span>
            </label>
            <input
              type="range"
              className="slider"
              min="-1"
              max="1"
              step="0.1"
              value={spectralParams.spectralTilt}
              onChange={(e) =>
                setSpectralParams({ ...spectralParams, spectralTilt: parseFloat(e.target.value) })
              }
            />
          </div>

          <div className="control-group">
            <label>
              Harmonic Distortion
              <span className="control-value">{spectralParams.harmonicDistortion.toFixed(2)}</span>
            </label>
            <input
              type="range"
              className="slider"
              min="0"
              max="1"
              step="0.01"
              value={spectralParams.harmonicDistortion}
              onChange={(e) =>
                setSpectralParams({
                  ...spectralParams,
                  harmonicDistortion: parseFloat(e.target.value),
                })
              }
            />
          </div>
        </div>
      )}

      {warpType === 'temporal' && (
        <div className="grid grid-2">
          <div className="control-group">
            <label>
              Time Stretch
              <span className="control-value">{temporalParams.timeStretch.toFixed(2)}x</span>
            </label>
            <input
              type="range"
              className="slider"
              min="0.25"
              max="4"
              step="0.1"
              value={temporalParams.timeStretch}
              onChange={(e) =>
                setTemporalParams({ ...temporalParams, timeStretch: parseFloat(e.target.value) })
              }
            />
          </div>

          <div className="control-group">
            <label>Speed Curve</label>
            <select
              className="select"
              value={temporalParams.speedCurve}
              onChange={(e) =>
                setTemporalParams({ ...temporalParams, speedCurve: e.target.value })
              }
            >
              <option value="linear">Linear</option>
              <option value="exponential">Exponential</option>
              <option value="sine">Sine Wave</option>
            </select>
          </div>
        </div>
      )}

      {warpType === 'granular' && (
        <div className="grid grid-2">
          <div className="control-group">
            <label>
              Grain Size
              <span className="control-value">{granularParams.grainSize} ms</span>
            </label>
            <input
              type="range"
              className="slider"
              min="10"
              max="200"
              value={granularParams.grainSize}
              onChange={(e) =>
                setGranularParams({ ...granularParams, grainSize: parseInt(e.target.value) })
              }
            />
          </div>

          <div className="control-group">
            <label>
              Density
              <span className="control-value">{granularParams.density.toFixed(2)}</span>
            </label>
            <input
              type="range"
              className="slider"
              min="0.1"
              max="3"
              step="0.1"
              value={granularParams.density}
              onChange={(e) =>
                setGranularParams({ ...granularParams, density: parseFloat(e.target.value) })
              }
            />
          </div>

          <div className="control-group">
            <label>
              Randomization
              <span className="control-value">{granularParams.randomization.toFixed(2)}</span>
            </label>
            <input
              type="range"
              className="slider"
              min="0"
              max="1"
              step="0.01"
              value={granularParams.randomization}
              onChange={(e) =>
                setGranularParams({ ...granularParams, randomization: parseFloat(e.target.value) })
              }
            />
          </div>
        </div>
      )}

      <button className="button" onClick={handleWarp} disabled={isProcessing} style={{ marginTop: '16px' }}>
        {isProcessing ? (
          <>
            <span className="loading"></span> Warping Audio...
          </>
        ) : (
          '🌀 Warp Audio'
        )}
      </button>

      {result && result.success && (
        <div className="result-section">
          <h3>✅ Audio Warped!</h3>
          <div className="badge badge-success" style={{ marginTop: '8px' }}>
            Type: {result.warpType}
          </div>
          <audio controls src={result.url} style={{ width: '100%', marginTop: '16px' }} />
          <a
            href={result.url}
            download
            className="button button-secondary"
            style={{ marginTop: '16px', display: 'inline-block' }}
          >
            💾 Download
          </a>
        </div>
      )}
    </div>
  )
}
