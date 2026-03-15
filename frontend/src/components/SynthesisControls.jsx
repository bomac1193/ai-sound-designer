import { useState } from 'react'

export default function SynthesisControls({ inputFile }) {
  const [synthesisType, setSynthesisType] = useState('fm')
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState(null)

  // FM Synthesis params
  const [fmParams, setFmParams] = useState({
    carrierFreq: 440,
    modulatorFreq: 220,
    modulationIndex: 5,
    operators: 2,
    algorithm: 'classic',
    duration: 2,
  })

  // Concatenative params
  const [concatParams, setConcatParams] = useState({
    grainSize: 100,
    hopSize: 50,
    matchingAlgorithm: 'mfcc',
  })

  const handleFmSynthesize = async () => {
    setIsProcessing(true)
    setResult(null)

    try {
      const response = await fetch('/api/synthesis/fm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: inputFile?.fileId,
          ...fmParams,
        }),
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('FM synthesis error:', error)
      alert('FM synthesis failed: ' + error.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleConcatenativeSynthesize = async () => {
    if (!inputFile) {
      alert('Please upload a file first')
      return
    }

    setIsProcessing(true)
    setResult(null)

    try {
      const response = await fetch('/api/synthesis/concatenative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId: inputFile.fileId,
          ...concatParams,
        }),
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Concatenative synthesis error:', error)
      alert('Concatenative synthesis failed: ' + error.message)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="card">
      <h2>Synthesis Engine</h2>

      <div className="control-group">
        <label>Synthesis Type</label>
        <select
          className="select"
          value={synthesisType}
          onChange={(e) => setSynthesisType(e.target.value)}
        >
          <option value="fm">FM Synthesis</option>
          <option value="concatenative">Concatenative Synthesis</option>
        </select>
      </div>

      {synthesisType === 'fm' && (
        <div className="grid grid-2">
          <div className="control-group">
            <label>
              Carrier Frequency: {fmParams.carrierFreq} Hz
              <span className="control-value">{fmParams.carrierFreq} Hz</span>
            </label>
            <input
              type="range"
              className="slider"
              min="20"
              max="2000"
              value={fmParams.carrierFreq}
              onChange={(e) =>
                setFmParams({ ...fmParams, carrierFreq: parseInt(e.target.value) })
              }
            />
          </div>

          <div className="control-group">
            <label>
              Modulator Frequency: {fmParams.modulatorFreq} Hz
              <span className="control-value">{fmParams.modulatorFreq} Hz</span>
            </label>
            <input
              type="range"
              className="slider"
              min="20"
              max="2000"
              value={fmParams.modulatorFreq}
              onChange={(e) =>
                setFmParams({ ...fmParams, modulatorFreq: parseInt(e.target.value) })
              }
            />
          </div>

          <div className="control-group">
            <label>
              Modulation Index
              <span className="control-value">{fmParams.modulationIndex}</span>
            </label>
            <input
              type="range"
              className="slider"
              min="0"
              max="20"
              step="0.1"
              value={fmParams.modulationIndex}
              onChange={(e) =>
                setFmParams({ ...fmParams, modulationIndex: parseFloat(e.target.value) })
              }
            />
          </div>

          <div className="control-group">
            <label>Algorithm</label>
            <select
              className="select"
              value={fmParams.algorithm}
              onChange={(e) => setFmParams({ ...fmParams, algorithm: e.target.value })}
            >
              <option value="classic">Classic</option>
              <option value="parallel">Parallel</option>
              <option value="cascade">Cascade</option>
              <option value="feedback">Feedback</option>
            </select>
          </div>

          <div className="control-group">
            <label>
              Operators
              <span className="control-value">{fmParams.operators}</span>
            </label>
            <input
              type="range"
              className="slider"
              min="2"
              max="6"
              value={fmParams.operators}
              onChange={(e) =>
                setFmParams({ ...fmParams, operators: parseInt(e.target.value) })
              }
            />
          </div>

          <div className="control-group">
            <label>
              Duration (seconds)
              <span className="control-value">{fmParams.duration}s</span>
            </label>
            <input
              type="range"
              className="slider"
              min="0.5"
              max="10"
              step="0.5"
              value={fmParams.duration}
              onChange={(e) =>
                setFmParams({ ...fmParams, duration: parseFloat(e.target.value) })
              }
            />
          </div>
        </div>
      )}

      {synthesisType === 'concatenative' && (
        <div className="grid grid-2">
          <div className="control-group">
            <label>
              Grain Size (ms)
              <span className="control-value">{concatParams.grainSize} ms</span>
            </label>
            <input
              type="range"
              className="slider"
              min="10"
              max="500"
              value={concatParams.grainSize}
              onChange={(e) =>
                setConcatParams({ ...concatParams, grainSize: parseInt(e.target.value) })
              }
            />
          </div>

          <div className="control-group">
            <label>
              Hop Size (ms)
              <span className="control-value">{concatParams.hopSize} ms</span>
            </label>
            <input
              type="range"
              className="slider"
              min="5"
              max="250"
              value={concatParams.hopSize}
              onChange={(e) =>
                setConcatParams({ ...concatParams, hopSize: parseInt(e.target.value) })
              }
            />
          </div>

          <div className="control-group">
            <label>Matching Algorithm</label>
            <select
              className="select"
              value={concatParams.matchingAlgorithm}
              onChange={(e) =>
                setConcatParams({ ...concatParams, matchingAlgorithm: e.target.value })
              }
            >
              <option value="mfcc">MFCC (timbre)</option>
              <option value="spectral">Spectral</option>
              <option value="energy">Energy</option>
              <option value="random">Random</option>
            </select>
          </div>
        </div>
      )}

      <div style={{ marginTop: '24px' }}>
        <button
          className="button"
          onClick={synthesisType === 'fm' ? handleFmSynthesize : handleConcatenativeSynthesize}
          disabled={isProcessing || (synthesisType === 'concatenative' && !inputFile)}
        >
          {isProcessing ? (
            <>
              <span className="loading"></span> Processing...
            </>
          ) : (
            `Generate ${synthesisType === 'fm' ? 'FM' : 'Concatenative'} Synthesis`
          )}
        </button>
      </div>

      {result && result.success && (
        <div className="result-section">
          <h3>✅ Synthesis Complete!</h3>
          <audio controls src={result.url} style={{ width: '100%', marginTop: '16px' }} />
          <a href={result.url} download className="button button-secondary" style={{ marginTop: '16px', display: 'inline-block' }}>
            💾 Download
          </a>
        </div>
      )}
    </div>
  )
}
