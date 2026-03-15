import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Import routes
import audioRoutes from './routes/audio.js';
import synthesisRoutes from './routes/synthesis.js';
import mlRoutes from './routes/ml.js';
import aiInfluencerRoutes from './routes/aiInfluencer.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fastify = Fastify({
  logger: true,
  bodyLimit: 104857600, // 100MB for audio files
});

// Register plugins
await fastify.register(cors, {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
});

await fastify.register(multipart, {
  limits: {
    fileSize: 104857600, // 100MB
  },
});

// Serve uploaded files
await fastify.register(fastifyStatic, {
  root: path.join(__dirname, '../uploads'),
  prefix: '/uploads/',
});

// Health check
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', message: 'AI Sound Designer API is running' };
});

// Register routes
fastify.register(audioRoutes, { prefix: '/api/audio' });
fastify.register(synthesisRoutes, { prefix: '/api/synthesis' });
fastify.register(mlRoutes, { prefix: '/api/ml' });
fastify.register(aiInfluencerRoutes, { prefix: '/api/influencer' });

// Start server
const start = async () => {
  try {
    const port = process.env.PORT || 3000;
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    console.log(`
    🎵 AI Sound Designer Backend Running! 🎵

    Server: http://localhost:${port}
    Health: http://localhost:${port}/health

    Ready to process audio with AI magic! 🚀
    `);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
