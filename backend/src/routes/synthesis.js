import { fmSynthesis } from '../services/fmSynthesizer.js';
import { concatenativeSynthesis } from '../services/concatenativeSynthesizer.js';
import { findWavFile } from '../services/fileHelper.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function synthesisRoutes(fastify, options) {
  // FM Synthesis
  fastify.post('/fm', async (request, reply) => {
    try {
      const {
        fileId,
        carrierFreq = 440,
        modulatorFreq = 220,
        modulationIndex = 5,
        envelope = { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.5 },
        duration = 2,
      } = request.body;

      let inputFile = null;
      if (fileId) {
        inputFile = await findWavFile(fileId);
      }

      const result = await fmSynthesis({
        inputFile,
        carrierFreq,
        modulatorFreq,
        modulationIndex,
        envelope,
        duration,
      });

      return { success: true, ...result };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'FM synthesis failed', message: error.message });
    }
  });

  // Concatenative Synthesis
  fastify.post('/concatenative', async (request, reply) => {
    try {
      const {
        fileId,
        targetPattern,
        grainSize = 100,
        hopSize = 50,
        matchingAlgorithm = 'mfcc',
      } = request.body;

      if (!fileId) {
        return reply.code(400).send({ error: 'fileId is required' });
      }

      const filepath = await findWavFile(fileId);

      if (!filepath) {
        return reply.code(404).send({ error: 'File not found' });
      }
      const result = await concatenativeSynthesis({
        inputFile: filepath,
        targetPattern,
        grainSize,
        hopSize,
        matchingAlgorithm,
      });

      return { success: true, ...result };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Concatenative synthesis failed', message: error.message });
    }
  });

  // Drum Resynthesis with FM
  fastify.post('/drums/resynthesize', async (request, reply) => {
    try {
      const {
        drumFileId,
        technique = 'fm', // 'fm' or 'concatenative'
        parameters = {},
      } = request.body;

      if (!drumFileId) {
        return reply.code(400).send({ error: 'drumFileId is required' });
      }

      const filepath = await findWavFile(drumFileId);

      if (!filepath) {
        return reply.code(404).send({ error: 'Drum file not found' });
      }

      let result;
      if (technique === 'fm') {
        result = await fmSynthesis({
          inputFile: filepath,
          ...parameters,
        });
      } else if (technique === 'concatenative') {
        result = await concatenativeSynthesis({
          inputFile: filepath,
          ...parameters,
        });
      } else {
        return reply.code(400).send({ error: 'Invalid technique. Use "fm" or "concatenative"' });
      }

      return { success: true, technique, ...result };
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: 'Drum resynthesis failed', message: error.message });
    }
  });
}
