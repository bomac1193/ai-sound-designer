# AI Sound Designer

An advanced AI-powered sound design machine featuring voice personas, drum resynthesis, FM synthesis, concatenative synthesis, and audio warping.

## Features

- **Voice Personas**: Transform audio into unique personas (robotic, ethereal, granular, pitched, formant)
- **Drum Processing**: Detect, separate, and resynthesize drum sounds
- **FM Synthesis**: Advanced frequency modulation synthesis with multiple algorithms
- **Concatenative Synthesis**: Granular-based synthesis for unique textures
- **Audio Warping**: Spectral, temporal, granular, and neural transformations
- **AI Generation**: Generate new sounds with Magenta.js and ML models
- **Real-time & Batch Processing**: Support for both processing modes
- **Web-based Interface**: Beautiful, responsive React UI

## Technology Stack

### Backend
- **Fastify**: High-performance Node.js web framework
- **Essentia.js**: Audio analysis and feature extraction
- **Tone.js**: Web Audio framework
- **TensorFlow.js**: Machine learning
- **Magenta.js**: Google's music/audio ML library
- **Replicate API**: Cloud-based ML models (optional)
- **ElevenLabs API**: Professional voice transformation (optional)

### Frontend
- **React**: Component-based UI
- **Vite**: Fast build tool
- **WaveSurfer.js**: Audio waveform visualization
- **Web Audio API**: Real-time audio processing

## Installation

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn

### Setup

1. **Clone/Navigate to the project**
   ```bash
   cd ai-sound-designer
   ```

2. **Install all dependencies**
   ```bash
   npm run install-all
   ```

3. **Configure environment (optional)**
   ```bash
   cd backend
   cp .env.example .env
   # Edit .env and add your API keys if you have them
   ```

4. **Start the development servers**
   ```bash
   # From the root directory
   npm run dev
   ```

   This will start:
   - Backend API: http://localhost:3000
   - Frontend UI: http://localhost:5173

## Usage

### Basic Workflow

1. **Upload Audio**
   - Drag and drop an audio file or click to browse
   - Supports WAV, MP3, OGG, FLAC formats
   - File is automatically analyzed

2. **Choose a Processing Mode**
   - **Process**: View waveform and analysis
   - **Synthesis**: Apply FM or concatenative synthesis
   - **Voice Persona**: Create unique voice transformations
   - **Drum Tools**: Detect and separate drums
   - **Audio Warp**: Apply spectral/temporal warping
   - **AI Generate**: Create new sounds from scratch

3. **Adjust Parameters**
   - Use sliders and controls to customize the effect
   - Preview in real-time when possible

4. **Process & Download**
   - Click the process button
   - Listen to the result
   - Download the processed audio

## Features Guide

### FM Synthesis
Create complex timbres using frequency modulation:
- **Carrier Frequency**: Base frequency (20-2000 Hz)
- **Modulator Frequency**: Modulation frequency (20-2000 Hz)
- **Modulation Index**: Intensity of modulation (0-20)
- **Algorithms**: Classic, Parallel, Cascade, Feedback
- **Operators**: Number of FM operators (2-6)

### Concatenative Synthesis
Rearrange audio grains to create new textures:
- **Grain Size**: Size of audio chunks (10-500ms)
- **Hop Size**: Overlap between grains (5-250ms)
- **Matching Algorithm**: MFCC, Spectral, Energy, Random

### Voice Personas
Transform voices with AI:
- **Robotic**: Vocoder-style effect
- **Ethereal**: Reverb and shimmer
- **Granular**: Time-stretched textures
- **Pitched**: Pitch shifting
- **Formant**: Vowel manipulation

### Drum Processing
Analyze and separate drum sounds:
- Automatic detection of kicks, snares, hi-hats, cymbals
- Separate stems for each drum type
- Resynthesis with FM or concatenative techniques

### Audio Warping
Transform audio in creative ways:
- **Spectral**: Frequency domain manipulation
- **Temporal**: Time stretching/compression
- **Granular**: Extreme grain-based processing
- **Frequency**: Multi-band warping
- **Neural**: AI-based transformation

## API Endpoints

### Audio Upload & Analysis
- `POST /api/audio/upload` - Upload and analyze audio
- `GET /api/audio/analyze/:fileId` - Get audio analysis
- `POST /api/audio/drums/separate` - Detect and separate drums

### Synthesis
- `POST /api/synthesis/fm` - FM synthesis
- `POST /api/synthesis/concatenative` - Concatenative synthesis
- `POST /api/synthesis/drums/resynthesize` - Drum resynthesis

### ML & AI
- `POST /api/ml/persona/create` - Create voice persona
- `POST /api/ml/warp` - Audio warping
- `POST /api/ml/magenta/generate` - Magenta generation
- `POST /api/ml/replicate/process` - Replicate API processing

## Configuration

### Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Server
PORT=3000
HOST=0.0.0.0
FRONTEND_URL=http://localhost:5173

# Optional API Keys
REPLICATE_API_KEY=your_replicate_api_key
ELEVENLABS_API_KEY=your_elevenlabs_api_key
```

**Note**: The app works without API keys using local processing. API keys unlock advanced features.

## Development

### Project Structure

```
ai-sound-designer/
├── backend/
│   ├── src/
│   │   ├── server.js           # Main server
│   │   ├── routes/             # API routes
│   │   │   ├── audio.js
│   │   │   ├── synthesis.js
│   │   │   └── ml.js
│   │   └── services/           # Processing logic
│   │       ├── audioAnalysis.js
│   │       ├── drumProcessor.js
│   │       ├── fmSynthesizer.js
│   │       ├── concatenativeSynthesizer.js
│   │       ├── voicePersona.js
│   │       ├── audioWarper.js
│   │       ├── magentaService.js
│   │       └── replicateService.js
│   └── uploads/                # Uploaded files
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Main app component
│   │   ├── components/        # React components
│   │   │   ├── AudioUploader.jsx
│   │   │   ├── AudioProcessor.jsx
│   │   │   ├── SynthesisControls.jsx
│   │   │   ├── VoicePersona.jsx
│   │   │   ├── DrumProcessor.jsx
│   │   │   ├── AudioWarper.jsx
│   │   │   └── MagentaGenerator.jsx
│   │   └── index.css          # Styles
│   └── public/
└── package.json               # Root package.json
```

### Available Scripts

```bash
# Install all dependencies
npm run install-all

# Start both backend and frontend
npm run dev

# Start backend only
npm run dev:backend

# Start frontend only
npm run dev:frontend

# Build frontend for production
npm run build

# Start production server
npm start
```

## Tips & Best Practices

### Audio Quality
- Use WAV files for best quality
- 44.1kHz or 48kHz sample rate recommended
- Mono or stereo supported

### Processing
- Start with default parameters and adjust gradually
- Extreme settings can produce unexpected results (this is a feature!)
- Experiment with combining multiple effects

### Performance
- Large files (>100MB) may take longer to process
- Real-time features work best with shorter clips
- Batch processing recommended for heavy transformations

## Troubleshooting

### Backend won't start
- Check if port 3000 is available
- Ensure Node.js v18+ is installed
- Run `npm install` in backend directory

### Frontend won't start
- Check if port 5173 is available
- Ensure dependencies are installed
- Clear browser cache

### Audio upload fails
- Check file size (<100MB)
- Ensure file is valid audio format
- Check backend logs for errors

### Processing errors
- Some features require specific audio characteristics
- Try different parameters
- Check console for detailed error messages

## Advanced Features

### Using Replicate API
1. Sign up at https://replicate.com
2. Get your API key
3. Add to `.env` file
4. Access features like MusicGen and audio separation

### Using ElevenLabs
1. Sign up at https://elevenlabs.io
2. Get your API key
3. Add to `.env` file
4. Enhanced voice persona transformations

## Contributing

This is a personal project, but suggestions and improvements are welcome!

## License

MIT License

## Acknowledgments

- Magenta.js by Google
- Essentia.js
- Tone.js
- WaveSurfer.js
- Fastify
- React

---

**Made with ❤️ for experimental sound design**
