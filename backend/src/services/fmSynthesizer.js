import wavefileModule from 'wavefile';
const { WaveFile } = wavefileModule;
import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Advanced FM Synthesis Engine
 * @param {Object} options - Synthesis parameters
 * @returns {Object} Generated audio file info
 */
export async function fmSynthesis(options) {
  const {
    inputFile = null,
    carrierFreq = 440,
    modulatorFreq = 220,
    modulationIndex = 5,
    envelope = { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.5 },
    duration = 2,
    sampleRate = 44100,
    operators = 2, // Number of FM operators (2-6)
    algorithm = 'classic', // 'classic', 'parallel', 'cascade', 'feedback'
  } = options;

  try {
    let analysisData = null;

    // If input file provided, analyze it to extract characteristics
    if (inputFile && fs.existsSync(inputFile)) {
      const audioData = fs.readFileSync(inputFile);
      const wav = new WaveFile(audioData);

      if (wav.fmt.numChannels > 1) {
        wav.toMono();
      }

      const inputSamples = wav.getSamples(false, Float32Array);
      analysisData = analyzeForFM(inputSamples, wav.fmt.sampleRate);
    }

    // Use analysis data to inform synthesis if available
    const params = analysisData ? {
      carrierFreq: analysisData.fundamentalFreq || carrierFreq,
      modulatorFreq: analysisData.fundamentalFreq * 0.5 || modulatorFreq,
      modulationIndex: analysisData.harmonicComplexity * 10 || modulationIndex,
    } : { carrierFreq, modulatorFreq, modulationIndex };

    // Generate FM synthesis
    const samples = generateFM({
      ...params,
      envelope,
      duration,
      sampleRate,
      operators,
      algorithm,
    });

    // Save output
    const outputWav = new WaveFile();
    outputWav.fromScratch(1, sampleRate, '32f', samples);

    const fileId = crypto.randomUUID();
    const filename = `fm_synthesis_${fileId}.wav`;
    const uploadsDir = path.join(__dirname, '../../uploads');
    const outputPath = path.join(uploadsDir, filename);

    fs.writeFileSync(outputPath, outputWav.toBuffer());

    return {
      filename,
      url: `/uploads/${filename}`,
      parameters: {
        carrierFreq: params.carrierFreq,
        modulatorFreq: params.modulatorFreq,
        modulationIndex: params.modulationIndex,
        operators,
        algorithm,
      },
      analysis: analysisData,
    };
  } catch (error) {
    console.error('FM synthesis error:', error);
    throw new Error(`FM synthesis failed: ${error.message}`);
  }
}

/**
 * Generate FM synthesis samples
 */
function generateFM(params) {
  const {
    carrierFreq,
    modulatorFreq,
    modulationIndex,
    envelope,
    duration,
    sampleRate,
    operators,
    algorithm,
  } = params;

  const numSamples = Math.floor(duration * sampleRate);
  const samples = new Float32Array(numSamples);

  // ADSR envelope
  const attackSamples = Math.floor(envelope.attack * sampleRate);
  const decaySamples = Math.floor(envelope.decay * sampleRate);
  const releaseSamples = Math.floor(envelope.release * sampleRate);
  const sustainSamples = numSamples - attackSamples - decaySamples - releaseSamples;

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;

    // Calculate envelope value
    let envValue = 0;
    if (i < attackSamples) {
      envValue = i / attackSamples;
    } else if (i < attackSamples + decaySamples) {
      const decayProgress = (i - attackSamples) / decaySamples;
      envValue = 1 - decayProgress * (1 - envelope.sustain);
    } else if (i < attackSamples + decaySamples + sustainSamples) {
      envValue = envelope.sustain;
    } else {
      const releaseProgress = (i - attackSamples - decaySamples - sustainSamples) / releaseSamples;
      envValue = envelope.sustain * (1 - releaseProgress);
    }

    // FM synthesis based on algorithm
    let sample = 0;

    switch (algorithm) {
      case 'classic':
        // Classic 2-operator FM
        const modulator = Math.sin(2 * Math.PI * modulatorFreq * t);
        sample = Math.sin(2 * Math.PI * carrierFreq * t + modulationIndex * modulator);
        break;

      case 'parallel':
        // Parallel operators
        for (let op = 0; op < operators; op++) {
          const opFreq = carrierFreq * (op + 1) * 0.5;
          sample += Math.sin(2 * Math.PI * opFreq * t) / operators;
        }
        break;

      case 'cascade':
        // Cascaded FM (each operator modulates the next)
        let phase = 0;
        for (let op = operators - 1; op >= 0; op--) {
          const opFreq = modulatorFreq * (op + 1);
          phase = Math.sin(2 * Math.PI * opFreq * t + modulationIndex * phase);
        }
        sample = Math.sin(2 * Math.PI * carrierFreq * t + modulationIndex * phase);
        break;

      case 'feedback':
        // FM with feedback
        const prevSample = i > 0 ? samples[i - 1] : 0;
        const mod = Math.sin(2 * Math.PI * modulatorFreq * t + 0.5 * prevSample);
        sample = Math.sin(2 * Math.PI * carrierFreq * t + modulationIndex * mod);
        break;

      default:
        // Classic FM
        const mod2 = Math.sin(2 * Math.PI * modulatorFreq * t);
        sample = Math.sin(2 * Math.PI * carrierFreq * t + modulationIndex * mod2);
    }

    samples[i] = sample * envValue * 0.8; // Apply envelope and scale
  }

  return samples;
}

/**
 * Analyze input audio to extract FM synthesis parameters
 */
function analyzeForFM(samples, sampleRate) {
  // Simple autocorrelation-based pitch detection
  const bufferSize = 2048;
  const buffer = samples.slice(0, Math.min(bufferSize, samples.length));

  let maxCorr = 0;
  let maxLag = 0;

  // Autocorrelation
  for (let lag = 1; lag < bufferSize / 2; lag++) {
    let corr = 0;
    for (let i = 0; i < bufferSize - lag; i++) {
      corr += buffer[i] * buffer[i + lag];
    }

    if (corr > maxCorr) {
      maxCorr = corr;
      maxLag = lag;
    }
  }

  const fundamentalFreq = maxLag > 0 ? sampleRate / maxLag : 440;

  // Calculate harmonic complexity (spectral spread)
  let sumSquares = 0;
  for (let i = 0; i < buffer.length; i++) {
    sumSquares += buffer[i] * buffer[i];
  }
  const rms = Math.sqrt(sumSquares / buffer.length);
  const harmonicComplexity = Math.min(rms * 10, 1);

  return {
    fundamentalFreq: Math.max(20, Math.min(20000, fundamentalFreq)),
    harmonicComplexity,
  };
}
