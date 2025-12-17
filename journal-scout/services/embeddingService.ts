/**
 * Embedding Service using Transformers.js
 * Runs entirely in the browser - no API costs!
 * Uses all-MiniLM-L6-v2 model (same as Python sentence-transformers)
 */

import { pipeline, env } from '@xenova/transformers';

// Configure Transformers.js to use browser cache
env.allowLocalModels = false;
env.useBrowserCache = true;

export interface VectorDocument {
  id: string;
  fileName: string;
  content: string;
  embedding: number[];
  metadata: {
    title?: string;
    createdAt: string;
  };
}

export interface VectorDatabase {
  name: string;
  createdAt: string;
  documents: VectorDocument[];
  dimension: number;
}

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

/**
 * Create vector database from files using local embeddings
 * No API key required!
 */
export const createVectorDatabase = async (
  files: { name: string; content: string }[],
  dbName: string,
  onProgress?: (current: number, total: number, fileName: string) => void,
  onModelProgress?: (progress: { status: string; progress?: number }) => void
): Promise<VectorDatabase> => {
  const documents: VectorDocument[] = [];
  
  // Pre-load the model before processing files
  await getEmbeddingPipeline(onModelProgress);
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    onProgress?.(i + 1, files.length, file.name);
    
    try {
      // Extract title from content if it's a paper file
      const titleMatch = file.content.match(/TITLE:\s*(.+)/i);
      const title = titleMatch ? titleMatch[1].trim() : file.name;
      
      // Create embedding for the content (no API key needed!)
      const embedding = await createEmbedding(file.content);
      
      documents.push({
        id: `doc_${i}_${Date.now()}`,
        fileName: file.name,
        content: file.content,
        embedding,
        metadata: {
          title,
          createdAt: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);
      throw new Error(`Failed to process "${file.name}": ${error}`);
    }
  }

  return {
    name: dbName,
    createdAt: new Date().toISOString(),
    documents,
    dimension: documents[0]?.embedding.length || 384, // MiniLM uses 384 dimensions
  };
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

export const searchVectorDatabase = async (
  query: string,
  database: VectorDatabase,
  topK: number = 5
): Promise<{ document: VectorDocument; score: number }[]> => {
  // Create embedding for the query (no API key needed!)
  const queryEmbedding = await createEmbedding(query);
  
  // Calculate similarity scores
  const results = database.documents.map(doc => ({
    document: doc,
    score: cosineSimilarity(queryEmbedding, doc.embedding),
  }));
  
  // Sort by score (highest first) and return top K
  return results
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
};
