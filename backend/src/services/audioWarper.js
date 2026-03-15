import wavefileModule from 'wavefile';
const { WaveFile } = wavefileModule;
import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Advanced audio warping and transformation
 * @param {Object} options - Warping parameters
 * @returns {Object} Warped audio file info
 */
export async function warpAudio(options) {
  const {
    inputFile,
    warpType = 'spectral',
    parameters = {},
  } = options;

  try {
    if (!fs.existsSync(inputFile)) {
      throw new Error('Input file not found');
    }

    const audioData = fs.readFileSync(inputFile);
    const wav = new WaveFile(audioData);

    if (wav.fmt.numChannels > 1) {
      wav.toMono();
    }

    const samples = wav.getSamples(false, Float32Array);
    const sampleRate = wav.fmt.sampleRate;

    let processedSamples;

    switch (warpType) {
      case 'spectral':
        processedSamples = spectralWarp(samples, sampleRate, parameters);
        break;
      case 'temporal':
        processedSamples = temporalWarp(samples, sampleRate, parameters);
        break;
      case 'granular':
        processedSamples = granularWarp(samples, sampleRate, parameters);
        break;
      case 'frequency':
        processedSamples = frequencyWarp(samples, sampleRate, parameters);
        break;
      case 'neural':
        processedSamples = await neuralWarp(samples, sampleRate, parameters);
        break;
      default:
        processedSamples = samples;
    }

    // Save output
    const outputWav = new WaveFile();
    outputWav.fromScratch(1, sampleRate, '32f', processedSamples);

    const fileId = crypto.randomUUID();
    const filename = `warped_${warpType}_${fileId}.wav`;
    const uploadsDir = path.join(__dirname, '../../uploads');
    const outputPath = path.join(uploadsDir, filename);

    fs.writeFileSync(outputPath, outputWav.toBuffer());

    return {
      filename,
      url: `/uploads/${filename}`,
      warpType,
      parameters,
    };
  } catch (error) {
    console.error('Audio warping error:', error);
    throw new Error(`Audio warping failed: ${error.message}`);
  }
}

/**
 * Spectral warping - manipulate frequency content
 */
function spectralWarp(samples, sampleRate, params) {
  const {
    frequencyShift = 100,
    spectralTilt = 0,
    harmonicDistortion = 0,
  } = params;

  const output = new Float32Array(samples.length);
  const frameSize = 2048;
  const hopSize = 512;

  // Simple spectral manipulation using modulation
  for (let i = 0; i < samples.length; i++) {
    const t = i / sampleRate;

    // Frequency shift via ring modulation
    const shiftOsc = Math.sin(2 * Math.PI * frequencyShift * t);
    let sample = samples[i] * shiftOsc;

    // Harmonic distortion
    if (harmonicDistortion > 0) {
      sample = Math.tanh(sample * (1 + harmonicDistortion * 5));
    }

    output[i] = sample;
  }

  // Apply spectral tilt (highpass/lowpass effect)
  if (spectralTilt !== 0) {
    const alpha = spectralTilt > 0 ? 0.1 : 0.9;
    let prev = 0;
    for (let i = 0; i < output.length; i++) {
      const filtered = alpha * output[i] + (1 - alpha) * prev;
      prev = filtered;
      output[i] = filtered;
    }
  }

  return normalize(output);
}

/**
 * Temporal warping - time stretching and compression
 */
function temporalWarp(samples, sampleRate, params) {
  const {
    timeStretch = 1.0, // >1 = slower, <1 = faster
    variableSpeed = false,
    speedCurve = 'linear',
  } = params;

  const outputLength = Math.floor(samples.length * timeStretch);
  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    // Variable speed based on curve
    let stretch = timeStretch;
    if (variableSpeed) {
      const progress = i / outputLength;
      switch (speedCurve) {
        case 'exponential':
          stretch = timeStretch * Math.pow(2, progress - 0.5);
          break;
        case 'sine':
          stretch = timeStretch * (1 + 0.5 * Math.sin(progress * Math.PI * 4));
          break;
        default:
          stretch = timeStretch;
      }
    }

    const sourceIdx = i / stretch;
    const idx1 = Math.floor(sourceIdx);
    const idx2 = Math.min(idx1 + 1, samples.length - 1);
    const frac = sourceIdx - idx1;

    // Linear interpolation
    if (idx1 < samples.length) {
      output[i] = samples[idx1] * (1 - frac) + samples[idx2] * frac;
    }
  }

  return output;
}

/**
 * Granular warping - extreme time manipulation
 */
function granularWarp(samples, sampleRate, params) {
  const {
    grainSize = 50,
    density = 1.0,
    randomization = 0.5,
    reverse = false,
  } = params;

  const grainSizeSamples = Math.floor((grainSize / 1000) * sampleRate);
  const output = new Float32Array(samples.length * 2);

  let outputIdx = 0;

  while (outputIdx < output.length - grainSizeSamples) {
    // Random grain selection
    const maxStart = Math.max(0, samples.length - grainSizeSamples);
    let grainStart;

    if (randomization > Math.random()) {
      grainStart = Math.floor(Math.random() * maxStart);
    } else {
      grainStart = Math.floor((outputIdx / output.length) * maxStart);
    }

    // Extract and window grain
    for (let i = 0; i < grainSizeSamples && outputIdx < output.length; i++) {
      const grainIdx = reverse ? grainSizeSamples - i - 1 : i;
      const window = 0.5 * (1 - Math.cos((2 * Math.PI * i) / grainSizeSamples));
      const sample = samples[grainStart + grainIdx] * window;

      output[outputIdx++] += sample;
    }

    // Density control
    const hop = Math.floor(grainSizeSamples / density);
    outputIdx += hop;
  }

  return normalize(output.slice(0, Math.floor(samples.length * 1.5)));
}

/**
 * Frequency warping - non-linear frequency scaling
 */
function frequencyWarp(samples, sampleRate, params) {
  const {
    lowFreqBoost = 0,
    highFreqBoost = 0,
    midFreqScoop = 0,
  } = params;

  const output = new Float32Array(samples.length);

  // Simple multi-band processing using cascaded filters
  const lowCutoff = 200;
  const highCutoff = 4000;

  for (let i = 1; i < samples.length; i++) {
    let sample = samples[i];

    // Low frequencies (simple lowpass)
    const lowSample = 0.9 * output[i - 1] + 0.1 * sample;
    const lowBoost = lowSample * lowFreqBoost;

    // High frequencies (simple highpass)
    const highSample = sample - 0.9 * samples[i - 1];
    const highBoost = highSample * highFreqBoost;

    // Mid scoop
    const midSample = sample - lowSample - highSample;
    const midAdjust = midSample * (1 - midFreqScoop);

    output[i] = lowSample + lowBoost + midAdjust + highSample + highBoost;
  }

  return normalize(output);
}

/**
 * Neural warping - AI-based transformation (placeholder for ML models)
 */
async function neuralWarp(samples, sampleRate, params) {
  // This would use TensorFlow.js or similar
  // For now, apply a complex transformation

  const {
    style = 'experimental',
    strength = 0.5,
  } = params;

  const output = new Float32Array(samples.length);

  // Complex non-linear transformation
  for (let i = 0; i < samples.length; i++) {
    let sample = samples[i];

    // Non-linear waveshaping
    sample = Math.tanh(sample * 3 * strength);

    // Add harmonics
    const t = i / sampleRate;
    const harmonic = Math.sin(2 * Math.PI * 440 * t) * sample * 0.2 * strength;

    output[i] = sample + harmonic;
  }

  return normalize(output);
}

/**
 * Normalize audio to prevent clipping
 */
function normalize(samples) {
  let maxVal = 0;
  for (let i = 0; i < samples.length; i++) {
    maxVal = Math.max(maxVal, Math.abs(samples[i]));
  }

  if (maxVal > 0) {
    for (let i = 0; i < samples.length; i++) {
      samples[i] = (samples[i] / maxVal) * 0.8;
    }
  }

  return samples;
}
