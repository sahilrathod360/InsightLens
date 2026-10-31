import fs from 'node:fs';
import { config } from '../src/config/env.js';

const buf = fs.readFileSync('C:/InsightLens/frontend/public/images/manhattan-golden-hour.jpg');
const apiKey = config.apiKeys.gemini;
const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`;

const res = await fetch(endpoint, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contents: [{
      parts: [
        { inline_data: { mime_type: 'image/jpeg', data: buf.toString('base64') } },
        { text: 'Analyze this image and identify its primary subject for scholarly and academic research. For geographic locations, cities, architectural landmarks, or monuments, identify the specific canonical entity name (e.g. Empire State Building, Manhattan Skyline, New York City), never generic textbook phrases (e.g. Urban Morphology). For abstract visuals, diagrams, network meshes, or digital graphics, identify the canonical scientific, technological, or mathematical subject (e.g. Artificial Neural Network, Graph Theory Network Topology), never stock-photo descriptive filler. Return JSON ONLY with keys: subject, searchQuery, concepts, category.' }
      ]
    }],
    generationConfig: {
      response_mime_type: 'application/json',
      maxOutputTokens: 250
    }
  })
});

const data = await res.json();
console.log('Result:', data.candidates?.[0]?.content?.parts?.[0]?.text);
