import { useState } from 'react'
import './App.css'
import AudioUploader from './components/AudioUploader'
import AudioProcessor from './components/AudioProcessor'
import SynthesisControls from './components/SynthesisControls'
import VoicePersona from './components/VoicePersona'
import DrumProcessor from './components/DrumProcessor'
import AudioWarper from './components/AudioWarper'
import MagentaGenerator from './components/MagentaGenerator'

function App() {
  const [uploadedFile, setUploadedFile] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [activeTab, setActiveTab] = useState('upload')

  const handleFileUploaded = (fileData) => {
    setUploadedFile(fileData)
    setAnalysis(fileData.analysis)
    setActiveTab('process')
  }

  const tabs = [
    { id: 'upload', label: 'Upload', icon: '📁' },
    { id: 'process', label: 'Process', icon: '⚙️', disabled: !uploadedFile },
    { id: 'synthesis', label: 'Synthesis', icon: '🎹' },
    { id: 'persona', label: 'Voice Persona', icon: '🎭', disabled: !uploadedFile },
    { id: 'drums', label: 'Drum Tools', icon: '🥁', disabled: !uploadedFile },
    { id: 'warp', label: 'Audio Warp', icon: '🌀', disabled: !uploadedFile },
    { id: 'generate', label: 'AI Generate', icon: '🤖' },
  ]

  return (
    <div className="app">
      <header className="header">
        <h1>🎵 AI Sound Designer</h1>
        <p className="subtitle">
          Advanced audio manipulation with AI • FM Synthesis • Concatenative Synthesis • Voice Personas
        </p>
      </header>

      <div className="container">
        <div className="tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => !tab.disabled && setActiveTab(tab.id)}
              disabled={tab.disabled}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="tab-content">
          {activeTab === 'upload' && (
            <AudioUploader onFileUploaded={handleFileUploaded} />
          )}

          {activeTab === 'process' && uploadedFile && (
            <AudioProcessor fileData={uploadedFile} analysis={analysis} />
          )}

          {activeTab === 'synthesis' && (
            <SynthesisControls inputFile={uploadedFile} />
          )}

          {activeTab === 'persona' && uploadedFile && (
            <VoicePersona fileData={uploadedFile} />
          )}

          {activeTab === 'drums' && uploadedFile && (
            <DrumProcessor fileData={uploadedFile} />
          )}

          {activeTab === 'warp' && uploadedFile && (
            <AudioWarper fileData={uploadedFile} />
          )}

          {activeTab === 'generate' && (
            <MagentaGenerator />
          )}
        </div>

        {uploadedFile && (
          <div className="card file-info">
            <h3>Current File</h3>
            <p><strong>File:</strong> {uploadedFile.filename}</p>
            {analysis && (
              <div className="analysis-summary">
                <span className="badge">
                  Duration: {analysis.duration?.toFixed(2)}s
                </span>
                <span className="badge">
                  Sample Rate: {analysis.sampleRate} Hz
                </span>
                <span className="badge">
                  Channels: {analysis.channels}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
