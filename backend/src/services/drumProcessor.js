import Essentia from 'essentia.js';
import fs from 'fs';
import wavefileModule from 'wavefile';
const { WaveFile } = wavefileModule;
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Detect and separate drum sounds from audio
 * @param {string} filepath - Path to audio file
 * @returns {Object} Separated drum components
 */
export async function detectAndSeparateDrums(filepath) {
  try {
    const audioData = fs.readFileSync(filepath);
    const wav = new WaveFile(audioData);

    if (wav.fmt.numChannels > 1) {
      wav.toMono();
    }

    const samples = wav.getSamples(false, Float32Array);
    const sampleRate = wav.fmt.sampleRate;

    const essentia = new Essentia.Essentia(Essentia.EssentiaWASM);

    // Detect onsets (transients) which typically indicate drum hits
    const frameSize = 2048;
    const hopSize = 512;
    const onsets = [];
    const drumHits = [];

    for (let i = 0; i < samples.length - frameSize; i += hopSize) {
      const frame = samples.slice(i, i + frameSize);
      const windowing = essentia.Windowing(frame);
      const spectrum = essentia.Spectrum(windowing.frame);
      const onset = essentia.OnsetDetection(spectrum.spectrum, spectrum.spectrum, 'complex');

      if (onset.onsetDetection > 0.7) {
        onsets.push({
          time: i / sampleRate,
          sample: i,
          strength: onset.onsetDetection,
        });
      }
    }

    // Extract drum hits (windows around onsets)
    const hitDuration = Math.floor(sampleRate * 0.2); // 200ms per hit

    for (const onset of onsets) {
      const start = Math.max(0, onset.sample - Math.floor(hopSize / 2));
      const end = Math.min(samples.length, start + hitDuration);
      const hit = samples.slice(start, end);

      // Classify drum type based on spectral characteristics
      const windowing = essentia.Windowing(hit);
      const spectrum = essentia.Spectrum(windowing.frame);
      const centroid = essentia.SpectralCentroid(spectrum.spectrum).spectralCentroid;

      let drumType = 'unknown';
      if (centroid < 200) {
        drumType = 'kick';
      } else if (centroid < 1000) {
        drumType = 'snare';
      } else if (centroid < 5000) {
        drumType = 'tom';
      } else {
        drumType = 'hihat_cymbal';
      }

      drumHits.push({
        time: onset.time,
        type: drumType,
        centroid,
        strength: onset.strength,
        samples: hit,
      });
    }

    // Group by drum type and save separate files
    const drumFiles = {};
    const uploadsDir = path.join(__dirname, '../../uploads');

    for (const type of ['kick', 'snare', 'tom', 'hihat_cymbal']) {
      const typedHits = drumHits.filter((h) => h.type === type);

      if (typedHits.length > 0) {
        // Concatenate all hits of this type with silence in between
        const silenceDuration = Math.floor(sampleRate * 0.1); // 100ms silence
        const silence = new Float32Array(silenceDuration);

        const combined = [];
        for (const hit of typedHits) {
          combined.push(...hit.samples, ...silence);
        }

        // Create WAV file
        const outputWav = new WaveFile();
        outputWav.fromScratch(1, sampleRate, '32f', combined);

        const fileId = crypto.randomUUID();
        const filename = `drum_${type}_${fileId}.wav`;
        const outputPath = path.join(uploadsDir, filename);

        fs.writeFileSync(outputPath, outputWav.toBuffer());

        drumFiles[type] = {
          filename,
          url: `/uploads/${filename}`,
          count: typedHits.length,
          avgCentroid: typedHits.reduce((sum, h) => sum + h.centroid, 0) / typedHits.length,
        };
      }
    }

    return {
      totalHits: drumHits.length,
      drums: drumFiles,
      timeline: drumHits.map((h) => ({
        time: h.time,
        type: h.type,
        strength: h.strength,
      })),
    };
  } catch (error) {
    console.error('Drum detection error:', error);
    throw new Error(`Drum detection failed: ${error.message}`);
  }
}

/**
 * Analyze individual drum hit characteristics
 * @param {Float32Array} samples - Drum hit samples
 * @param {number} sampleRate - Sample rate
 * @returns {Object} Drum characteristics
 */
export function analyzeDrumHit(samples, sampleRate) {
  try {
    const essentia = new Essentia.Essentia(Essentia.EssentiaWASM);

    const windowing = essentia.Windowing(samples);
    const spectrum = essentia.Spectrum(windowing.frame);
    const centroid = essentia.SpectralCentroid(spectrum.spectrum).spectralCentroid;
    const rolloff = essentia.SpectralRolloff(spectrum.spectrum).spectralRolloff;

    // Envelope detection
    const rms = essentia.RMS(samples).rms;

    // Find attack time (time to reach peak)
    let peakIdx = 0;
    let peakValue = 0;
    for (let i = 0; i < samples.length; i++) {
      if (Math.abs(samples[i]) > peakValue) {
        peakValue = Math.abs(samples[i]);
        peakIdx = i;
      }
    }

    const attackTime = peakIdx / sampleRate;

    return {
      centroid,
      rolloff,
      rms,
      attackTime,
      peakValue,
      duration: samples.length / sampleRate,
    };
  } catch (error) {
    console.error('Drum hit analysis error:', error);
    return null;
  }
}
