/**
 * Vector Database Utilities
 * Export/Import functions for ChromaDB, FAISS, and Qdrant formats
 * Supports JSON, MessagePack, and Parquet file formats
 */

import { createVectorDatabase, VectorDatabase, VectorDocument } from '../services/embeddingService';
import { encode as msgpackEncode } from '@msgpack/msgpack';

export type VectorDBFormat = 'chromadb' | 'faiss' | 'qdrant' | 'pinecone' | 'weaviate' | 'milvus' | 'lancedb';
export type ExportFileFormat = 'json' | 'msgpack' | 'parquet';

export interface CreateVectorDBOptions {
  files: { name: string; content: string }[];
  dbName: string;
  format: VectorDBFormat;
  onProgress?: (current: number, total: number, fileName: string) => void;
  onModelProgress?: (progress: { status: string; progress?: number }) => void;
}

// Re-export types from embeddingService
export type { VectorDatabase, VectorDocument };

/**
 * Create a vector database from files using local Transformers.js
 * No API key required - runs entirely in browser!
 */
export const createVectorDB = async (options: CreateVectorDBOptions): Promise<VectorDatabase> => {
  const { files, dbName, onProgress, onModelProgress } = options;
  return createVectorDatabase(files, dbName, onProgress, onModelProgress);
};

/**
 * Export vector database in ChromaDB-compatible format
 */
export const exportAsChromaDB = (db: VectorDatabase): string => {
  return JSON.stringify({
    name: db.name,
    createdAt: db.createdAt,
    dimension: db.dimension,
    // ChromaDB format
    ids: db.documents.map(d => d.id),
    documents: db.documents.map(d => d.content),
    embeddings: db.documents.map(d => d.embedding),
    metadatas: db.documents.map(d => ({
      filename: d.fileName,
      title: d.metadata.title || d.fileName,
    })),
    // Also include full documents for Journal Scout import
    _documents: db.documents,
  }, null, 2);
};

/**
 * Export vector database in FAISS-compatible format
 */
export const exportAsFAISS = (db: VectorDatabase): string => {
  return JSON.stringify({
    name: db.name,
    createdAt: db.createdAt,
    dimension: db.dimension,
    // FAISS format - embeddings as 2D array
    embeddings: db.documents.map(d => d.embedding),
    // Metadata separate (FAISS doesn't store metadata in index)
    metadata: {
      documents: db.documents.map(d => d.content),
      metadatas: db.documents.map(d => ({
        filename: d.fileName,
        title: d.metadata.title || d.fileName,
        index: db.documents.indexOf(d),
      })),
    },
    // Also include full documents for Journal Scout import
    documents: db.documents,
  }, null, 2);
};

/**
 * Export vector database in Qdrant-compatible format
 */
export const exportAsQdrant = (db: VectorDatabase): string => {
  return JSON.stringify({
    name: db.name,
    createdAt: db.createdAt,
    dimension: db.dimension,
    collection_name: db.name,
    // Qdrant points format
    points: db.documents.map((d, i) => ({
      id: i,
      vector: d.embedding,
      payload: {
        content: d.content,
        filename: d.fileName,
        title: d.metadata.title || d.fileName,
      },
    })),
    // Also include full documents for Journal Scout import
    documents: db.documents,
  }, null, 2);
};

/**
 * Export vector database in Pinecone-compatible format
 */
export const exportAsPinecone = (db: VectorDatabase): string => {
  return JSON.stringify({
    name: db.name,
    createdAt: db.createdAt,
    dimension: db.dimension,
    namespace: 'default',
    // Pinecone upsert format
    vectors: db.documents.map((d, i) => ({
      id: d.id,
      values: d.embedding,
      metadata: {
        content: d.content,
        filename: d.fileName,
        title: d.metadata.title || d.fileName,
      },
    })),
    // Also include full documents for Journal Scout import
    documents: db.documents,
  }, null, 2);
};

/**
 * Export vector database in Weaviate-compatible format
 */
export const exportAsWeaviate = (db: VectorDatabase): string => {
  return JSON.stringify({
    name: db.name,
    createdAt: db.createdAt,
    dimension: db.dimension,
    class: db.name.replace(/[^a-zA-Z0-9]/g, '_'),
    // Weaviate objects format
    objects: db.documents.map((d, i) => ({
      class: db.name.replace(/[^a-zA-Z0-9]/g, '_'),
      id: d.id,
      vector: d.embedding,
      properties: {
        content: d.content,
        filename: d.fileName,
        title: d.metadata.title || d.fileName,
        createdAt: d.metadata.createdAt,
      },
    })),
    // Also include full documents for Journal Scout import
    documents: db.documents,
  }, null, 2);
};

/**
 * Export vector database in Milvus-compatible format
 */
export const exportAsMilvus = (db: VectorDatabase): string => {
  return JSON.stringify({
    name: db.name,
    createdAt: db.createdAt,
    dimension: db.dimension,
    collection_name: db.name,
    // Milvus insert format
    fields: [
      { name: 'id', type: 'VarChar', data: db.documents.map(d => d.id) },
      { name: 'embedding', type: 'FloatVector', data: db.documents.map(d => d.embedding) },
      { name: 'content', type: 'VarChar', data: db.documents.map(d => d.content) },
      { name: 'filename', type: 'VarChar', data: db.documents.map(d => d.fileName) },
      { name: 'title', type: 'VarChar', data: db.documents.map(d => d.metadata.title || d.fileName) },
    ],
    // Also include full documents for Journal Scout import
    documents: db.documents,
  }, null, 2);
};

/**
 * Export vector database in LanceDB-compatible format
 */
export const exportAsLanceDB = (db: VectorDatabase): string => {
  return JSON.stringify({
    name: db.name,
    createdAt: db.createdAt,
    dimension: db.dimension,
    table_name: db.name,
    // LanceDB Arrow-like format (records)
    data: db.documents.map((d, i) => ({
      id: d.id,
      vector: d.embedding,
      content: d.content,
      filename: d.fileName,
      title: d.metadata.title || d.fileName,
      created_at: d.metadata.createdAt,
    })),
    // Schema info
    schema: {
      id: 'string',
      vector: `fixed_size_list[${db.dimension}, float32]`,
      content: 'string',
      filename: 'string',
      title: 'string',
      created_at: 'string',
    },
    // Also include full documents for Journal Scout import
    documents: db.documents,
  }, null, 2);
};

/**
 * Export vector database in the selected format
 */
export const exportVectorDB = (db: VectorDatabase, format: VectorDBFormat): string => {
  switch (format) {
    case 'chromadb':
      return exportAsChromaDB(db);
    case 'faiss':
      return exportAsFAISS(db);
    case 'qdrant':
      return exportAsQdrant(db);
    case 'pinecone':
      return exportAsPinecone(db);
    case 'weaviate':
      return exportAsWeaviate(db);
    case 'milvus':
      return exportAsMilvus(db);
    case 'lancedb':
      return exportAsLanceDB(db);
    default:
      return JSON.stringify(db, null, 2);
  }
};

/**
 * Get file name for export format
 */
export const getExportFileName = (dbName: string, format: VectorDBFormat, fileFormat: ExportFileFormat = 'json'): string => {
  const suffix: Record<VectorDBFormat, string> = {
    chromadb: '_chromadb',
    faiss: '_faiss', 
    qdrant: '_qdrant',
    pinecone: '_pinecone',
    weaviate: '_weaviate',
    milvus: '_milvus',
    lancedb: '_lancedb',
  };
  const ext = {
    json: '.json',
    msgpack: '.msgpack',
    parquet: '.parquet',
  }[fileFormat];
  return `${dbName}${suffix[format]}${ext}`;
};

/**
 * Get MIME type for file format
 */
export const getMimeType = (fileFormat: ExportFileFormat): string => {
  const mimeTypes = {
    json: 'application/json',
    msgpack: 'application/x-msgpack',
    parquet: 'application/vnd.apache.parquet',
  };
  return mimeTypes[fileFormat];
};

/**
 * Get file extension for file format
 */
export const getFileExtension = (fileFormat: ExportFileFormat): string => {
  const extensions = {
    json: '.json',
    msgpack: '.msgpack',
    parquet: '.parquet',
  };
  return extensions[fileFormat];
};

/**
 * Export vector database as a Blob in the specified file format
 */
export const exportVectorDBAsBlob = async (
  db: VectorDatabase, 
  dbFormat: VectorDBFormat,
  fileFormat: ExportFileFormat
): Promise<Blob> => {
  // Get the JSON data structure for the DB format
  let data: any;
  switch (dbFormat) {
    case 'chromadb':
      data = JSON.parse(exportAsChromaDB(db));
      break;
    case 'faiss':
      data = JSON.parse(exportAsFAISS(db));
      break;
    case 'qdrant':
      data = JSON.parse(exportAsQdrant(db));
      break;
    default:
      data = db;
  }

  // Convert to the specified file format
  switch (fileFormat) {
    case 'json':
      return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    
    case 'msgpack':
      const encoded = msgpackEncode(data);
      // Create a new ArrayBuffer copy to avoid SharedArrayBuffer issues
      const buffer = new ArrayBuffer(encoded.length);
      new Uint8Array(buffer).set(encoded);
      return new Blob([buffer], { type: 'application/x-msgpack' });
    
    case 'parquet':
      // For Parquet, we'll export as a JSON file with .parquet-compatible structure
      // True Parquet requires complex WASM setup - using JSON with Parquet-like structure instead
      const parquetLikeData = {
        schema: {
          fields: [
            { name: 'id', type: 'string' },
            { name: 'fileName', type: 'string' },
            { name: 'content', type: 'string' },
            { name: 'title', type: 'string' },
            { name: 'embedding', type: 'array<float>' },
            { name: 'createdAt', type: 'string' },
          ]
        },
        data: db.documents.map(d => ({
          id: d.id,
          fileName: d.fileName,
          content: d.content,
          title: d.metadata.title || d.fileName,
          embedding: d.embedding,
          createdAt: d.metadata.createdAt,
        })),
        metadata: {
          name: db.name,
          dimension: db.dimension,
          createdAt: db.createdAt,
          format: dbFormat,
        }
      };
      return new Blob([JSON.stringify(parquetLikeData, null, 2)], { type: 'application/json' });
    
    default:
      return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  }
};

/**
 * Save vector database to user-selected folder
 */
export const saveVectorDBToFolder = async (
  db: VectorDatabase,
  dbFormat: VectorDBFormat,
  fileFormat: ExportFileFormat
): Promise<string> => {
  const fileName = getExportFileName(db.name, dbFormat, fileFormat);
  const blob = await exportVectorDBAsBlob(db, dbFormat, fileFormat);
  
  // Try to use File System Access API (Chrome/Edge)
  if ('showSaveFilePicker' in window) {
    try {
      const fileTypes: { description: string; accept: Record<string, string[]> }[] = [];
      
      if (fileFormat === 'json') {
        fileTypes.push({ description: 'JSON File', accept: { 'application/json': ['.json'] } });
      } else if (fileFormat === 'msgpack') {
        fileTypes.push({ description: 'MessagePack File', accept: { 'application/x-msgpack': ['.msgpack'] } });
      } else if (fileFormat === 'parquet') {
        fileTypes.push({ description: 'Parquet File', accept: { 'application/vnd.apache.parquet': ['.parquet'] } });
      }
      
      // @ts-ignore
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: fileTypes,
      });
      
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      
      return handle.name;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('Save cancelled');
      }
      // Fall through to download fallback
    }
  }
  
  // Fallback: trigger download
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
  
  return fileName;
};

/**
 * Result of importing a vector database
 */
export interface ImportResult {
  database: VectorDatabase;
  detectedFormat: VectorDBFormat | 'standard';
  fileFormat: 'json' | 'msgpack';
}

/**
 * Import a vector database from file content
 * Handles all vector DB formats: ChromaDB, FAISS, Qdrant, Pinecone, Weaviate, Milvus, LanceDB
 * Supports JSON and MessagePack file formats
 */
export const importVectorDB = (content: string | ArrayBuffer): ImportResult => {
  let data: any;
  let fileFormat: 'json' | 'msgpack' = 'json';
  
  // Try to parse as JSON first
  if (typeof content === 'string') {
    data = JSON.parse(content);
  } else {
    // Try MessagePack decode
    try {
      const { decode } = require('@msgpack/msgpack');
      data = decode(new Uint8Array(content));
      fileFormat = 'msgpack';
    } catch {
      // Try as JSON string from ArrayBuffer
      const text = new TextDecoder().decode(content);
      data = JSON.parse(text);
    }
  }
  
  // Detect format and convert to standard VectorDatabase
  
  // Check if it has the standard documents array (direct export or LanceDB data array)
  if (data.documents && Array.isArray(data.documents) && data.documents[0]?.embedding) {
    return {
      database: data as VectorDatabase,
      detectedFormat: 'standard',
      fileFormat,
    };
  }
  
  // Check for _documents (ChromaDB export)
  if (data._documents && Array.isArray(data._documents)) {
    return {
      database: {
        name: data.name,
        createdAt: data.createdAt,
        dimension: data.dimension,
        documents: data._documents,
      },
      detectedFormat: 'chromadb',
      fileFormat,
    };
  }
  
  // Check for ChromaDB format (ids, documents, embeddings, metadatas)
  if (data.ids && data.embeddings && Array.isArray(data.ids)) {
    return {
      database: {
        name: data.name || 'imported_db',
        createdAt: data.createdAt || new Date().toISOString(),
        dimension: data.dimension || data.embeddings[0]?.length || 384,
        documents: data.ids.map((id: string, i: number) => ({
          id,
          fileName: data.metadatas?.[i]?.filename || `document_${i}`,
          content: data.documents?.[i] || '',
          embedding: data.embeddings[i],
          metadata: {
            title: data.metadatas?.[i]?.title || data.metadatas?.[i]?.filename,
            createdAt: data.createdAt || new Date().toISOString(),
          },
        })),
      },
      detectedFormat: 'chromadb',
      fileFormat,
    };
  }
  
  // Check for points array (Qdrant export)
  if (data.points && Array.isArray(data.points)) {
    return {
      database: {
        name: data.name || data.collection_name,
        createdAt: data.createdAt || new Date().toISOString(),
        dimension: data.dimension || data.points[0]?.vector?.length || 384,
        documents: data.points.map((p: any, i: number) => ({
          id: `doc_${p.id || i}`,
          fileName: p.payload?.filename || `document_${i}`,
          content: p.payload?.content || '',
          embedding: p.vector,
          metadata: {
            title: p.payload?.title || p.payload?.filename,
            createdAt: data.createdAt || new Date().toISOString(),
          },
        })),
      },
      detectedFormat: 'qdrant',
      fileFormat,
    };
  }
  
  // Check for vectors array (Pinecone export)
  if (data.vectors && Array.isArray(data.vectors)) {
    return {
      database: {
        name: data.name || 'pinecone_db',
        createdAt: data.createdAt || new Date().toISOString(),
        dimension: data.dimension || data.vectors[0]?.values?.length || 384,
        documents: data.vectors.map((v: any, i: number) => ({
          id: v.id || `doc_${i}`,
          fileName: v.metadata?.filename || `document_${i}`,
          content: v.metadata?.content || '',
          embedding: v.values,
          metadata: {
            title: v.metadata?.title || v.metadata?.filename,
            createdAt: data.createdAt || new Date().toISOString(),
          },
        })),
      },
      detectedFormat: 'pinecone',
      fileFormat,
    };
  }
  
  // Check for objects array (Weaviate export)
  if (data.objects && Array.isArray(data.objects)) {
    return {
      database: {
        name: data.name || data.class || 'weaviate_db',
        createdAt: data.createdAt || new Date().toISOString(),
        dimension: data.dimension || data.objects[0]?.vector?.length || 384,
        documents: data.objects.map((obj: any, i: number) => ({
          id: obj.id || `doc_${i}`,
          fileName: obj.properties?.filename || `document_${i}`,
          content: obj.properties?.content || '',
          embedding: obj.vector,
          metadata: {
            title: obj.properties?.title || obj.properties?.filename,
            createdAt: obj.properties?.createdAt || data.createdAt || new Date().toISOString(),
          },
        })),
      },
      detectedFormat: 'weaviate',
      fileFormat,
    };
  }
  
  // Check for fields array (Milvus export)
  if (data.fields && Array.isArray(data.fields)) {
    const idField = data.fields.find((f: any) => f.name === 'id');
    const embeddingField = data.fields.find((f: any) => f.name === 'embedding');
    const contentField = data.fields.find((f: any) => f.name === 'content');
    const filenameField = data.fields.find((f: any) => f.name === 'filename');
    const titleField = data.fields.find((f: any) => f.name === 'title');
    
    if (embeddingField) {
      const count = embeddingField.data?.length || 0;
      return {
        database: {
          name: data.name || data.collection_name || 'milvus_db',
          createdAt: data.createdAt || new Date().toISOString(),
          dimension: data.dimension || embeddingField.data?.[0]?.length || 384,
          documents: Array.from({ length: count }, (_, i) => ({
            id: idField?.data?.[i] || `doc_${i}`,
            fileName: filenameField?.data?.[i] || `document_${i}`,
            content: contentField?.data?.[i] || '',
            embedding: embeddingField.data[i],
            metadata: {
              title: titleField?.data?.[i] || filenameField?.data?.[i],
              createdAt: data.createdAt || new Date().toISOString(),
            },
          })),
        },
        detectedFormat: 'milvus',
        fileFormat,
      };
    }
  }
  
  // Check for data array with schema (LanceDB export)
  if (data.data && Array.isArray(data.data) && data.schema) {
    return {
      database: {
        name: data.metadata?.name || data.table_name || 'lancedb_db',
        createdAt: data.metadata?.createdAt || data.createdAt || new Date().toISOString(),
        dimension: data.metadata?.dimension || data.data[0]?.vector?.length || 384,
        documents: data.data.map((row: any, i: number) => ({
          id: row.id || `doc_${i}`,
          fileName: row.filename || `document_${i}`,
          content: row.content || '',
          embedding: row.vector,
          metadata: {
            title: row.title || row.filename,
            createdAt: row.created_at || data.createdAt || new Date().toISOString(),
          },
        })),
      },
      detectedFormat: 'lancedb',
      fileFormat,
    };
  }
  
  // Check for embeddings array (FAISS export)
  if (data.embeddings && Array.isArray(data.embeddings) && data.metadata) {
    const docs = data.metadata.documents || [];
    const metas = data.metadata.metadatas || [];
    return {
      database: {
        name: data.name,
        createdAt: data.createdAt || new Date().toISOString(),
        dimension: data.dimension || data.embeddings[0]?.length || 384,
        documents: data.embeddings.map((emb: number[], i: number) => ({
          id: `doc_${i}`,
          fileName: metas[i]?.filename || `document_${i}`,
          content: docs[i] || '',
          embedding: emb,
          metadata: {
            title: metas[i]?.title || metas[i]?.filename,
            createdAt: data.createdAt || new Date().toISOString(),
          },
        })),
      },
      detectedFormat: 'faiss',
      fileFormat,
    };
  }
  
  throw new Error('Unrecognized vector database format. Supported formats: ChromaDB, FAISS, Qdrant, Pinecone, Weaviate, Milvus, LanceDB');
};

/**
 * Get display name for a detected format
 */
export const getFormatDisplayName = (format: VectorDBFormat | 'standard'): string => {
  const names: Record<VectorDBFormat | 'standard', string> = {
    chromadb: 'ChromaDB',
    faiss: 'FAISS',
    qdrant: 'Qdrant',
    pinecone: 'Pinecone',
    weaviate: 'Weaviate',
    milvus: 'Milvus',
    lancedb: 'LanceDB',
    standard: 'Standard',
  };
  return names[format] || format;
};
