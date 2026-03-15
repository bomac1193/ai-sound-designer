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
 * Concatenative Synthesis Engine
 * Breaks audio into grains and rearranges them based on target pattern
 * @param {Object} options - Synthesis parameters
 * @returns {Object} Generated audio file info
 */
export async function concatenativeSynthesis(options) {
  const {
    inputFile,
    targetPattern = null,
    grainSize = 100, // milliseconds
    hopSize = 50, // milliseconds
    matchingAlgorithm = 'mfcc', // 'mfcc', 'spectral', 'energy', 'random'
    targetDuration = null,
  } = options;

  try {
    if (!fs.existsSync(inputFile)) {
      throw new Error('Input file not found');
    }

    // Load source audio
    const audioData = fs.readFileSync(inputFile);
    const wav = new WaveFile(audioData);

    if (wav.fmt.numChannels > 1) {
      wav.toMono();
    }

    const samples = wav.getSamples(false, Float32Array);
    const sampleRate = wav.fmt.sampleRate;

    // Segment audio into grains
    const grains = segmentIntoGrains(samples, sampleRate, grainSize, hopSize);

    // Extract features for each grain
    const grainFeatures = grains.map((grain) => extractGrainFeatures(grain, sampleRate, matchingAlgorithm));

    // Build new audio by selecting and concatenating grains
    let selectedGrains;

    if (targetPattern) {
      // Match grains to target pattern
      selectedGrains = matchGrainsToPattern(grains, grainFeatures, targetPattern, matchingAlgorithm);
    } else {
      // Rearrange based on feature similarity (create variation)
      selectedGrains = rearrangeGrains(grains, grainFeatures, matchingAlgorithm);
    }

    // Concatenate grains with crossfading
    const outputSamples = concatenateGrains(selectedGrains, sampleRate);

    // Save output
    const outputWav = new WaveFile();
    outputWav.fromScratch(1, sampleRate, '32f', outputSamples);

    const fileId = crypto.randomUUID();
    const filename = `concatenative_${fileId}.wav`;
    const uploadsDir = path.join(__dirname, '../../uploads');
    const outputPath = path.join(uploadsDir, filename);

    fs.writeFileSync(outputPath, outputWav.toBuffer());

    return {
      filename,
      url: `/uploads/${filename}`,
      parameters: {
        grainSize,
        hopSize,
        matchingAlgorithm,
        sourceGrains: grains.length,
        outputGrains: selectedGrains.length,
      },
    };
  } catch (error) {
    console.error('Concatenative synthesis error:', error);
    throw new Error(`Concatenative synthesis failed: ${error.message}`);
  }
}

/**
 * Segment audio into grains (small chunks)
 */
function segmentIntoGrains(samples, sampleRate, grainSizeMs, hopSizeMs) {
  const grainSizeSamples = Math.floor((grainSizeMs / 1000) * sampleRate);
  const hopSizeSamples = Math.floor((hopSizeMs / 1000) * sampleRate);
  const grains = [];

  for (let i = 0; i < samples.length - grainSizeSamples; i += hopSizeSamples) {
    const grain = samples.slice(i, i + grainSizeSamples);
    grains.push({
      samples: grain,
      startIndex: i,
      time: i / sampleRate,
    });
  }

  return grains;
}

/**
 * Extract features from a grain
 */
function extractGrainFeatures(grain, sampleRate, algorithm) {
  const samples = grain.samples;

  try {
    const essentia = new Essentia.Essentia(Essentia.EssentiaWASM);

    // Energy
    const rms = essentia.RMS(samples).rms;
    const zcr = essentia.ZeroCrossingRate(samples).zeroCrossingRate;

    // Spectral features
    const windowing = essentia.Windowing(samples);
    const spectrum = essentia.Spectrum(windowing.frame);
    const centroid = essentia.SpectralCentroid(spectrum.spectrum).spectralCentroid;
    const rolloff = essentia.SpectralRolloff(spectrum.spectrum).spectralRolloff;

    let mfcc = null;
    if (algorithm === 'mfcc') {
      mfcc = essentia.MFCC(spectrum.spectrum).mfcc;
    }

    return {
      energy: rms,
      zcr,
      centroid,
      rolloff,
      mfcc,
      startIndex: grain.startIndex,
      time: grain.time,
    };
  } catch (error) {
    // Fallback: simple energy-based features
    let energy = 0;
    for (let i = 0; i < samples.length; i++) {
      energy += samples[i] * samples[i];
    }
    energy = Math.sqrt(energy / samples.length);

    return {
      energy,
      zcr: 0,
      centroid: 0,
      rolloff: 0,
      mfcc: null,
      startIndex: grain.startIndex,
      time: grain.time,
    };
  }
}

/**
 * Match grains to a target pattern
 */
function matchGrainsToPattern(grains, features, pattern, algorithm) {
  // For now, use a simple strategy: sort by feature and select
  const sorted = grains.map((grain, idx) => ({
    grain,
    feature: features[idx],
  }));

  // Sort by primary feature
  switch (algorithm) {
    case 'energy':
      sorted.sort((a, b) => a.feature.energy - b.feature.energy);
      break;
    case 'spectral':
      sorted.sort((a, b) => a.feature.centroid - b.feature.centroid);
      break;
    case 'mfcc':
      // Sort by first MFCC coefficient
      sorted.sort((a, b) => {
        const aVal = a.feature.mfcc ? a.feature.mfcc[0] : 0;
        const bVal = b.feature.mfcc ? b.feature.mfcc[0] : 0;
        return aVal - bVal;
      });
      break;
    case 'random':
    default:
      // Shuffle
      for (let i = sorted.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
      }
  }

  return sorted.map((s) => s.grain);
}

/**
 * Rearrange grains to create variation
 */
function rearrangeGrains(grains, features, algorithm) {
  // Create interesting patterns by grouping similar grains
  const sorted = grains.map((grain, idx) => ({
    grain,
    feature: features[idx],
  }));

  // Sort by spectral centroid to create timbral evolution
  sorted.sort((a, b) => a.feature.centroid - b.feature.centroid);

  // Create a pattern: low->high->low
  const half = Math.floor(sorted.length / 2);
  const pattern = [
    ...sorted.slice(0, half),
    ...sorted.slice(half).reverse(),
  ];

  return pattern.map((p) => p.grain);
}

/**
 * Concatenate grains with crossfading to avoid clicks
 */
function concatenateGrains(grains, sampleRate) {
  if (grains.length === 0) {
    return new Float32Array(0);
  }

  const crossfadeSamples = Math.floor(0.005 * sampleRate); // 5ms crossfade
  const grainLength = grains[0].samples.length;

  const totalLength = grains.length * grainLength;
  const output = new Float32Array(totalLength);

  for (let i = 0; i < grains.length; i++) {
    const grain = grains[i].samples;
    const offset = i * grainLength;

    for (let j = 0; j < grain.length; j++) {
      let sample = grain[j];

      // Apply crossfade at boundaries
      if (j < crossfadeSamples) {
        const fadeIn = j / crossfadeSamples;
        sample *= fadeIn;
      }
      if (j > grain.length - crossfadeSamples) {
        const fadeOut = (grain.length - j) / crossfadeSamples;
        sample *= fadeOut;
      }

      if (offset + j < output.length) {
        output[offset + j] += sample;
      }
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
