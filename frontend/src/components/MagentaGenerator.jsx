import { useState } from 'react'

export default function MagentaGenerator() {
  const [model, setModel] = useState('musicvae')
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState(null)

  const [musicVaeParams, setMusicVaeParams] = useState({
    temperature: 0.5,
    steps: 32,
  })

  const [ddspParams, setDdspParams] = useState({
    pitch: 440,
    timbre: 0.5,
  })

  const [ganSynthParams, setGanSynthParams] = useState({
    pitch: 60,
    interpolate: false,
  })

  const [musicGenPrompt, setMusicGenPrompt] = useState('electronic drum loop with heavy bass')

  const models = [
    { value: 'musicvae', label: '🎼 MusicVAE', description: 'Generate melodic variations' },
    { value: 'ddsp', label: '🎹 DDSP', description: 'Differentiable digital signal processing' },
    { value: 'gansynth', label: '🎸 GANSynth', description: 'GAN-based synthesis' },
    { value: 'musicgen', label: '🎵 MusicGen', description: 'Text-to-music generation (via Replicate)' },
  ]

  const handleGenerate = async () => {
    setIsProcessing(true)
    setResult(null)

    let parameters = {}
    let endpoint = '/api/ml/magenta/generate'

    if (model === 'musicgen') {
      endpoint = '/api/ml/replicate/process'
      parameters = {
        model: 'musicgen',
        parameters: {
          prompt: musicGenPrompt,
          duration: 8,
        },
      }
    } else {
      switch (model) {
        case 'musicvae':
          parameters = musicVaeParams
          break
        case 'ddsp':
          parameters = ddspParams
          break
        case 'gansynth':
          parameters = ganSynthParams
          break
      }
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          model === 'musicgen'
            ? parameters
            : {
                model,
                parameters,
              }
        ),
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Generation error:', error)
      alert('Generation failed: ' + error.message)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="card">
      <h2>🤖 AI Sound Generator</h2>
      <p style={{ opacity: 0.8, marginBottom: '24px' }}>
        Generate new sounds from scratch using AI and machine learning models
      </p>

      <div className="control-group">
        <label>Model</label>
        <div className="grid grid-2">
          {models.map((m) => (
            <div
              key={m.value}
              className={`card`}
              style={{
                cursor: 'pointer',
                padding: '16px',
                background:
                  model === m.value
                    ? 'linear-gradient(135deg, var(--primary), var(--secondary))'
                    : 'rgba(255, 255, 255, 0.1)',
                border: model === m.value ? '2px solid var(--accent)' : 'none',
              }}
              onClick={() => setModel(m.value)}
            >
              <strong>{m.label}</strong>
              <p style={{ fontSize: '14px', opacity: 0.8, marginTop: '4px' }}>{m.description}</p>
            </div>
          ))}
        </div>
      </div>

      {model === 'musicvae' && (
        <div className="grid grid-2">
          <div className="control-group">
            <label>
              Temperature
              <span className="control-value">{musicVaeParams.temperature.toFixed(2)}</span>
            </label>
            <input
              type="range"
              className="slider"
              min="0"
              max="1"
              step="0.01"
              value={musicVaeParams.temperature}
              onChange={(e) =>
                setMusicVaeParams({ ...musicVaeParams, temperature: parseFloat(e.target.value) })
              }
            />
          </div>

          <div className="control-group">
            <label>
              Steps
              <span className="control-value">{musicVaeParams.steps}</span>
            </label>
            <input
              type="range"
              className="slider"
              min="8"
              max="64"
              step="8"
              value={musicVaeParams.steps}
              onChange={(e) =>
                setMusicVaeParams({ ...musicVaeParams, steps: parseInt(e.target.value) })
              }
            />
          </div>
        </div>
      )}

      {model === 'ddsp' && (
        <div className="grid grid-2">
          <div className="control-group">
            <label>
              Pitch
              <span className="control-value">{ddspParams.pitch} Hz</span>
            </label>
            <input
              type="range"
              className="slider"
              min="100"
              max="2000"
              value={ddspParams.pitch}
              onChange={(e) => setDdspParams({ ...ddspParams, pitch: parseInt(e.target.value) })}
            />
          </div>

          <div className="control-group">
            <label>
              Timbre
              <span className="control-value">{ddspParams.timbre.toFixed(2)}</span>
            </label>
            <input
              type="range"
              className="slider"
              min="0"
              max="1"
              step="0.01"
              value={ddspParams.timbre}
              onChange={(e) =>
                setDdspParams({ ...ddspParams, timbre: parseFloat(e.target.value) })
              }
            />
          </div>
        </div>
      )}

      {model === 'gansynth' && (
        <div className="grid grid-2">
          <div className="control-group">
            <label>
              MIDI Pitch
              <span className="control-value">{ganSynthParams.pitch}</span>
            </label>
            <input
              type="range"
              className="slider"
              min="21"
              max="108"
              value={ganSynthParams.pitch}
              onChange={(e) =>
                setGanSynthParams({ ...ganSynthParams, pitch: parseInt(e.target.value) })
              }
            />
          </div>
        </div>
      )}

      {model === 'musicgen' && (
        <div className="control-group">
          <label>Prompt</label>
          <input
            type="text"
            className="input"
            value={musicGenPrompt}
            onChange={(e) => setMusicGenPrompt(e.target.value)}
            placeholder="e.g., electronic drum loop with heavy bass"
          />
          <p style={{ fontSize: '14px', opacity: 0.7, marginTop: '8px' }}>
            Requires Replicate API key. Describe the music you want to generate.
          </p>
        </div>
      )}

      <button className="button" onClick={handleGenerate} disabled={isProcessing} style={{ marginTop: '16px' }}>
        {isProcessing ? (
          <>
            <span className="loading"></span> Generating...
          </>
        ) : (
          '🎵 Generate Audio'
        )}
      </button>

      {result && result.success && (
        <div className="result-section">
          <h3>✅ Audio Generated!</h3>
          {result.note && (
            <p style={{ fontSize: '14px', opacity: 0.8, marginTop: '8px' }}>{result.note}</p>
          )}
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

      <div className="card" style={{ background: 'rgba(0, 0, 0, 0.2)', marginTop: '24px' }}>
        <h4>ℹ️ Model Info</h4>
        <ul style={{ marginLeft: '20px', marginTop: '8px' }}>
          <li>
            <strong>MusicVAE:</strong> Generates variations of musical patterns
          </li>
          <li>
            <strong>DDSP:</strong> Differentiable synthesizer for expressive sounds
          </li>
          <li>
            <strong>GANSynth:</strong> GAN-based instrument synthesis
          </li>
          <li>
            <strong>MusicGen:</strong> Meta's text-to-music model (requires API key)
          </li>
        </ul>
      </div>
    </div>
  )
}
