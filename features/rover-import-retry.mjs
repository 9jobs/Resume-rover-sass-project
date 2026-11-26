import { parseResumeWithGemini } from '../engine/lib/gemini-resume-import.js';
import { importRoverSource } from './rover-source-import.mjs';

// Retry provider outages or exhausted AI validation with the same original validator.
export async function importRoverResume(input, options, parse = parseResumeWithGemini) {
  const { backupModel, ...primaryOptions } = options;
  try {
    return await parse(input, primaryOptions);
  } catch (error) {
    const failedValidation = Number(error.status) === 422 && /^The AI response could not be validated after one retry\./.test(error.message || '');
    const fallbackModel = backupModel || primaryOptions.model || 'gemini-2.5-flash';
    // Invalid input and unsupported facts must never be accepted or silently repaired.
    if (![502, 503, 504].includes(Number(error.status)) && !(failedValidation && fallbackModel !== (primaryOptions.model || 'gemini-2.5-flash'))) throw error;
    await new Promise(resolve => setTimeout(resolve, 350));
    try { return await parse(input, {
      ...primaryOptions,
      model: fallbackModel,
    }); } catch (fallbackError) {
      if (![502,503,504].includes(Number(fallbackError.status))) throw fallbackError;
      return importRoverSource(input);
    }
  }
}
