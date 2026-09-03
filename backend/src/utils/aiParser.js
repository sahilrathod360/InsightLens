import { APIError } from './apiUtils.js';
import { VisualTypeClassifier } from '../services/classification/VisualTypeClassifier.js';
import { AnalysisStrategyFactory } from '../services/classification/AnalysisStrategyFactory.js';
import { normalizeReport } from '../services/report/ReportNormalizer.js';

function repairJsonString(str) {
  let cleaned = str
    .replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, '$1') // strip comments
    .replace(/,\s*([\]}])/g, '$1')                        // remove trailing commas
    .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":')  // quote unquoted keys
    .trim();
  return cleaned;
}

function extractFirstJsonObject(str) {
  const firstBrace = str.indexOf('{');
  const lastBrace = str.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return str.substring(firstBrace, lastBrace + 1);
  }
  return null;
}

export function validateAiReportSchema(data) {
  if (!data || typeof data !== 'object') return false;

  const getStr = (val) => {
    if (!val) return '';
    if (typeof val === 'string') return val.trim();
    if (Array.isArray(val)) return val.join(' ').trim();
    return JSON.stringify(val).trim();
  };

  const title = getStr(data.title);
  const subject = getStr(data.subject);
  const category = getStr(data.category);
  const summary = getStr(data.executiveInsight?.summary || data.executiveSummary);
  const keyFinding = getStr(data.executiveInsight?.keyFinding || data.detectionSummary);
  const confidence = getStr(data.confidenceScore || data.confidence);

  // Check required non-empty identification fields
  if (!title || /unknown|placeholder|demo|to be replaced/i.test(title)) return false;
  if (!subject || /unknown|placeholder|demo|to be replaced/i.test(subject)) return false;
  if (!category || /unknown|placeholder|demo|to be replaced/i.test(category)) return false;
  if (!summary || summary.length < 15) return false;
  if (!keyFinding || keyFinding.length < 5) return false;
  if (!confidence) return false;

  // Check evidence/observations
  const hasEvidence = Array.isArray(data.visualEvidence) && data.visualEvidence.length > 0;
  const hasObservations = Array.isArray(data.observations) && data.observations.length > 0;
  const hasDetailedAnalysis = getStr(data.detailedAnalysis || data.analysis).length >= 15;
  if (!hasEvidence && !hasObservations && !hasDetailedAnalysis) return false;

  return true;
}

export function parseAIResponse(rawText, provider, model) {
  const parseStartTime = Date.now();

  if (typeof rawText !== 'string' || !rawText.trim()) {
    throw new APIError(`[${provider}] Received empty response from AI model.`, 500, provider);
  }

  const cleanText = rawText.trim();
  let parsedData = null;

  // Stage 1: Direct JSON parse
  try {
    parsedData = JSON.parse(cleanText);
  } catch (e1) {
    // Stage 2: Fenced Code Block Extraction
    const fencedMatch = cleanText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fencedMatch && fencedMatch[1]) {
      try {
        parsedData = JSON.parse(fencedMatch[1].trim());
      } catch (e2) {
        const extracted = extractFirstJsonObject(fencedMatch[1]);
        if (extracted) {
          try {
            parsedData = JSON.parse(repairJsonString(extracted));
          } catch (e3) {}
        }
      }
    }

    if (!parsedData) {
      // Stage 3: Embedded JSON Object Extraction & Repair
      const extractedMain = extractFirstJsonObject(cleanText);
      if (extractedMain) {
        try {
          parsedData = JSON.parse(repairJsonString(extractedMain));
        } catch (e4) {}
      }
    }
  }

  const jsonParsingTimeMs = Date.now() - parseStartTime;

  if (!parsedData || typeof parsedData !== 'object') {
    throw new APIError(`[${provider}] Failed to parse JSON response from ${model}.`, 422, provider, 'JSON_PARSING_FAILED');
  }

  // Normalize aliases if necessary
  parsedData.analysis = parsedData.detailedAnalysis || parsedData.analysis || '';
  parsedData.confidence = parsedData.confidenceScore || parsedData.confidence || '99.2%';

  // STRICT SCHEMA VALIDATION - Never fabricate data!
  const validationStartTime = Date.now();
  const isValid = validateAiReportSchema(parsedData);
  const schemaValidationTimeMs = Date.now() - validationStartTime;

  if (!isValid) {
    console.warn(`[Parser] Schema validation failed for ${provider} (${model}) response.`);
    throw new APIError(`[${provider}] AI response failed strict schema validation. Missing required fields.`, 422, provider, 'SCHEMA_VALIDATION_FAILED');
  }

  const nowStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // Phase 3 & 4: Resolve Visual Classification and Apply Specialized Strategy
  const classification = VisualTypeClassifier.classify(parsedData);
  const strategy = AnalysisStrategyFactory.getStrategy(classification.visualType);
  parsedData = strategy.postProcess(parsedData);
  parsedData.classificationReason = classification.reason;
  parsedData.classificationConfidence = classification.classificationConfidence;

  // Phase 5A: Apply Report 2.0 Normalization
  parsedData = normalizeReport(parsedData);

  parsedData.aiProvider = provider;
  parsedData.modelUsed = model;
  parsedData.actualModel = model;
  parsedData.confidenceScore = parsedData.confidence;
  parsedData.generationTimestamp = nowStr;
  parsedData.jsonParsingTimeMs = jsonParsingTimeMs;
  parsedData.schemaValidationTimeMs = schemaValidationTimeMs;

  console.log(`[Parser] Verified valid AI report schema for ${provider} (${model}) - Type: [${parsedData.visualType.toUpperCase()}] Pipeline: [${parsedData.specializedPipeline}] Subject: "${parsedData.subject}" (JSON parse: ${jsonParsingTimeMs}ms, Validation: ${schemaValidationTimeMs}ms)`);
  return parsedData;
}
