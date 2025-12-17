/**
 * Embedding Service using Transformers.js
 * Runs entirely in the browser - no API costs!
 * Uses all-MiniLM-L6-v2 model (same as Python sentence-transformers)
 */

import { pipeline, env } from '@xenova/transformers';

// Configure Transformers.js to use browser cache
env.allowLocalModels = false;
env.useBrowserCache = true;

// Singleton pipeline instance
let embeddingPipeline: any = null;
let pipelineLoading: Promise<any> | null = null;

/**
 * Get or initialize the embedding pipeline
 * Downloads model on first use (~25MB), then cached in browser
 */
export const getEmbeddingPipeline = async (
  onProgress?: (progress: { status: string; progress?: number }) => void
): Promise<any> => {
  if (embeddingPipeline) {
    return embeddingPipeline;
  }

  if (pipelineLoading) {
    return pipelineLoading;
  }

  pipelineLoading = pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
    progress_callback: onProgress,
  });

  embeddingPipeline = await pipelineLoading;
  pipelineLoading = null;
  return embeddingPipeline;
};

/**
 * Create embedding for text using local Transformers.js model
 * No API key required - runs entirely in browser!
 */
export const createEmbedding = async (
  text: string,
  onModelProgress?: (progress: { status: string; progress?: number }) => void
): Promise<number[]> => {
  const extractor = await getEmbeddingPipeline(onModelProgress);
  
  // Truncate text if too long (model has 512 token limit)
  const truncatedText = text.slice(0, 8000);
  
  const output = await extractor(truncatedText, { 
    pooling: 'mean', 
    normalize: true 
  });
  
  return Array.from(output.data);
};

export const cosineSimilarity = (a: number[], b: number[]): number => {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
};
