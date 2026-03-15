import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Convert audio file to WAV format
 * @param {string} inputPath - Path to input audio file
 * @returns {Promise<string>} Path to converted WAV file
 */
export async function convertToWav(inputPath) {
  const ext = path.extname(inputPath).toLowerCase();

  // If already WAV, return as-is
  if (ext === '.wav') {
    return inputPath;
  }

  // Create output path
  const outputPath = inputPath.replace(ext, '.wav');

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat('wav')
      .audioChannels(2)
      .audioFrequency(44100)
      .on('end', () => {
        console.log(`Converted ${inputPath} to WAV`);
        resolve(outputPath);
      })
      .on('error', (err) => {
        console.error('Conversion error:', err);
        reject(new Error(`Failed to convert audio: ${err.message}`));
      })
      .save(outputPath);
  });
}

/**
 * Check if ffmpeg is available
 * @returns {Promise<boolean>}
 */
export async function checkFfmpeg() {
  return new Promise((resolve) => {
    ffmpeg.getAvailableFormats((err, formats) => {
      if (err) {
        console.warn('FFmpeg not available:', err.message);
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}
