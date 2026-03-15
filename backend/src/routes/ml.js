import { createVoicePersona } from '../services/voicePersona.js';
import { generateWithMagenta } from '../services/magentaService.js';
import { processWithReplicate } from '../services/replicateService.js';
import { warpAudio } from '../services/audioWarper.js';
import { findWavFile } from '../services/fileHelper.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function mlRoutes(fastify, options) {
  // Create voice persona from input
  fastify.post('/persona/create', async (request, reply) => {
    try {
      const {
        fileId,
        personaType = 'robotic', // 'robotic', 'ethereal', 'granular', 'pitched', 'formant'
        intensity = 0.5,
        useElevenLabs = false,
      } = request.body;

      if (!fileId) {
        return reply.code(400).send({ error: 'fileId is required' });
      }

      const filepath = await findWavFile(fileId);

      if (!filepath) {
        return reply.code(404).send({ error: 'File not found' });
      }

      const result = await createVoicePersona({
        inputFile: filepath,
        personaType,
        intensity,
        useElevenLabs,
      });

      return { success: true, ...result };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Voice persona creation failed', message: error.message });
    }
  });

  // Audio warping with AI
  fastify.post('/warp', async (request, reply) => {
    try {
      const {
        fileId,
        warpType = 'spectral', // 'spectral', 'temporal', 'granular', 'frequency', 'neural'
        parameters = {},
      } = request.body;

      if (!fileId) {
        return reply.code(400).send({ error: 'fileId is required' });
      }

      const filepath = await findWavFile(fileId);

      if (!filepath) {
        return reply.code(404).send({ error: 'File not found' });
      }

      const result = await warpAudio({
        inputFile: filepath,
        warpType,
        parameters,
      });

      return { success: true, ...result };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Audio warping failed', message: error.message });
    }
  });

  // Generate with Magenta
  fastify.post('/magenta/generate', async (request, reply) => {
    try {
      const {
        model = 'musicvae', // 'musicvae', 'ddsp', 'gansynth'
        fileId,
        parameters = {},
      } = request.body;

      let inputFile = null;
      if (fileId) {
        const files = fs.readdirSync(path.join(__dirname, '../../uploads'));
        const file = files.find((f) => f.startsWith(fileId));
        if (file) {
          inputFile = path.join(__dirname, '../../uploads', file);
        }
      }

      const result = await generateWithMagenta({
        model,
        inputFile,
        parameters,
      });

      return { success: true, ...result };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Magenta generation failed', message: error.message });
    }
  });

  // Process with Replicate (for advanced models)
  fastify.post('/replicate/process', async (request, reply) => {
    try {
      const {
        fileId,
        model = 'audio-separation', // 'audio-separation', 'style-transfer', 'enhancement'
        parameters = {},
      } = request.body;

      if (!fileId) {
        return reply.code(400).send({ error: 'fileId is required' });
      }

      const files = fs.readdirSync(path.join(__dirname, '../../uploads'));
      const file = files.find((f) => f.startsWith(fileId));

      if (!file) {
        return reply.code(404).send({ error: 'File not found' });
      }

      const filepath = path.join(__dirname, '../../uploads', file);
      const result = await processWithReplicate({
        inputFile: filepath,
        model,
        parameters,
      });

      return { success: true, ...result };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Replicate processing failed', message: error.message });
    }
  });

  // Real-time processing endpoint (WebSocket support)
  fastify.get('/realtime/connect', { websocket: true }, (connection, req) => {
    connection.socket.on('message', async (message) => {
      try {
        const data = JSON.parse(message);
        // Handle real-time audio processing here
        // This would process audio chunks as they arrive
        connection.socket.send(JSON.stringify({
          type: 'processed',
          data: 'Real-time processing will be implemented here',
        }));
      } catch (error) {
        connection.socket.send(JSON.stringify({
          type: 'error',
          error: error.message,
        }));
      }
    });
  });
}
