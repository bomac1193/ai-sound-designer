import wavefileModule from 'wavefile';
const { WaveFile } = wavefileModule;
import fs from 'fs';
import crypto from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import FormData from 'form-data';
import Replicate from 'replicate';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize APIs
const replicate = process.env.REPLICATE_API_KEY
  ? new Replicate({ auth: process.env.REPLICATE_API_KEY })
  : null;

/**
 * AI Vocal Synthesis Engine
 * Integrates multiple modern vocal synthesis APIs for AI influencer music creation
 */

/**
 * Main vocal synthesis orchestrator
 * @param {Object} options - Synthesis parameters
 * @returns {Object} Synthesized audio information
 */
export async function synthesizeVocals(options) {
  const {
    inputFile,
    text,
    provider = 'elevenlabs', // 'elevenlabs', 'playht', 'replicate', 'local'
    voiceId,
    voiceName,
    personaType,
    settings = {},
  } = options;

  console.log(`Starting vocal synthesis with provider: ${provider}`);

  try {
    let result;

    switch (provider) {
      case 'elevenlabs':
        result = await synthesizeWithElevenLabs({ inputFile, text, voiceId, settings });
        break;
      case 'playht':
        result = await synthesizeWithPlayHT({ inputFile, text, voiceId, settings });
        break;
      case 'replicate':
        result = await synthesizeWithReplicate({ inputFile, text, voiceId, settings });
        break;
      case 'local':
        result = await synthesizeWithLocalVocoder({ inputFile, text, settings });
        break;
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }

    return {
      success: true,
      provider,
      ...result,
    };
  } catch (error) {
    console.error('Vocal synthesis error:', error);
    throw new Error(`Vocal synthesis failed: ${error.message}`);
  }
}

/**
 * ElevenLabs API Integration
 * Supports: Voice cloning, text-to-speech, voice conversion
 */
async function synthesizeWithElevenLabs(options) {
  const { inputFile, text, voiceId, settings } = options;
  const apiKey = process.env.ELEVENLABS_API_KEY;

  if (!apiKey) {
    throw new Error('ElevenLabs API key not configured');
  }

  const {
    stability = 0.5,
    similarityBoost = 0.75,
    style = 0.0,
    useSpeakerBoost = true,
    modelId = 'eleven_multilingual_v2',
  } = settings;

  try {
    // If we have input audio, clone the voice first
    let effectiveVoiceId = voiceId;

    if (inputFile && !voiceId) {
      console.log('Cloning voice from input file...');
      effectiveVoiceId = await cloneVoiceElevenLabs(inputFile, apiKey);
    }

    // Generate speech with the voice
    if (text && effectiveVoiceId) {
      console.log('Generating speech with ElevenLabs...');

      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${effectiveVoiceId}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'Content-Type': 'application/json',
            'xi-api-key': apiKey,
          },
          body: JSON.stringify({
            text,
            model_id: modelId,
            voice_settings: {
              stability,
              similarity_boost: similarityBoost,
              style,
              use_speaker_boost: useSpeakerBoost,
            },
          }),
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`ElevenLabs API error: ${error}`);
      }

      // Save the audio
      const audioBuffer = await response.arrayBuffer();
      const fileId = crypto.randomUUID();
      const filename = `elevenlabs_${fileId}.mp3`;
      const uploadsDir = path.join(__dirname, '../../uploads');
      const outputPath = path.join(uploadsDir, filename);

      fs.writeFileSync(outputPath, Buffer.from(audioBuffer));

      return {
        filename,
        url: `/uploads/${filename}`,
        voiceId: effectiveVoiceId,
        method: 'text-to-speech',
      };
    }

    // Voice-to-voice conversion
    if (inputFile && effectiveVoiceId) {
      console.log('Converting voice with ElevenLabs...');

      const formData = new FormData();
      formData.append('audio', fs.createReadStream(inputFile));
      formData.append('model_id', modelId);
      formData.append('voice_settings', JSON.stringify({
        stability,
        similarity_boost: similarityBoost,
      }));

      const response = await fetch(
        `https://api.elevenlabs.io/v1/speech-to-speech/${effectiveVoiceId}`,
        {
          method: 'POST',
          headers: {
            'Accept': 'audio/mpeg',
            'xi-api-key': apiKey,
            ...formData.getHeaders(),
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`ElevenLabs API error: ${error}`);
      }

      const audioBuffer = await response.arrayBuffer();
      const fileId = crypto.randomUUID();
      const filename = `elevenlabs_conversion_${fileId}.mp3`;
      const uploadsDir = path.join(__dirname, '../../uploads');
      const outputPath = path.join(uploadsDir, filename);

      fs.writeFileSync(outputPath, Buffer.from(audioBuffer));

      return {
        filename,
        url: `/uploads/${filename}`,
        voiceId: effectiveVoiceId,
        method: 'voice-conversion',
      };
    }

    throw new Error('Either text or inputFile with voiceId must be provided');
  } catch (error) {
    console.error('ElevenLabs error:', error);
    throw error;
  }
}

/**
 * Clone a voice using ElevenLabs
 */
async function cloneVoiceElevenLabs(audioFile, apiKey) {
  const formData = new FormData();
  formData.append('name', `Voice_${crypto.randomUUID()}`);
  formData.append('files', fs.createReadStream(audioFile));

  const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'xi-api-key': apiKey,
      ...formData.getHeaders(),
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Voice cloning failed: ${error}`);
  }

  const result = await response.json();
  return result.voice_id;
}

/**
 * PlayHT API Integration
 */
async function synthesizeWithPlayHT(options) {
  const { text, voiceId, settings } = options;
  const apiKey = process.env.PLAYHT_API_KEY;
  const userId = process.env.PLAYHT_USER_ID;

  if (!apiKey || !userId) {
    throw new Error('PlayHT API credentials not configured');
  }

  const {
    quality = 'premium',
    speed = 1.0,
    seed = null,
  } = settings;

  try {
    console.log('Generating speech with PlayHT...');

    const response = await fetch('https://api.play.ht/api/v2/tts', {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'AUTHORIZATION': apiKey,
        'X-USER-ID': userId,
      },
      body: JSON.stringify({
        text,
        voice: voiceId || 's3://voice-cloning-zero-shot/d9ff78ba-d016-47f6-b0ef-dd630f59414e/female-cs/manifest.json',
        output_format: 'mp3',
        quality,
        speed,
        seed,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`PlayHT API error: ${error}`);
    }

    const audioBuffer = await response.arrayBuffer();
    const fileId = crypto.randomUUID();
    const filename = `playht_${fileId}.mp3`;
    const uploadsDir = path.join(__dirname, '../../uploads');
    const outputPath = path.join(uploadsDir, filename);

    fs.writeFileSync(outputPath, Buffer.from(audioBuffer));

    return {
      filename,
      url: `/uploads/${filename}`,
      method: 'text-to-speech',
    };
  } catch (error) {
    console.error('PlayHT error:', error);
    throw error;
  }
}

/**
 * Replicate API Integration (Bark, MusicGen, etc.)
 */
async function synthesizeWithReplicate(options) {
  const { text, settings } = options;

  if (!replicate) {
    throw new Error('Replicate API key not configured');
  }

  const {
    model = 'bark', // 'bark', 'musicgen', 'riffusion'
    ...modelSettings
  } = settings;

  try {
    console.log(`Generating audio with Replicate (${model})...`);

    let output;

    if (model === 'bark') {
      // Bark - text-to-audio with voice and sound effects
      output = await replicate.run(
        "suno-ai/bark:b76242b40d67c76ab6742e987628a2a9ac019e11d56ab96c4e91ce03b79b2787",
        {
          input: {
            prompt: text,
            text_temp: modelSettings.text_temp || 0.7,
            waveform_temp: modelSettings.waveform_temp || 0.7,
            output_full: true,
          }
        }
      );
    } else if (model === 'musicgen') {
      // MusicGen - text-to-music
      output = await replicate.run(
        "meta/musicgen:671ac645ce5e552cc63a54a2bbff63fcf798043055d2dac5fc9e36a837eedcfb",
        {
          input: {
            prompt: text,
            model_version: modelSettings.model_version || "melody",
            duration: modelSettings.duration || 8,
          }
        }
      );
    } else if (model === 'riffusion') {
      // Riffusion - prompt-to-music
      output = await replicate.run(
        "riffusion/riffusion:8cf61ea6c56afd61d8f5b9ffd14d7c216c0a93844ce2d82ac1c9ecc9c7f24e05",
        {
          input: {
            prompt_a: text,
            denoising: modelSettings.denoising || 0.75,
            duration: modelSettings.duration || 5,
          }
        }
      );
    }

    // Download the output
    const audioUrl = Array.isArray(output) ? output[0] : output.audio_out || output;
    const response = await fetch(audioUrl);
    const audioBuffer = await response.arrayBuffer();

    const fileId = crypto.randomUUID();
    const filename = `replicate_${model}_${fileId}.wav`;
    const uploadsDir = path.join(__dirname, '../../uploads');
    const outputPath = path.join(uploadsDir, filename);

    fs.writeFileSync(outputPath, Buffer.from(audioBuffer));

    return {
      filename,
      url: `/uploads/${filename}`,
      model,
      method: 'ai-generation',
    };
  } catch (error) {
    console.error('Replicate error:', error);
    throw error;
  }
}

/**
 * Local Neural Vocoder
 * Uses TensorFlow.js for local voice synthesis
 */
async function synthesizeWithLocalVocoder(options) {
  const { inputFile, settings } = options;

  // This would use a local neural vocoder model
  // For now, implement a sophisticated vocal effect

  try {
    console.log('Processing with local neural vocoder...');

    const audioData = fs.readFileSync(inputFile);
    const wav = new WaveFile(audioData);

    if (wav.fmt.numChannels > 1) {
      wav.toMono();
    }

    const samples = wav.getSamples(false, Float32Array);
    const sampleRate = wav.fmt.sampleRate;

    // Apply sophisticated vocal processing
    const processed = await applyNeuralVocalEffect(samples, sampleRate, settings);

    // Save output
    const outputWav = new WaveFile();
    outputWav.fromScratch(1, sampleRate, '32f', processed);

    const fileId = crypto.randomUUID();
    const filename = `local_vocoder_${fileId}.wav`;
    const uploadsDir = path.join(__dirname, '../../uploads');
    const outputPath = path.join(uploadsDir, filename);

    fs.writeFileSync(outputPath, outputWav.toBuffer());

    return {
      filename,
      url: `/uploads/${filename}`,
      method: 'local-processing',
    };
  } catch (error) {
    console.error('Local vocoder error:', error);
    throw error;
  }
}

/**
 * Apply neural-inspired vocal effects
 */
async function applyNeuralVocalEffect(samples, sampleRate, settings) {
  const {
    formantShift = 0,
    pitchShift = 0,
    breathiness = 0,
    roughness = 0,
  } = settings;

  let output = new Float32Array(samples);

  // Formant shifting (vowel character)
  if (formantShift !== 0) {
    output = applyFormantShift(output, sampleRate, formantShift);
  }

  // Pitch shifting
  if (pitchShift !== 0) {
    output = applyPitchShift(output, sampleRate, pitchShift);
  }

  // Breathiness (add noise component)
  if (breathiness > 0) {
    output = addBreathiness(output, breathiness);
  }

  // Roughness (add subharmonics)
  if (roughness > 0) {
    output = addRoughness(output, sampleRate, roughness);
  }

  return output;
}

/**
 * Voice Analysis and Extraction
 */
export async function analyzeVoice(inputFile) {
  try {
    const audioData = fs.readFileSync(inputFile);
    const wav = new WaveFile(audioData);

    if (wav.fmt.numChannels > 1) {
      wav.toMono();
    }

    const samples = wav.getSamples(false, Float32Array);
    const sampleRate = wav.fmt.sampleRate;

    // Analyze voice characteristics
    const analysis = {
      duration: samples.length / sampleRate,
      sampleRate,
      fundamentalFrequency: estimatePitch(samples, sampleRate),
      energy: calculateEnergy(samples),
      spectralCentroid: calculateSpectralCentroid(samples, sampleRate),
      voiceCharacteristics: {
        brightness: 0, // To be implemented
        warmth: 0,
        breathiness: 0,
        roughness: 0,
      }
    };

    return analysis;
  } catch (error) {
    console.error('Voice analysis error:', error);
    throw error;
  }
}

/**
 * Get available voices from all providers
 */
export async function getAvailableVoices(provider) {
  const voices = {
    elevenlabs: [],
    playht: [],
    replicate: [],
    local: [],
  };

  try {
    if (provider === 'elevenlabs' || provider === 'all') {
      const apiKey = process.env.ELEVENLABS_API_KEY;
      if (apiKey) {
        const response = await fetch('https://api.elevenlabs.io/v1/voices', {
          headers: { 'xi-api-key': apiKey }
        });
        if (response.ok) {
          const data = await response.json();
          voices.elevenlabs = data.voices;
        }
      }
    }

    if (provider === 'playht' || provider === 'all') {
      // PlayHT voice list
      voices.playht = [
        { id: 'female-cs', name: 'Female (Conversational)' },
        { id: 'male-cs', name: 'Male (Conversational)' },
        // Add more preset voices
      ];
    }

    if (provider === 'replicate' || provider === 'all') {
      voices.replicate = [
        { id: 'bark', name: 'Bark (AI Audio)' },
        { id: 'musicgen', name: 'MusicGen (AI Music)' },
        { id: 'riffusion', name: 'Riffusion (AI Music)' },
      ];
    }

    if (provider === 'local' || provider === 'all') {
      voices.local = [
        { id: 'vocoder-1', name: 'Neural Vocoder 1' },
        { id: 'vocoder-2', name: 'Neural Vocoder 2' },
      ];
    }

    return voices;
  } catch (error) {
    console.error('Get voices error:', error);
    return voices;
  }
}

// Helper functions
function estimatePitch(samples, sampleRate) {
  // Autocorrelation-based pitch detection
  const minPeriod = Math.floor(sampleRate / 500); // 500 Hz max
  const maxPeriod = Math.floor(sampleRate / 50);  // 50 Hz min

  let maxCorr = 0;
  let bestPeriod = 0;

  for (let period = minPeriod; period < maxPeriod; period++) {
    let corr = 0;
    for (let i = 0; i < samples.length - period; i++) {
      corr += samples[i] * samples[i + period];
    }
    if (corr > maxCorr) {
      maxCorr = corr;
      bestPeriod = period;
    }
  }

  return bestPeriod > 0 ? sampleRate / bestPeriod : 0;
}

function calculateEnergy(samples) {
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  return Math.sqrt(sum / samples.length);
}

function calculateSpectralCentroid(samples, sampleRate) {
  // Simplified spectral centroid calculation
  const fftSize = 2048;
  let centroid = 0;
  let count = 0;

  for (let i = 0; i < samples.length - fftSize; i += fftSize / 2) {
    const frame = samples.slice(i, i + fftSize);
    // Simple magnitude calculation
    let weightedSum = 0;
    let magnitudeSum = 0;

    for (let j = 0; j < frame.length; j++) {
      const magnitude = Math.abs(frame[j]);
      const frequency = (j * sampleRate) / fftSize;
      weightedSum += frequency * magnitude;
      magnitudeSum += magnitude;
    }

    if (magnitudeSum > 0) {
      centroid += weightedSum / magnitudeSum;
      count++;
    }
  }

  return count > 0 ? centroid / count : 0;
}

function applyFormantShift(samples, sampleRate, shift) {
  // Formant shifting via comb filtering
  const output = new Float32Array(samples.length);
  const delayTime = Math.floor((sampleRate / 1000) * Math.pow(2, shift));

  for (let i = 0; i < samples.length; i++) {
    let sample = samples[i];
    if (i >= delayTime && delayTime > 0) {
      sample += samples[i - delayTime] * 0.5;
    }
    output[i] = sample * 0.7;
  }

  return output;
}

function applyPitchShift(samples, sampleRate, semitones) {
  const ratio = Math.pow(2, semitones / 12);
  const outputLength = Math.floor(samples.length / ratio);
  const output = new Float32Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const sourceIdx = i * ratio;
    const idx1 = Math.floor(sourceIdx);
    const idx2 = Math.min(idx1 + 1, samples.length - 1);
    const frac = sourceIdx - idx1;

    output[i] = samples[idx1] * (1 - frac) + samples[idx2] * frac;
  }

  return output;
}

function addBreathiness(samples, amount) {
  const output = new Float32Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const noise = (Math.random() * 2 - 1) * amount;
    output[i] = samples[i] * (1 - amount * 0.3) + noise * 0.1;
  }
  return output;
}

function addRoughness(samples, sampleRate, amount) {
  const output = new Float32Array(samples.length);
  const subharmonicFreq = 50; // Hz

  for (let i = 0; i < samples.length; i++) {
    const t = i / sampleRate;
    const subharmonic = Math.sin(2 * Math.PI * subharmonicFreq * t);
    output[i] = samples[i] + subharmonic * samples[i] * amount * 0.3;
  }

  return output;
}
