import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { analyzeVoice } from './aiVocalSynthesis.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PERSONAS_DIR = path.join(__dirname, '../../data/personas');
const VOICE_SAMPLES_DIR = path.join(__dirname, '../../data/voice_samples');

// Ensure directories exist
if (!fs.existsSync(PERSONAS_DIR)) {
  fs.mkdirSync(PERSONAS_DIR, { recursive: true });
}
if (!fs.existsSync(VOICE_SAMPLES_DIR)) {
  fs.mkdirSync(VOICE_SAMPLES_DIR, { recursive: true });
}

/**
 * AI Influencer Persona Manager
 * Manages voice profiles, personas, and AI influencer identities
 */

/**
 * Create a new AI influencer persona
 */
export async function createPersona(data) {
  const {
    name,
    description,
    voiceSampleFile,
    provider, // 'elevenlabs', 'playht', 'replicate', 'local'
    voiceId, // External voice ID (from ElevenLabs, PlayHT, etc.)
    tags = [],
    style = {},
    preferences = {},
  } = data;

  try {
    const personaId = crypto.randomUUID();

    // Analyze voice if sample provided
    let voiceAnalysis = null;
    let voiceSamplePath = null;

    if (voiceSampleFile) {
      voiceAnalysis = await analyzeVoice(voiceSampleFile);

      // Copy voice sample to persona storage
      const sampleFileName = `${personaId}_sample.wav`;
      voiceSamplePath = path.join(VOICE_SAMPLES_DIR, sampleFileName);
      fs.copyFileSync(voiceSampleFile, voiceSamplePath);
    }

    const persona = {
      id: personaId,
      name,
      description,
      provider,
      voiceId,
      voiceSamplePath: voiceSamplePath ? `voice_samples/${path.basename(voiceSamplePath)}` : null,
      voiceAnalysis,
      tags,
      style: {
        energy: style.energy || 0.5,
        emotion: style.emotion || 'neutral',
        pace: style.pace || 1.0,
        pitch: style.pitch || 0,
        tone: style.tone || 'balanced',
        ...style,
      },
      preferences: {
        defaultProvider: provider,
        enableAutoTune: preferences.enableAutoTune || false,
        enableVocalEffects: preferences.enableVocalEffects || true,
        preferredGenres: preferences.preferredGenres || [],
        ...preferences,
      },
      metadata: {
        created: new Date().toISOString(),
        updated: new Date().toISOString(),
        version: '1.0',
        usageCount: 0,
      },
      sessions: [],
    };

    // Save persona
    const personaPath = path.join(PERSONAS_DIR, `${personaId}.json`);
    fs.writeFileSync(personaPath, JSON.stringify(persona, null, 2));

    return persona;
  } catch (error) {
    console.error('Create persona error:', error);
    throw new Error(`Failed to create persona: ${error.message}`);
  }
}

/**
 * Get a persona by ID
 */
export function getPersona(personaId) {
  try {
    const personaPath = path.join(PERSONAS_DIR, `${personaId}.json`);

    if (!fs.existsSync(personaPath)) {
      throw new Error('Persona not found');
    }

    const personaData = fs.readFileSync(personaPath, 'utf-8');
    return JSON.parse(personaData);
  } catch (error) {
    console.error('Get persona error:', error);
    throw new Error(`Failed to get persona: ${error.message}`);
  }
}

/**
 * Update an existing persona
 */
export function updatePersona(personaId, updates) {
  try {
    const persona = getPersona(personaId);

    // Merge updates
    const updatedPersona = {
      ...persona,
      ...updates,
      metadata: {
        ...persona.metadata,
        updated: new Date().toISOString(),
      },
    };

    // Save
    const personaPath = path.join(PERSONAS_DIR, `${personaId}.json`);
    fs.writeFileSync(personaPath, JSON.stringify(updatedPersona, null, 2));

    return updatedPersona;
  } catch (error) {
    console.error('Update persona error:', error);
    throw new Error(`Failed to update persona: ${error.message}`);
  }
}

/**
 * Delete a persona
 */
export function deletePersona(personaId) {
  try {
    const persona = getPersona(personaId);

    // Delete voice sample if exists
    if (persona.voiceSamplePath) {
      const samplePath = path.join(__dirname, '../../data', persona.voiceSamplePath);
      if (fs.existsSync(samplePath)) {
        fs.unlinkSync(samplePath);
      }
    }

    // Delete persona file
    const personaPath = path.join(PERSONAS_DIR, `${personaId}.json`);
    fs.unlinkSync(personaPath);

    return { success: true, message: 'Persona deleted' };
  } catch (error) {
    console.error('Delete persona error:', error);
    throw new Error(`Failed to delete persona: ${error.message}`);
  }
}

/**
 * List all personas
 */
export function listPersonas(filters = {}) {
  try {
    const files = fs.readdirSync(PERSONAS_DIR);
    let personas = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const personaData = fs.readFileSync(path.join(PERSONAS_DIR, file), 'utf-8');
        personas.push(JSON.parse(personaData));
      }
    }

    // Apply filters
    if (filters.provider) {
      personas = personas.filter(p => p.provider === filters.provider);
    }

    if (filters.tags && filters.tags.length > 0) {
      personas = personas.filter(p =>
        filters.tags.some(tag => p.tags.includes(tag))
      );
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      personas = personas.filter(p =>
        p.name.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower)
      );
    }

    // Sort by most recently updated
    personas.sort((a, b) =>
      new Date(b.metadata.updated) - new Date(a.metadata.updated)
    );

    return personas;
  } catch (error) {
    console.error('List personas error:', error);
    throw new Error(`Failed to list personas: ${error.message}`);
  }
}

/**
 * Clone a persona with modifications
 */
export async function clonePersona(personaId, modifications = {}) {
  try {
    const originalPersona = getPersona(personaId);

    // Create new persona based on original
    const clonedData = {
      name: modifications.name || `${originalPersona.name} (Clone)`,
      description: modifications.description || originalPersona.description,
      voiceSampleFile: null, // Will copy from original
      provider: modifications.provider || originalPersona.provider,
      voiceId: modifications.voiceId || originalPersona.voiceId,
      tags: [...originalPersona.tags, ...(modifications.tags || [])],
      style: { ...originalPersona.style, ...modifications.style },
      preferences: { ...originalPersona.preferences, ...modifications.preferences },
    };

    // Copy voice sample if exists
    if (originalPersona.voiceSamplePath) {
      const originalSamplePath = path.join(__dirname, '../../data', originalPersona.voiceSamplePath);
      if (fs.existsSync(originalSamplePath)) {
        clonedData.voiceSampleFile = originalSamplePath;
      }
    }

    return await createPersona(clonedData);
  } catch (error) {
    console.error('Clone persona error:', error);
    throw new Error(`Failed to clone persona: ${error.message}`);
  }
}

/**
 * Add a session to persona history
 */
export function addSession(personaId, sessionData) {
  try {
    const persona = getPersona(personaId);

    const session = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type: sessionData.type, // 'synthesis', 'transformation', 'generation'
      input: sessionData.input,
      output: sessionData.output,
      settings: sessionData.settings,
      duration: sessionData.duration,
      quality: sessionData.quality,
    };

    persona.sessions.push(session);
    persona.metadata.usageCount++;

    // Keep only last 50 sessions
    if (persona.sessions.length > 50) {
      persona.sessions = persona.sessions.slice(-50);
    }

    // Save
    const personaPath = path.join(PERSONAS_DIR, `${personaId}.json`);
    fs.writeFileSync(personaPath, JSON.stringify(persona, null, 2));

    return session;
  } catch (error) {
    console.error('Add session error:', error);
    throw new Error(`Failed to add session: ${error.message}`);
  }
}

/**
 * Get persona statistics
 */
export function getPersonaStats(personaId) {
  try {
    const persona = getPersona(personaId);

    const stats = {
      totalSessions: persona.sessions.length,
      usageCount: persona.metadata.usageCount,
      averageQuality: 0,
      sessionTypes: {},
      recentActivity: [],
    };

    // Calculate statistics
    let qualitySum = 0;
    let qualityCount = 0;

    for (const session of persona.sessions) {
      // Session type distribution
      stats.sessionTypes[session.type] = (stats.sessionTypes[session.type] || 0) + 1;

      // Quality average
      if (session.quality) {
        qualitySum += session.quality;
        qualityCount++;
      }
    }

    stats.averageQuality = qualityCount > 0 ? qualitySum / qualityCount : 0;

    // Recent activity (last 10 sessions)
    stats.recentActivity = persona.sessions.slice(-10).reverse();

    return stats;
  } catch (error) {
    console.error('Get persona stats error:', error);
    throw new Error(`Failed to get persona stats: ${error.message}`);
  }
}

/**
 * Export persona for sharing
 */
export function exportPersona(personaId, includeVoiceSample = false) {
  try {
    const persona = getPersona(personaId);

    const exportData = {
      ...persona,
      sessions: [], // Don't export session history
    };

    if (!includeVoiceSample) {
      exportData.voiceSamplePath = null;
    }

    return exportData;
  } catch (error) {
    console.error('Export persona error:', error);
    throw new Error(`Failed to export persona: ${error.message}`);
  }
}

/**
 * Import a persona
 */
export async function importPersona(personaData, voiceSampleFile = null) {
  try {
    // Create new persona from imported data
    const newPersona = await createPersona({
      name: personaData.name,
      description: personaData.description,
      voiceSampleFile,
      provider: personaData.provider,
      voiceId: personaData.voiceId,
      tags: personaData.tags,
      style: personaData.style,
      preferences: personaData.preferences,
    });

    return newPersona;
  } catch (error) {
    console.error('Import persona error:', error);
    throw new Error(`Failed to import persona: ${error.message}`);
  }
}

/**
 * Batch create personas from multiple voice samples
 */
export async function batchCreatePersonas(voiceSamples, baseConfig = {}) {
  const results = {
    success: [],
    failed: [],
  };

  for (const sample of voiceSamples) {
    try {
      const persona = await createPersona({
        name: sample.name || `Voice ${crypto.randomUUID().substring(0, 8)}`,
        description: sample.description || 'Batch imported voice',
        voiceSampleFile: sample.filePath,
        provider: baseConfig.provider || 'local',
        tags: [...(baseConfig.tags || []), 'batch-import'],
        style: baseConfig.style || {},
        preferences: baseConfig.preferences || {},
      });

      results.success.push(persona);
    } catch (error) {
      results.failed.push({
        file: sample.filePath,
        error: error.message,
      });
    }
  }

  return results;
}

/**
 * Get recommended settings for a persona based on history
 */
export function getRecommendedSettings(personaId) {
  try {
    const persona = getPersona(personaId);
    const sessions = persona.sessions;

    if (sessions.length === 0) {
      return persona.style; // Return default style
    }

    // Analyze recent sessions for patterns
    const recentSessions = sessions.slice(-10);
    const avgSettings = {};

    // Calculate average settings from successful sessions
    const successfulSessions = recentSessions.filter(s => s.quality && s.quality > 0.7);

    if (successfulSessions.length > 0) {
      // Average numerical settings
      for (const session of successfulSessions) {
        if (session.settings) {
          for (const [key, value] of Object.entries(session.settings)) {
            if (typeof value === 'number') {
              avgSettings[key] = (avgSettings[key] || 0) + value / successfulSessions.length;
            }
          }
        }
      }
    }

    return {
      ...persona.style,
      ...avgSettings,
      confidence: successfulSessions.length / recentSessions.length,
    };
  } catch (error) {
    console.error('Get recommended settings error:', error);
    throw new Error(`Failed to get recommended settings: ${error.message}`);
  }
}
