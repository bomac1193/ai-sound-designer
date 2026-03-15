import wavefileModule from 'wavefile';
const { WaveFile } = wavefileModule;
import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import Essentia from 'essentia.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create voice personas from input audio
 * @param {Object} options - Persona creation parameters
 * @returns {Object} Generated persona audio
 */
export async function createVoicePersona(options) {
  const {
    inputFile,
    personaType = 'robotic',
    intensity = 0.5,
    useElevenLabs = false,
  } = options;

  try {
    if (!fs.existsSync(inputFile)) {
      throw new Error('Input file not found');
    }

    // Load audio
    const audioData = fs.readFileSync(inputFile);
    const wav = new WaveFile(audioData);

    if (wav.fmt.numChannels > 1) {
      wav.toMono();
    }

    const samples = wav.getSamples(false, Float32Array);
    const sampleRate = wav.fmt.sampleRate;

    let processedSamples;

    // Apply persona transformation
    switch (personaType) {
      case 'robotic':
        processedSamples = applyRoboticEffect(samples, sampleRate, intensity);
        break;
      case 'ethereal':
        processedSamples = applyEtherealEffect(samples, sampleRate, intensity);
        break;
      case 'granular':
        processedSamples = applyGranularEffect(samples, sampleRate, intensity);
        break;
      case 'pitched':
        processedSamples = applyPitchShift(samples, sampleRate, intensity);
        break;
      case 'formant':
        processedSamples = applyFormantShift(samples, sampleRate, intensity);
        break;
      default:
        processedSamples = samples;
    }

    // Save output
    const outputWav = new WaveFile();
    outputWav.fromScratch(1, sampleRate, '32f', processedSamples);

    const fileId = crypto.randomUUID();
    const filename = `persona_${personaType}_${fileId}.wav`;
    const uploadsDir = path.join(__dirname, '../../uploads');
    const outputPath = path.join(uploadsDir, filename);

    fs.writeFileSync(outputPath, outputWav.toBuffer());

    return {
      filename,
      url: `/uploads/${filename}`,
      personaType,
      intensity,
      usingElevenLabs: useElevenLabs,
    };
  } catch (error) {
    console.error('Voice persona error:', error);
    throw new Error(`Voice persona creation failed: ${error.message}`);
  }
}

/**
 * Apply robotic vocoder effect
 */
function applyRoboticEffect(samples, sampleRate, intensity) {
  const output = new Float32Array(samples.length);
  const carrierFreq = 200; // Hz

  for (let i = 0; i < samples.length; i++) {
    const t = i / sampleRate;
    const carrier = Math.sin(2 * Math.PI * carrierFreq * t);

    // Ring modulation
    output[i] = samples[i] * carrier * intensity + samples[i] * (1 - intensity);
  }

  return output;
}

/**
 * Apply ethereal reverb/shimmer effect
 */
function applyEtherealEffect(samples, sampleRate, intensity) {
  const output = new Float32Array(samples.length);
  const delayTime = Math.floor(0.05 * sampleRate); // 50ms delay
  const feedback = 0.5 * intensity;

  for (let i = 0; i < samples.length; i++) {
    let sample = samples[i];

    // Add delayed signal
    if (i >= delayTime) {
      sample += output[i - delayTime] * feedback;
    }

    // Pitch shift up slightly for shimmer
    const shiftAmount = 1 + 0.2 * intensity;
    const sourceIdx = Math.floor(i / shiftAmount);
    if (sourceIdx < samples.length) {
      sample += samples[sourceIdx] * 0.3 * intensity;
    }

    output[i] = sample * 0.7; // Normalize
  }

  return output;
}

/**
 * Apply granular time-stretching effect
 */
function applyGranularEffect(samples, sampleRate, intensity) {
  const grainSize = Math.floor(0.05 * sampleRate); // 50ms grains
  const hopSize = Math.floor(grainSize * (1 - 0.5 * intensity)); // Overlap based on intensity
  const output = new Float32Array(Math.floor(samples.length * (1 + intensity)));

  let outputIdx = 0;

  for (let i = 0; i < samples.length - grainSize; i += hopSize) {
    // Extract grain
    for (let j = 0; j < grainSize && outputIdx < output.length; j++) {
      // Apply Hann window
      const window = 0.5 * (1 - Math.cos((2 * Math.PI * j) / grainSize));
      const sample = samples[i + j] * window;

      if (outputIdx < output.length) {
        output[outputIdx++] += sample;
      }
    }

    // Random repositioning for granular effect
    if (Math.random() < intensity) {
      const randomOffset = Math.floor(Math.random() * grainSize * 2);
      outputIdx += randomOffset;
    }
  }

  // Normalize
  let maxVal = 0;
  for (let i = 0; i < output.length; i++) {
    maxVal = Math.max(maxVal, Math.abs(output[i]));
  }
  if (maxVal > 0) {
    for (let i = 0; i < output.length; i++) {
      output[i] = (output[i] / maxVal) * 0.8;
    }
  }

  return output;
}

/**
 * Simple pitch shift
 */
function applyPitchShift(samples, sampleRate, intensity) {
  const shiftAmount = 1 + (intensity - 0.5) * 0.5; // Range: 0.75 to 1.25
  const outputLength = Math.floor(samples.length / shiftAmount);
  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const sourceIdx = i * shiftAmount;
    const idx1 = Math.floor(sourceIdx);
    const idx2 = Math.min(idx1 + 1, samples.length - 1);
    const frac = sourceIdx - idx1;

    // Linear interpolation
    output[i] = samples[idx1] * (1 - frac) + samples[idx2] * frac;
  }

  return output;
}

/**
 * Formant shift (vowel manipulation)
 */
function applyFormantShift(samples, sampleRate, intensity) {
  // Simple formant shift using comb filtering
  const output = new Float32Array(samples.length);
  const formantShift = 1 + (intensity - 0.5) * 0.3;
  const delayTime = Math.floor((sampleRate / 1000) * formantShift); // ~1ms base delay

  for (let i = 0; i < samples.length; i++) {
    let sample = samples[i];

    // Comb filter
    if (i >= delayTime) {
      sample += samples[i - delayTime] * 0.5;
    }

    output[i] = sample * 0.7;
  }

  return output;
}

/**
 * Use ElevenLabs API for voice transformation (placeholder)
 */
async function useElevenLabsAPI(inputFile, personaType) {
  // This would integrate with ElevenLabs API
  // Requires API key in environment variables

  const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;

  if (!ELEVENLABS_API_KEY) {
    console.warn('ElevenLabs API key not found, skipping');
    return null;
  }

  // TODO: Implement ElevenLabs API integration
  // https://elevenlabs.io/docs/api-reference

  return null;
}
