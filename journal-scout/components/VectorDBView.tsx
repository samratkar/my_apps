import React, { useState } from 'react';
import { FolderInput, Database, Search, Download, Upload, AlertCircle, CheckCircle2, FileText, X, Save, Folder } from 'lucide-react';
import { Button } from './Button';
import { 
  searchVectorDatabase, 
  VectorDatabase,
  VectorDocument 
} from '../services/embeddingService';
import { 
  createVectorDB, 
  importVectorDB,
  saveVectorDBToFolder,
  getFormatDisplayName,
  VectorDBFormat,
  ExportFileFormat,
  ImportResult
} from '../utils/vectordb';
import { isSupportedFile, readFileContent } from '../utils/pdfUtils';

interface VectorDBViewProps {
  apiKey?: string; // No longer required - uses local model
}

export const VectorDBView: React.FC<VectorDBViewProps> = () => {
  // Create section state
  const [inputFiles, setInputFiles] = useState<{ name: string; content: string }[]>([]);
  const [folderName, setFolderName] = useState('');
  const [dbName, setDbName] = useState('');
  const [vectorDBFormat, setVectorDBFormat] = useState<VectorDBFormat>('chromadb');
  const [exportFileFormat, setExportFileFormat] = useState<ExportFileFormat>('json');
  const [createdVectorDB, setCreatedVectorDB] = useState<VectorDatabase | null>(null);
  const [creating, setCreating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, fileName: '' });
  const [modelStatus, setModelStatus] = useState<string>('');
  
  // Import/Search section state
  const [importedVectorDB, setImportedVectorDB] = useState<VectorDatabase | null>(null);
  const [importedFormat, setImportedFormat] = useState<VectorDBFormat | 'standard' | null>(null);
  const [importedFileFormat, setImportedFileFormat] = useState<'json' | 'msgpack' | null>(null);
  const [importing, setImporting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{ document: VectorDocument; score: number }[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<VectorDocument | null>(null);
  
  // Common state
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ============ CREATE SECTION HANDLERS ============

  const handleSelectFolder = async () => {
    setError(null);
    setSuccess(null);
    setCreatedVectorDB(null);
    setLoadingFiles(true);
    
    // Try native folder picker (Chrome/Edge)
    if ('showDirectoryPicker' in window) {
      try {
        // @ts-ignore
        const dirHandle = await window.showDirectoryPicker({ mode: 'read' });
        const files: { name: string; content: string; fileObj?: File }[] = [];
        const supportedFiles: File[] = [];

        // First pass: collect all supported files
        for await (const entry of dirHandle.values()) {
          if (entry.kind === 'file' && isSupportedFile(entry.name)) {
            const file = await entry.getFile();
            supportedFiles.push(file);
          }
        }

        if (supportedFiles.length === 0) {
          setError('No supported files (.txt, .md, .pdf) found in the selected folder.');
          setLoadingFiles(false);
          return;
        }

        // Second pass: read content (with progress for PDFs)
        for (let i = 0; i < supportedFiles.length; i++) {
          const file = supportedFiles[i];
          setProgress({ current: i + 1, total: supportedFiles.length, fileName: `Reading: ${file.name}` });
          try {
            const content = await readFileContent(file);
            files.push({ name: file.name, content, fileObj: file });
          } catch (err: any) {
            console.warn(`Failed to read ${file.name}:`, err.message);
          }
        }

        if (files.length === 0) {
          setError('Could not read any files from the selected folder.');
          setLoadingFiles(false);
          return;
        }

        setInputFiles(files);
        setFolderName(dirHandle.name);
        setDbName(dirHandle.name + '_vectordb');
        
        const pdfCount = files.filter(f => f.name.toLowerCase().endsWith('.pdf')).length;
        const txtCount = files.filter(f => f.name.toLowerCase().endsWith('.txt')).length;
        const mdCount = files.filter(f => f.name.toLowerCase().endsWith('.md')).length;
        
        setSuccess(`Loaded ${files.length} files (${pdfCount} PDF, ${txtCount} TXT, ${mdCount} MD) from "${dirHandle.name}"`);
        setLoadingFiles(false);
        setProgress({ current: 0, total: 0, fileName: '' });
        return;
      } catch (err: any) {
        if (err.name === 'AbortError') {
          setLoadingFiles(false);
          return;
        }
        console.warn('Directory picker failed:', err.message);
      }
    }
    
    // Fallback: use file input with webkitdirectory for folder selection
    const input = document.createElement('input');
    input.type = 'file';
    // @ts-ignore - webkitdirectory is non-standard but widely supported
    input.webkitdirectory = true;
    input.onchange = async (e) => {
      const fileList = (e.target as HTMLInputElement).files;
      if (!fileList || fileList.length === 0) {
        setLoadingFiles(false);
        return;
      }
      
      const supportedFiles = Array.from(fileList).filter(f => isSupportedFile(f.name));
      
      if (supportedFiles.length === 0) {
        setError('No supported files (.txt, .md, .pdf) found in the selected folder.');
        setLoadingFiles(false);
        return;
      }
      
      const files: { name: string; content: string; fileObj?: File }[] = [];
      for (let i = 0; i < supportedFiles.length; i++) {
        const file = supportedFiles[i];
        setProgress({ current: i + 1, total: supportedFiles.length, fileName: `Reading: ${file.name}` });
        
        try {
          const content = await readFileContent(file);
          files.push({ name: file.name, content, fileObj: file });
        } catch (err: any) {
          console.warn(`Failed to read ${file.name}:`, err.message);
        }
      }
      
      // Extract folder name from path
      const firstFile = fileList[0];
      const pathParts = firstFile.webkitRelativePath?.split('/') || [];
      const folderNameFromPath = pathParts[0] || 'papers';
      
      setInputFiles(files);
      setFolderName(folderNameFromPath);
      setDbName(folderNameFromPath + '_vectordb');
      
      const pdfCount = files.filter(f => f.name.toLowerCase().endsWith('.pdf')).length;
      const txtCount = files.filter(f => f.name.toLowerCase().endsWith('.txt')).length;
      const mdCount = files.filter(f => f.name.toLowerCase().endsWith('.md')).length;
      
      setSuccess(`Loaded ${files.length} files (${pdfCount} PDF, ${txtCount} TXT, ${mdCount} MD)`);
      setLoadingFiles(false);
      setProgress({ current: 0, total: 0, fileName: '' });
    };
    input.click();
  };

  const handleCreateVectorDB = async () => {
    if (inputFiles.length === 0 || !dbName.trim()) {
      setError('Please select a folder and enter a database name.');
      return;
    }

    setCreating(true);
    setError(null);
    setSuccess(null);
    setCreatedVectorDB(null);
    setProgress({ current: 0, total: inputFiles.length, fileName: '' });
    setModelStatus('Loading embedding model...');

    try {
      // Pass fileObj in metadata for PDF reference
      const filesWithMeta = inputFiles.map(f => ({ ...f, fileObj: f.fileObj }));
      const db = await createVectorDB({
        files: filesWithMeta,
        dbName: dbName.trim(),
        format: vectorDBFormat,
        onProgress: (current, total, fileName) => {
          setModelStatus('');
          setProgress({ current, total, fileName });
        },
        onModelProgress: (p) => {
          if (p.progress !== undefined) {
            setModelStatus(`Loading model: ${Math.round(p.progress)}%`);
          } else {
            setModelStatus(p.status || 'Loading model...');
          }
        },
      });
      // Attach fileObj to each document for PDF access
      db.documents.forEach((doc, i) => {
        doc.fileObj = inputFiles[i]?.fileObj;
      });
      setCreatedVectorDB(db);
      setSuccess(`Vector database created with ${db.documents.length} documents! Choose format and click "Save to Folder" to export.`);
    } catch (err: any) {
      setError(`Failed to create vector database: ${err.message}`);
    } finally {
      setCreating(false);
    }
  };

  const handleExportVectorDB = async () => {
    if (!createdVectorDB) return;
    
    setExporting(true);
    setError(null);
    
    try {
      const fileName = await saveVectorDBToFolder(createdVectorDB, vectorDBFormat, exportFileFormat);
      setSuccess(`Saved "${fileName}" successfully!`);
    } catch (err: any) {
      if (err.message !== 'Save cancelled') {
        setError(`Export failed: ${err.message}`);
      }
    } finally {
      setExporting(false);
    }
  };

  // ============ IMPORT/SEARCH SECTION HANDLERS ============

  const handleImportVectorDB = async () => {
    setError(null);
    setSuccess(null);
    setSearchResults(null);
    setImporting(true);

    // Use standard file input - works in all contexts including iframes
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.msgpack';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        try {
          const isMsgpack = file.name.endsWith('.msgpack');
          
          let result: ImportResult;
          if (isMsgpack) {
            const buffer = await file.arrayBuffer();
            result = importVectorDB(buffer);
          } else {
            const content = await file.text();
            result = importVectorDB(content);
          }
          
          setImportedVectorDB(result.database);
          setImportedFormat(result.detectedFormat);
          setImportedFileFormat(result.fileFormat);
          setSuccess(`Imported "${result.database.name}" (${getFormatDisplayName(result.detectedFormat)} format) with ${result.database.documents.length} documents.`);
        } catch (err: any) {
          setError(`Import failed: ${err.message}`);
        } finally {
          setImporting(false);
        }
      } else {
        setImporting(false);
      }
    };
    // Handle cancel - user closes file dialog without selecting
    input.addEventListener('cancel', () => {
      setImporting(false);
    });
    input.click();
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importedVectorDB || !searchQuery.trim()) return;

    setSearching(true);
    setError(null);

    try {
      const results = await searchVectorDatabase(searchQuery, importedVectorDB, 5);
      setSearchResults(results);
    } catch (err: any) {
      setError(`Search failed: ${err.message}`);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 rounded-full mb-4">
          <Database className="w-8 h-8 text-purple-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          Vector Database Builder
        </h2>
        <p className="text-slate-600">
          Create vector embeddings from your papers locally in the browser - no API costs!
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">{error}</div>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
            <X size={18} />
          </button>
        </div>
      )}
      
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3 text-green-700">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div className="flex-1">{success}</div>
          <button onClick={() => setSuccess(null)} className="text-green-400 hover:text-green-600">
            <X size={18} />
          </button>
        </div>
      )}

      {/* Section 1: Create Vector DB */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-purple-500" />
          Create Vector Database
        </h3>
        
        <div className="space-y-4">
          {/* Step 1: Select Folder */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              1. Select folder containing papers (.txt, .md, .pdf)
            </label>
            
            {/* Loading progress for file reading */}
            {loadingFiles && progress.total > 0 && (
              <div className="mb-3">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>{progress.fileName}</span>
                  <span>{progress.current}/{progress.total}</span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
            
            <Button
              onClick={handleSelectFolder}
              disabled={loadingFiles}
              isLoading={loadingFiles}
              variant="outline"
              icon={<Folder size={18} />}
              className="w-full justify-center"
            >
              {loadingFiles 
                ? 'Reading files...' 
                : inputFiles.length > 0 
                  ? `📁 ${folderName} (${inputFiles.length} files)` 
                  : 'Select Folder'}
            </Button>
            
            {/* File type breakdown */}
            {inputFiles.length > 0 && !loadingFiles && (
              <div className="mt-2 flex gap-3 text-xs text-slate-500">
                <span>📄 {inputFiles.filter(f => f.name.toLowerCase().endsWith('.pdf')).length} PDF</span>
                <span>📝 {inputFiles.filter(f => f.name.toLowerCase().endsWith('.txt')).length} TXT</span>
                <span>📋 {inputFiles.filter(f => f.name.toLowerCase().endsWith('.md')).length} MD</span>
              </div>
            )}
          </div>

          {/* Step 2: Select Vector DB Format (shown after files selected) */}
          {inputFiles.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                2. Select Vector DB Format
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: 'chromadb', label: 'ChromaDB', desc: 'Simple & local' },
                  { value: 'faiss', label: 'FAISS', desc: 'Fast & scalable' },
                  { value: 'qdrant', label: 'Qdrant', desc: 'Full-featured' },
                  { value: 'pinecone', label: 'Pinecone', desc: 'Cloud-native' },
                  { value: 'weaviate', label: 'Weaviate', desc: 'GraphQL-based' },
                  { value: 'milvus', label: 'Milvus', desc: 'Distributed' },
                  { value: 'lancedb', label: 'LanceDB', desc: 'Arrow-based' },
                ].map((lib) => (
                  <button
                    key={lib.value}
                    onClick={() => setVectorDBFormat(lib.value as VectorDBFormat)}
                    className={`p-2 rounded-lg border text-left transition-all ${
                      vectorDBFormat === lib.value
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600'
                    }`}
                  >
                    <div className="font-medium text-sm">{lib.label}</div>
                    <div className="text-xs opacity-70">{lib.desc}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Create Vector DB */}
          {inputFiles.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                3. Create Vector Database
              </label>
              
              {/* Model Loading Status */}
              {modelStatus && (
                <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700">
                  ⏳ {modelStatus}
                </div>
              )}
              
              {/* Progress Bar */}
              {creating && !modelStatus && (
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                    <span>Processing: {progress.fileName || 'Starting...'}</span>
                    <span>{progress.current}/{progress.total}</span>
                  </div>
                  <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-purple-500 transition-all duration-300"
                      style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}

              <Button
                onClick={handleCreateVectorDB}
                disabled={creating}
                isLoading={creating}
                icon={<Database size={18} />}
                className="w-full justify-center"
              >
                {creating ? 'Creating...' : 'Create Vector DB'}
              </Button>
              
              <p className="mt-2 text-xs text-slate-500">
                Uses local ML model (all-MiniLM-L6-v2) - no API key needed! Model downloads once (~25MB), then cached.
              </p>
            </div>
          )}

          {/* Step 4: Export Options (shown after creation) */}
          {createdVectorDB && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
              <div className="font-medium text-green-800 mb-3 flex items-center gap-2">
                <CheckCircle2 size={18} />
                Vector DB Created: {createdVectorDB.name}
              </div>
              <div className="flex gap-4 text-xs text-green-700 mb-4">
                <span><strong>{createdVectorDB.documents.length}</strong> documents</span>
                <span><strong>{createdVectorDB.dimension}</strong> dimensions</span>
              </div>
              
              {/* Export File Format Selection */}
              <div className="mb-3">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Export File Format
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'json', label: 'JSON', desc: 'Human-readable' },
                    { value: 'msgpack', label: 'MessagePack', desc: '~50% smaller' },
                    { value: 'parquet', label: 'Parquet', desc: 'Columnar format' },
                  ].map((fmt) => (
                    <button
                      key={fmt.value}
                      onClick={() => setExportFileFormat(fmt.value as ExportFileFormat)}
                      className={`p-2 rounded-lg border text-left transition-all ${
                        exportFileFormat === fmt.value
                          ? 'border-green-500 bg-green-100 text-green-800'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <div className="font-medium text-sm">{fmt.label}</div>
                      <div className="text-xs opacity-70">{fmt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Save Button */}
              <Button
                onClick={handleExportVectorDB}
                disabled={exporting}
                isLoading={exporting}
                icon={<Save size={18} />}
                className="w-full justify-center"
              >
                {exporting ? 'Saving...' : 'Save to Folder'}
              </Button>
              <p className="mt-2 text-xs text-slate-500 text-center">
                Choose where to save your vector database
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Section 2: Import & Search */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Search className="w-5 h-5 text-purple-500" />
          Import & Search
        </h3>
        
        {/* Import Button */}
        <div className="mb-4">
          <Button
            onClick={handleImportVectorDB}
            variant="outline"
            disabled={importing}
            isLoading={importing}
            icon={<Upload size={18} />}
            className="w-full justify-center"
          >
            {importing ? 'Importing...' : 'Import Vector DB'}
          </Button>
          <p className="mt-2 text-xs text-slate-500 text-center">
            Supports JSON and MessagePack formats
          </p>
        </div>
        
        {/* Imported DB Info */}
        {importedVectorDB && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
            <div className="font-medium text-slate-800 mb-1">
              ✓ Loaded: {importedVectorDB.name}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
              <span><strong>{importedVectorDB.documents.length}</strong> documents</span>
              <span><strong>{importedVectorDB.dimension}</strong> dimensions</span>
              <span>Created: {new Date(importedVectorDB.createdAt).toLocaleDateString()}</span>
            </div>
            {importedFormat && (
              <div className="mt-2 pt-2 border-t border-green-200 flex items-center gap-2">
                <span className="text-xs text-slate-500">Format:</span>
                <span className="text-xs font-medium text-green-700 bg-green-100 px-2 py-0.5 rounded">
                  {getFormatDisplayName(importedFormat)}
                </span>
                {importedFileFormat && (
                  <span className="text-xs text-slate-500">
                    ({importedFileFormat.toUpperCase()} file)
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Search */}
        <div className={!importedVectorDB ? 'opacity-50' : ''}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-medium text-slate-700">Semantic Search</span>
            {!importedVectorDB && (
              <span className="text-xs text-slate-400 ml-auto">(import a database first)</span>
            )}
          </div>
          
          <form onSubmit={handleSearch}>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search your papers semantically..."
                disabled={!importedVectorDB}
                className="block w-full px-4 py-3 pr-24 bg-slate-50 border border-slate-200 rounded-xl text-base placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 disabled:cursor-not-allowed"
              />
              <div className="absolute inset-y-1 right-1">
                <Button
                  type="submit"
                  isLoading={searching}
                  disabled={!importedVectorDB}
                  className="h-full rounded-lg px-4"
                >
                  Search
                </Button>
              </div>
            </div>
          </form>

          {/* Search Results */}
          {searchResults && (
            <div className="mt-4 space-y-3">
              <h4 className="font-medium text-slate-700">
                Top {searchResults.length} Results:
              </h4>
              {searchResults.map((result) => (
                <div 
                  key={result.document.id}
                  onClick={() => setSelectedDocument(result.document)}
                  className="bg-slate-50 rounded-xl p-4 border border-slate-100 cursor-pointer hover:bg-slate-100 hover:border-purple-200 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-4 h-4 text-purple-500" />
                        <span className="font-medium text-slate-800 hover:text-purple-600">
                          {result.document.metadata.title || result.document.fileName}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-2">
                        {result.document.content.substring(0, 200)}...
                      </p>
                      {result.document.fileObj && result.document.fileName.toLowerCase().endsWith('.pdf') && (
                        <p className="text-xs text-blue-600 mt-2">
                          <button
                            className="underline hover:text-blue-800"
                            onClick={e => {
                              e.stopPropagation();
                              const url = URL.createObjectURL(result.document.fileObj);
                              window.open(url, '_blank');
                            }}
                          >
                            View PDF
                          </button>
                        </p>
                      )}
                      <p className="text-xs text-purple-500 mt-2">Click to view full document</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="text-xs text-slate-500">Similarity</div>
                      <div className="text-lg font-bold text-purple-600">
                        {(result.score * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Document Viewer Modal */}
      {selectedDocument && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedDocument(null)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-purple-500" />
                <div>
                  <h3 className="font-semibold text-slate-800">
                    {selectedDocument.metadata.title || selectedDocument.fileName}
                  </h3>
                  <p className="text-xs text-slate-500">{selectedDocument.fileName}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDocument(null)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-6">
              <pre className="whitespace-pre-wrap font-sans text-sm text-slate-700 leading-relaxed">
                {selectedDocument.content}
              </pre>
            </div>
            
            {/* Modal Footer */}
            <div className="flex items-center justify-between p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
              <div className="text-xs text-slate-500">
                {selectedDocument.content.length.toLocaleString()} characters
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(selectedDocument.content);
                    setSuccess('Document copied to clipboard!');
                    setTimeout(() => setSuccess(null), 2000);
                  }}
                >
                  Copy to Clipboard
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const blob = new Blob([selectedDocument.content], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = selectedDocument.fileName;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  icon={<Download size={16} />}
                >
                  Download
                </Button>
                <Button
                  size="sm"
                  onClick={() => setSelectedDocument(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
