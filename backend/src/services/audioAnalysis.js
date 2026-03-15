import Essentia from 'essentia.js';
import fs from 'fs';
import wavefileModule from 'wavefile';
const { WaveFile } = wavefileModule;

/**
 * Analyze audio file and extract features
 * @param {string} filepath - Path to audio file
 * @returns {Object} Analysis results
 */
export async function analyzeAudio(filepath) {
  try {
    // Read audio file
    const audioData = fs.readFileSync(filepath);
    const wav = new WaveFile(audioData);

    // Convert to mono if stereo
    if (wav.fmt.numChannels > 1) {
      wav.toMono();
    }

    // Get samples as Float32Array
    const samples = wav.getSamples(false, Float32Array);
    const sampleRate = wav.fmt.sampleRate;

    // Initialize Essentia
    const essentia = new Essentia.Essentia(Essentia.EssentiaWASM);

    // Extract features
    const rms = essentia.RMS(samples).rms;
    const zcr = essentia.ZeroCrossingRate(samples).zeroCrossingRate;

    // Spectral features
    const windowing = essentia.Windowing(samples);
    const spectrum = essentia.Spectrum(windowing.frame);
    const spectralCentroid = essentia.SpectralCentroid(spectrum.spectrum).spectralCentroid;
    const spectralRolloff = essentia.SpectralRolloff(spectrum.spectrum).spectralRolloff;

    // MFCC (Mel-frequency cepstral coefficients)
    const mfcc = essentia.MFCC(spectrum.spectrum);

    // Onset detection for rhythm analysis
    const onsets = essentia.OnsetDetection(
      spectrum.spectrum,
      essentia.Spectrum(windowing.frame).spectrum,
      'hfc'
    );

    return {
      duration: samples.length / sampleRate,
      sampleRate,
      channels: wav.fmt.numChannels,
      features: {
        energy: {
          rms,
          zcr,
        },
        spectral: {
          centroid: spectralCentroid,
          rolloff: spectralRolloff,
        },
        mfcc: mfcc.mfcc,
        rhythm: {
          onsetStrength: onsets.onsetDetection,
        },
      },
    };
  } catch (error) {
    console.error('Audio analysis error:', error);

    // Fallback analysis if Essentia fails
    const audioData = fs.readFileSync(filepath);
    const wav = new WaveFile(audioData);

    return {
      duration: wav.data.chunkSize / (wav.fmt.sampleRate * wav.fmt.numChannels * (wav.fmt.bitsPerSample / 8)),
      sampleRate: wav.fmt.sampleRate,
      channels: wav.fmt.numChannels,
      features: {
        note: 'Full analysis unavailable, basic info only',
      },
      error: error.message,
    };
  }
}

/**
 * Extract rhythm and tempo information
 * @param {string} filepath - Path to audio file
 * @returns {Object} Rhythm analysis
 */
export async function extractRhythm(filepath) {
  try {
    const audioData = fs.readFileSync(filepath);
    const wav = new WaveFile(audioData);

    if (wav.fmt.numChannels > 1) {
      wav.toMono();
    }

    const samples = wav.getSamples(false, Float32Array);
    const sampleRate = wav.fmt.sampleRate;

    const essentia = new Essentia.Essentia(Essentia.EssentiaWASM);

    // Beat tracking
    const hopSize = 512;
    const frameSize = 2048;
    const beats = [];

    for (let i = 0; i < samples.length - frameSize; i += hopSize) {
      const frame = samples.slice(i, i + frameSize);
      const windowing = essentia.Windowing(frame);
      const spectrum = essentia.Spectrum(windowing.frame);
      const onset = essentia.OnsetDetection(spectrum.spectrum, spectrum.spectrum, 'hfc');

      if (onset.onsetDetection > 0.5) {
        beats.push(i / sampleRate);
      }
    }

    // Calculate tempo (BPM)
    const beatIntervals = [];
    for (let i = 1; i < beats.length; i++) {
      beatIntervals.push(beats[i] - beats[i - 1]);
    }

    const avgInterval = beatIntervals.reduce((a, b) => a + b, 0) / beatIntervals.length;
    const bpm = avgInterval > 0 ? 60 / avgInterval : 0;

    return {
      beats,
      bpm: Math.round(bpm),
      beatCount: beats.length,
    };
  } catch (error) {
    console.error('Rhythm extraction error:', error);
    return {
      beats: [],
      bpm: 0,
      error: error.message,
    };
  }
}
