import { useState, useEffect, useRef } from 'react'
import WaveSurfer from 'wavesurfer.js'

export default function AudioProcessor({ fileData, analysis }) {
  const [isPlaying, setIsPlaying] = useState(false)
  const waveformRef = useRef(null)
  const wavesurferRef = useRef(null)

  useEffect(() => {
    if (waveformRef.current && fileData) {
      // Initialize WaveSurfer
      wavesurferRef.current = WaveSurfer.create({
        container: waveformRef.current,
        waveColor: '#f093fb',
        progressColor: '#667eea',
        cursorColor: '#fff',
        barWidth: 2,
        barRadius: 3,
        cursorWidth: 1,
        height: 128,
        barGap: 3,
      })

      wavesurferRef.current.load(fileData.url)

      wavesurferRef.current.on('play', () => setIsPlaying(true))
      wavesurferRef.current.on('pause', () => setIsPlaying(false))

      return () => {
        if (wavesurferRef.current) {
          wavesurferRef.current.destroy()
        }
      }
    }
  }, [fileData])

  const handlePlayPause = () => {
    if (wavesurferRef.current) {
      wavesurferRef.current.playPause()
    }
  }

  return (
    <div className="card">
      <h2>Audio Analysis & Playback</h2>

      <div className="waveform-container">
        <div ref={waveformRef}></div>
        <div className="flex" style={{ marginTop: '16px', justifyContent: 'center' }}>
          <button className="button" onClick={handlePlayPause}>
            {isPlaying ? '⏸️ Pause' : '▶️ Play'}
          </button>
        </div>
      </div>

      {analysis && (
        <div className="grid grid-2" style={{ marginTop: '24px' }}>
          <div className="card" style={{ background: 'rgba(0, 0, 0, 0.3)' }}>
            <h3>Basic Info</h3>
            <p><strong>Duration:</strong> {analysis.duration?.toFixed(2)} seconds</p>
            <p><strong>Sample Rate:</strong> {analysis.sampleRate} Hz</p>
            <p><strong>Channels:</strong> {analysis.channels}</p>
          </div>

          {analysis.features && (
            <div className="card" style={{ background: 'rgba(0, 0, 0, 0.3)' }}>
              <h3>Audio Features</h3>
              {analysis.features.energy && (
                <div>
                  <p><strong>RMS Energy:</strong> {analysis.features.energy.rms?.toFixed(4)}</p>
                  <p><strong>Zero Crossing Rate:</strong> {analysis.features.energy.zcr?.toFixed(4)}</p>
                </div>
              )}
              {analysis.features.spectral && (
                <div>
                  <p><strong>Spectral Centroid:</strong> {analysis.features.spectral.centroid?.toFixed(2)} Hz</p>
                  <p><strong>Spectral Rolloff:</strong> {analysis.features.spectral.rolloff?.toFixed(2)} Hz</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="card" style={{ background: 'rgba(0, 0, 0, 0.2)', marginTop: '24px' }}>
        <h3>Next Steps</h3>
        <p>Use the tabs above to:</p>
        <ul style={{ marginLeft: '20px', marginTop: '12px' }}>
          <li>Apply synthesis techniques (FM, Concatenative)</li>
          <li>Create voice personas</li>
          <li>Process drums</li>
          <li>Warp the audio</li>
        </ul>
      </div>
    </div>
  )
}
