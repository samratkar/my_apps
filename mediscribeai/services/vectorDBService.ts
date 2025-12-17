/**
 * Vector Database Service for MediScribeAI
 * Loads and searches the medical papers vector database from JSON format
 */

import { createEmbedding, cosineSimilarity } from './embeddingService';

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

/**
 * Detect vector database format from JSON structure
 */
function detectVectorDBFormat(data: any): 'chromadb' | 'array' | 'faiss' | 'weaviate' | 'unknown' {
  // ChromaDB format: {ids: [], documents: [], embeddings: [], metadatas: []}
  if (data.ids && Array.isArray(data.ids) && 
      data.embeddings && Array.isArray(data.embeddings) &&
      (data.documents || data._documents)) {
    return 'chromadb';
  }
  
  // Array format: [{id, content/text, embedding, ...}, ...]
  if (Array.isArray(data) && data.length > 0) {
    const first = data[0];
    if (first.embedding || first.vector) {
      return 'array';
    }
  }
  
  // FAISS format (similar to array but with specific structure)
  if (Array.isArray(data) && data.length > 0 && data[0].faiss_index !== undefined) {
    return 'faiss';
  }
  
  // Weaviate format: {data: {Get: {Class: [...]}}}
  if (data.data?.Get || data.objects) {
    return 'weaviate';
  }
  
  return 'unknown';
}

/**
 * Parse ChromaDB format vector database
 */
function parseChromaDB(data: any): VectorDocument[] {
  console.log('Parsing ChromaDB format');
  const documents: VectorDocument[] = [];
  
  const ids = data.ids;
  const docs = data.documents || data._documents;
  const embeddings = data.embeddings;
  const metadatas = data.metadatas || [];
  
  console.log(`Processing ${ids.length} documents from ChromaDB`);
  
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const content = docs[i] || '';
    const embedding = embeddings[i] || [];
    const metadata = metadatas[i] || {};
    
    if (i === 0) {
      console.log('First document sample:', {
        id,
        contentLength: content.length,
        embeddingLength: Array.isArray(embedding) ? embedding.length : 0,
        metadata
      });
    }
    
    if (!Array.isArray(embedding) || embedding.length === 0) {
      console.warn(`Skipping ChromaDB item ${i}: invalid or empty embedding`);
      continue;
    }
    
    documents.push({
      id: String(id),
      fileName: metadata.fileName || metadata.filename || metadata.file_name || `document_${i}`,
      content: String(content),
      embedding,
      metadata: {
        title: metadata.title || metadata.fileName || metadata.filename || `Document ${i}`,
        createdAt: metadata.createdAt || metadata.created_at || new Date().toISOString(),
      },
    });
  }
  
  return documents;
}

/**
 * Parse array format vector database
 */
function parseArrayFormat(data: any[]): VectorDocument[] {
  console.log('Parsing array format');
  const documents: VectorDocument[] = [];
  
  console.log(`Processing ${data.length} documents from array`);
  
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    if (!item) {
      console.warn(`Item ${i} is null, skipping`);
      continue;
    }
    
    if (i === 0) {
      console.log('First item keys:', Object.keys(item));
      console.log('First item sample:', {
        id: item.id,
        fileName: item.fileName || item.filename,
        embeddingLength: Array.isArray(item.embedding || item.vector) ? (item.embedding || item.vector).length : 0
      });
    }
    
    const id = item.id || item.ids || `doc_${i}`;
    const fileName = item.fileName || item.filename || item.file_name || `document_${i}`;
    const content = item.content || item.documents || item.text || '';
    const embedding = item.embedding || item.embeddings || item.vector || [];
    const title = item.title || item.metadata?.title || fileName;
    const createdAt = item.createdAt || item.created_at || item.metadata?.createdAt || new Date().toISOString();
    
    if (!Array.isArray(embedding) || embedding.length === 0) {
      console.warn(`Skipping array item ${i}: invalid or empty embedding`);
      continue;
    }
    
    documents.push({
      id: String(id),
      fileName: String(fileName),
      content: String(content),
      embedding,
      metadata: {
        title: String(title),
        createdAt: String(createdAt),
      },
    });
  }
  
  return documents;
}

/**
 * Parse FAISS format vector database
 */
function parseFAISS(data: any[]): VectorDocument[] {
  console.log('Parsing FAISS format');
  // FAISS format is similar to array but may have specific fields
  return parseArrayFormat(data);
}

/**
 * Parse Weaviate format vector database
 */
function parseWeaviate(data: any): VectorDocument[] {
  console.log('Parsing Weaviate format');
  const documents: VectorDocument[] = [];
  
  // Weaviate: data.data.Get.ClassName or data.objects
  const objects = data.data?.Get ? Object.values(data.data.Get)[0] : data.objects;
  
  if (!Array.isArray(objects)) {
    console.error('Invalid Weaviate format: no objects array found');
    return documents;
  }
  
  console.log(`Processing ${objects.length} documents from Weaviate`);
  
  for (let i = 0; i < objects.length; i++) {
    const item = objects[i];
    const id = item.id || item._additional?.id || `doc_${i}`;
    const content = item.content || item.text || item.properties?.content || '';
    const embedding = item._additional?.vector || item.vector || [];
    const properties = item.properties || {};
    
    if (!Array.isArray(embedding) || embedding.length === 0) {
      console.warn(`Skipping Weaviate item ${i}: no embedding`);
      continue;
    }
    
    documents.push({
      id: String(id),
      fileName: properties.fileName || properties.filename || `document_${i}`,
      content: String(content),
      embedding,
      metadata: {
        title: properties.title || properties.fileName || `Document ${i}`,
        createdAt: properties.createdAt || new Date().toISOString(),
      },
    });
  }
  
  return documents;
}

/**
 * Load vector database from JSON file
 */
export const loadVectorDatabase = async (filePath: string): Promise<VectorDatabase> => {
  try {
    console.log('Fetching vector database from:', filePath);
    const response = await fetch(filePath);
    if (!response.ok) {
      throw new Error(`Failed to load vector database: ${response.statusText}`);
    }
    
    const jsonData = await response.json();
    console.log('Vector DB loaded, detecting format...');
    
    // Detect format
    const format = detectVectorDBFormat(jsonData);
    console.log('Detected format:', format);
    
    // Parse based on format
    let documents: VectorDocument[] = [];
    
    switch (format) {
      case 'chromadb':
        documents = parseChromaDB(jsonData);
        break;
      case 'array':
        documents = parseArrayFormat(jsonData);
        break;
      case 'faiss':
        documents = parseFAISS(jsonData);
        break;
      case 'weaviate':
        documents = parseWeaviate(jsonData);
        break;
      default:
        console.error('Unknown vector database format. Trying array format as fallback...');
        documents = parseArrayFormat(Array.isArray(jsonData) ? jsonData : [jsonData]);
    }
    
    console.log(`Successfully loaded ${documents.length} documents from vector DB`);
    if (documents.length > 0) {
      console.log('Sample document titles:', documents.slice(0, 3).map(d => d.metadata.title));
    }
    
    return {
      name: 'Papers_vectordb',
      createdAt: new Date().toISOString(),
      documents,
      dimension: documents[0]?.embedding.length || 384,
    };
  } catch (error) {
    console.error('Error loading vector database:', error);
    throw error;
  }
};

/**
 * Search vector database for relevant medical papers
 */
export const searchVectorDatabase = async (
  query: string,
  database: VectorDatabase,
  topK: number = 3
): Promise<{ document: VectorDocument; score: number }[]> => {
  try {
    console.log('=== VECTOR DB SEARCH ===');
    console.log('Query:', query);
    console.log('Database has', database.documents.length, 'documents');
    
    // Check if documents have embeddings
    const docsWithEmbeddings = database.documents.filter(d => d.embedding && d.embedding.length > 0);
    console.log('Documents with embeddings:', docsWithEmbeddings.length);
    
    if (docsWithEmbeddings.length === 0) {
      console.error('No documents have embeddings!');
      return [];
    }
    
    // Sample a few document titles
    console.log('Sample documents:', database.documents.slice(0, 3).map(d => ({
      title: d.metadata.title,
      embeddingLength: d.embedding?.length || 0,
      contentPreview: d.content.slice(0, 100)
    })));
    
    // Create embedding for the query
    console.log('Creating embedding for query...');
    const queryEmbedding = await createEmbedding(query);
    console.log('Query embedding created. Dimension:', queryEmbedding.length);
    console.log('Query embedding sample (first 5 values):', queryEmbedding.slice(0, 5));
    
    // Check dimension match
    const firstDocEmbedding = database.documents[0].embedding;
    if (firstDocEmbedding.length !== queryEmbedding.length) {
      console.error(`Dimension mismatch! Query: ${queryEmbedding.length}, Documents: ${firstDocEmbedding.length}`);
    }
    
    // Calculate similarity scores
    const results = database.documents.map(doc => {
      const score = cosineSimilarity(queryEmbedding, doc.embedding);
      return { document: doc, score };
    });
    
    // Log score distribution
    const scores = results.map(r => r.score);
    console.log('Score stats:', {
      min: Math.min(...scores).toFixed(4),
      max: Math.max(...scores).toFixed(4),
      avg: (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(4)
    });
    
    // Sort by score (highest first) and return top K
    const topResults = results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
    
    console.log('Top search results:');
    topResults.forEach((r, i) => {
      console.log(`${i + 1}. ${r.document.metadata.title} (score: ${(r.score * 100).toFixed(1)}%)`);
      console.log('   Content preview:', r.document.content.slice(0, 150));
    });
    
    if (topResults.length === 0 || topResults[0].score < 0.1) {
      console.warn('Low relevance scores - embeddings might not be compatible');
    }
    
    return topResults;
  } catch (error) {
    console.error('Error searching vector database:', error);
    throw error;
  }
};

/**
 * Extract relevant context from medical papers for augmenting AI prompts
 */
export const extractRelevantContext = (
  searchResults: { document: VectorDocument; score: number }[],
  maxLength: number = 3000
): string => {
  if (searchResults.length === 0) {
    return '';
  }

  let context = '\n\n=== RELEVANT MEDICAL RESEARCH ===\n\n';
  
  for (const result of searchResults) {
    const title = result.document.metadata.title || result.document.fileName;
    const excerpt = result.document.content.slice(0, 1000); // First 1000 chars
    
    context += `**${title}** (Relevance: ${(result.score * 100).toFixed(1)}%)\n`;
    context += `${excerpt}...\n\n`;
    
    if (context.length > maxLength) {
      context = context.slice(0, maxLength) + '...\n';
      break;
    }
  }
  
  return context;
};
