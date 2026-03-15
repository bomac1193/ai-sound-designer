import {
  synthesizeVocals,
  analyzeVoice,
  getAvailableVoices,
} from '../services/aiVocalSynthesis.js';
import {
  createPersona,
  getPersona,
  updatePersona,
  deletePersona,
  listPersonas,
  clonePersona,
  addSession,
  getPersonaStats,
  exportPersona,
  importPersona,
  batchCreatePersonas,
  getRecommendedSettings,
} from '../services/personaManager.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * AI Influencer Routes
 * Handles vocal synthesis, voice cloning, and persona management
 */
export default async function aiInfluencerRoutes(fastify, options) {

  // ===== VOCAL SYNTHESIS ROUTES =====

  /**
   * Synthesize vocals using AI
   */
  fastify.post('/synthesize', async (request, reply) => {
    try {
      const data = await request.file();

      if (!data) {
        return reply.code(400).send({ error: 'No file uploaded' });
      }

      // Save uploaded file
      const uploadsDir = path.join(__dirname, '../../uploads');
      const inputPath = path.join(uploadsDir, `input_${Date.now()}_${data.filename}`);

      const buffer = await data.toBuffer();
      fs.writeFileSync(inputPath, buffer);

      // Get parameters from fields
      const fields = {};
      for await (const part of request.parts()) {
        if (part.type === 'field') {
          fields[part.fieldname] = part.value;
        }
      }

      const options = {
        inputFile: inputPath,
        text: fields.text,
        provider: fields.provider || 'elevenlabs',
        voiceId: fields.voiceId,
        voiceName: fields.voiceName,
        personaId: fields.personaId,
        settings: fields.settings ? JSON.parse(fields.settings) : {},
      };

      // If persona provided, load its settings
      if (options.personaId) {
        const persona = getPersona(options.personaId);
        options.voiceId = options.voiceId || persona.voiceId;
        options.provider = options.provider || persona.provider;
        options.settings = { ...persona.style, ...options.settings };
      }

      const result = await synthesizeVocals(options);

      // Add session to persona if provided
      if (options.personaId) {
        await addSession(options.personaId, {
          type: 'synthesis',
          input: data.filename,
          output: result.filename,
          settings: options.settings,
          quality: 0.8, // Could be calculated
        });
      }

      // Cleanup input file
      fs.unlinkSync(inputPath);

      return reply.send(result);
    } catch (error) {
      console.error('Synthesize error:', error);
      return reply.code(500).send({
        error: 'Synthesis failed',
        message: error.message
      });
    }
  });

  /**
   * Text-to-speech synthesis
   */
  fastify.post('/text-to-speech', async (request, reply) => {
    try {
      const { text, provider, voiceId, personaId, settings } = request.body;

      if (!text) {
        return reply.code(400).send({ error: 'Text is required' });
      }

      const options = {
        text,
        provider: provider || 'elevenlabs',
        voiceId,
        settings: settings || {},
      };

      // Load persona settings if provided
      if (personaId) {
        const persona = getPersona(personaId);
        options.voiceId = options.voiceId || persona.voiceId;
        options.provider = options.provider || persona.provider;
        options.settings = { ...persona.style, ...options.settings };
      }

      const result = await synthesizeVocals(options);

      // Add session to persona
      if (personaId) {
        await addSession(personaId, {
          type: 'text-to-speech',
          input: { text },
          output: result.filename,
          settings: options.settings,
          quality: 0.8,
        });
      }

      return reply.send(result);
    } catch (error) {
      console.error('Text-to-speech error:', error);
      return reply.code(500).send({
        error: 'Text-to-speech failed',
        message: error.message
      });
    }
  });

  /**
   * Analyze voice characteristics
   */
  fastify.post('/analyze-voice', async (request, reply) => {
    try {
      const data = await request.file();

      if (!data) {
        return reply.code(400).send({ error: 'No file uploaded' });
      }

      // Save uploaded file temporarily
      const uploadsDir = path.join(__dirname, '../../uploads');
      const inputPath = path.join(uploadsDir, `temp_${Date.now()}_${data.filename}`);

      const buffer = await data.toBuffer();
      fs.writeFileSync(inputPath, buffer);

      const analysis = await analyzeVoice(inputPath);

      // Cleanup
      fs.unlinkSync(inputPath);

      return reply.send(analysis);
    } catch (error) {
      console.error('Voice analysis error:', error);
      return reply.code(500).send({
        error: 'Voice analysis failed',
        message: error.message
      });
    }
  });

  /**
   * Get available voices from providers
   */
  fastify.get('/voices', async (request, reply) => {
    try {
      const { provider = 'all' } = request.query;
      const voices = await getAvailableVoices(provider);
      return reply.send(voices);
    } catch (error) {
      console.error('Get voices error:', error);
      return reply.code(500).send({
        error: 'Failed to get voices',
        message: error.message
      });
    }
  });

  // ===== PERSONA MANAGEMENT ROUTES =====

  /**
   * Create a new persona
   */
  fastify.post('/persona', async (request, reply) => {
    try {
      let voiceSampleFile = null;
      const fields = {};

      // Handle multipart form data
      for await (const part of request.parts()) {
        if (part.type === 'file') {
          // Save voice sample
          const uploadsDir = path.join(__dirname, '../../uploads');
          const filename = `voice_sample_${Date.now()}_${part.filename}`;
          const filepath = path.join(uploadsDir, filename);

          const buffer = await part.toBuffer();
          fs.writeFileSync(filepath, buffer);
          voiceSampleFile = filepath;
        } else if (part.type === 'field') {
          fields[part.fieldname] = part.value;
        }
      }

      const personaData = {
        name: fields.name,
        description: fields.description,
        voiceSampleFile,
        provider: fields.provider || 'local',
        voiceId: fields.voiceId,
        tags: fields.tags ? JSON.parse(fields.tags) : [],
        style: fields.style ? JSON.parse(fields.style) : {},
        preferences: fields.preferences ? JSON.parse(fields.preferences) : {},
      };

      const persona = await createPersona(personaData);

      return reply.send(persona);
    } catch (error) {
      console.error('Create persona error:', error);
      return reply.code(500).send({
        error: 'Failed to create persona',
        message: error.message
      });
    }
  });

  /**
   * Get a persona by ID
   */
  fastify.get('/persona/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const persona = getPersona(id);
      return reply.send(persona);
    } catch (error) {
      console.error('Get persona error:', error);
      return reply.code(404).send({
        error: 'Persona not found',
        message: error.message
      });
    }
  });

  /**
   * Update a persona
   */
  fastify.put('/persona/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const updates = request.body;

      const persona = updatePersona(id, updates);
      return reply.send(persona);
    } catch (error) {
      console.error('Update persona error:', error);
      return reply.code(500).send({
        error: 'Failed to update persona',
        message: error.message
      });
    }
  });

  /**
   * Delete a persona
   */
  fastify.delete('/persona/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const result = deletePersona(id);
      return reply.send(result);
    } catch (error) {
      console.error('Delete persona error:', error);
      return reply.code(500).send({
        error: 'Failed to delete persona',
        message: error.message
      });
    }
  });

  /**
   * List all personas
   */
  fastify.get('/personas', async (request, reply) => {
    try {
      const filters = {
        provider: request.query.provider,
        tags: request.query.tags ? request.query.tags.split(',') : undefined,
        search: request.query.search,
      };

      const personas = listPersonas(filters);
      return reply.send(personas);
    } catch (error) {
      console.error('List personas error:', error);
      return reply.code(500).send({
        error: 'Failed to list personas',
        message: error.message
      });
    }
  });

  /**
   * Clone a persona
   */
  fastify.post('/persona/:id/clone', async (request, reply) => {
    try {
      const { id } = request.params;
      const modifications = request.body;

      const clonedPersona = await clonePersona(id, modifications);
      return reply.send(clonedPersona);
    } catch (error) {
      console.error('Clone persona error:', error);
      return reply.code(500).send({
        error: 'Failed to clone persona',
        message: error.message
      });
    }
  });

  /**
   * Get persona statistics
   */
  fastify.get('/persona/:id/stats', async (request, reply) => {
    try {
      const { id } = request.params;
      const stats = getPersonaStats(id);
      return reply.send(stats);
    } catch (error) {
      console.error('Get stats error:', error);
      return reply.code(500).send({
        error: 'Failed to get stats',
        message: error.message
      });
    }
  });

  /**
   * Export a persona
   */
  fastify.get('/persona/:id/export', async (request, reply) => {
    try {
      const { id } = request.params;
      const { includeVoiceSample = false } = request.query;

      const exportData = exportPersona(id, includeVoiceSample === 'true');

      reply.header('Content-Type', 'application/json');
      reply.header('Content-Disposition', `attachment; filename="persona_${id}.json"`);

      return reply.send(exportData);
    } catch (error) {
      console.error('Export persona error:', error);
      return reply.code(500).send({
        error: 'Failed to export persona',
        message: error.message
      });
    }
  });

  /**
   * Import a persona
   */
  fastify.post('/persona/import', async (request, reply) => {
    try {
      let personaData = null;
      let voiceSampleFile = null;

      for await (const part of request.parts()) {
        if (part.type === 'file') {
          if (part.fieldname === 'personaFile') {
            const buffer = await part.toBuffer();
            personaData = JSON.parse(buffer.toString());
          } else if (part.fieldname === 'voiceSample') {
            const uploadsDir = path.join(__dirname, '../../uploads');
            const filename = `voice_sample_${Date.now()}_${part.filename}`;
            voiceSampleFile = path.join(uploadsDir, filename);

            const buffer = await part.toBuffer();
            fs.writeFileSync(voiceSampleFile, buffer);
          }
        }
      }

      if (!personaData) {
        return reply.code(400).send({ error: 'No persona data provided' });
      }

      const persona = await importPersona(personaData, voiceSampleFile);
      return reply.send(persona);
    } catch (error) {
      console.error('Import persona error:', error);
      return reply.code(500).send({
        error: 'Failed to import persona',
        message: error.message
      });
    }
  });

  /**
   * Get recommended settings for a persona
   */
  fastify.get('/persona/:id/recommended-settings', async (request, reply) => {
    try {
      const { id } = request.params;
      const settings = getRecommendedSettings(id);
      return reply.send(settings);
    } catch (error) {
      console.error('Get recommended settings error:', error);
      return reply.code(500).send({
        error: 'Failed to get recommended settings',
        message: error.message
      });
    }
  });

  /**
   * Batch create personas
   */
  fastify.post('/personas/batch', async (request, reply) => {
    try {
      const voiceSamples = [];
      let baseConfig = {};

      for await (const part of request.parts()) {
        if (part.type === 'file') {
          const uploadsDir = path.join(__dirname, '../../uploads');
          const filename = `batch_${Date.now()}_${part.filename}`;
          const filepath = path.join(uploadsDir, filename);

          const buffer = await part.toBuffer();
          fs.writeFileSync(filepath, buffer);

          voiceSamples.push({
            name: part.filename.replace(/\.[^/.]+$/, ''),
            filePath: filepath,
          });
        } else if (part.type === 'field' && part.fieldname === 'config') {
          baseConfig = JSON.parse(part.value);
        }
      }

      const results = await batchCreatePersonas(voiceSamples, baseConfig);
      return reply.send(results);
    } catch (error) {
      console.error('Batch create error:', error);
      return reply.code(500).send({
        error: 'Batch creation failed',
        message: error.message
      });
    }
  });
}
