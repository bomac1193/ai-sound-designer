import { pipeline } from 'stream/promises';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { analyzeAudio } from '../services/audioAnalysis.js';
import { detectAndSeparateDrums } from '../services/drumProcessor.js';
import { convertToWav } from '../services/audioConverter.js';
import { findWavFile } from '../services/fileHelper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function audioRoutes(fastify, options) {
  // Upload and analyze audio
  fastify.post('/upload', async (request, reply) => {
    try {
      const data = await request.file();

      if (!data) {
        return reply.code(400).send({ error: 'No file uploaded' });
      }

      // Generate unique filename
      const fileId = crypto.randomUUID();
      const ext = path.extname(data.filename);
      const filename = `${fileId}${ext}`;
      const filepath = path.join(__dirname, '../../uploads', filename);

      // Save file
      await pipeline(data.file, fs.createWriteStream(filepath));

      // Convert to WAV if needed
      let wavPath = filepath;
      try {
        wavPath = await convertToWav(filepath);
      } catch (conversionError) {
        console.warn('Audio conversion failed, will try analyzing original:', conversionError.message);
      }

      // Analyze audio
      const analysis = await analyzeAudio(wavPath);

      return {
        success: true,
        fileId,
        filename,
        url: `/uploads/${filename}`,
        analysis,
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to upload and analyze audio' });
    }
  });

  // Get audio analysis
  fastify.get('/analyze/:fileId', async (request, reply) => {
    try {
      const { fileId } = request.params;
      const filepath = await findWavFile(fileId);

      if (!filepath) {
        return reply.code(404).send({ error: 'File not found' });
      }

      const analysis = await analyzeAudio(filepath);

      return { success: true, analysis };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to analyze audio' });
    }
  });

  // Detect and separate drums
  fastify.post('/drums/separate', async (request, reply) => {
    try {
      const { fileId } = request.body;
      const filepath = await findWavFile(fileId);

      if (!filepath) {
        return reply.code(404).send({ error: 'File not found' });
      }

      const result = await detectAndSeparateDrums(filepath);

      return { success: true, ...result };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to separate drums' });
    }
  });

  // List uploaded files
  fastify.get('/files', async (request, reply) => {
    try {
      const files = fs.readdirSync(path.join(__dirname, '../../uploads'));
      const fileList = files.map((file) => ({
        filename: file,
        url: `/uploads/${file}`,
      }));

      return { success: true, files: fileList };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Failed to list files' });
    }
  });
}
