import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { convertToWav } from './audioConverter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Find the WAV version of an uploaded file by fileId
 * If not WAV, attempts to find and use converted version
 * @param {string} fileId - The file ID to search for
 * @returns {string|null} Path to WAV file or null if not found
 */
export async function findWavFile(fileId) {
  const uploadsDir = path.join(__dirname, '../../uploads');
  const files = fs.readdirSync(uploadsDir);

  // First, try to find the WAV version
  const wavFile = files.find((f) => f.startsWith(fileId) && f.endsWith('.wav'));
  if (wavFile) {
    return path.join(uploadsDir, wavFile);
  }

  // If no WAV, find the original file and convert it
  const originalFile = files.find((f) => f.startsWith(fileId));
  if (originalFile) {
    const originalPath = path.join(uploadsDir, originalFile);
    try {
      const wavPath = await convertToWav(originalPath);
      return wavPath;
    } catch (error) {
      console.error('Conversion failed in findWavFile:', error);
      return originalPath; // Return original as fallback
    }
  }

  return null;
}

/**
 * Find any file by fileId (returns first match)
 * @param {string} fileId - The file ID to search for
 * @returns {string|null} Path to file or null if not found
 */
export function findFile(fileId) {
  const uploadsDir = path.join(__dirname, '../../uploads');
  const files = fs.readdirSync(uploadsDir);
  const file = files.find((f) => f.startsWith(fileId));

  if (file) {
    return path.join(uploadsDir, file);
  }

  return null;
}
