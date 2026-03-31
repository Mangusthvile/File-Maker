import React, { useState, useRef, useEffect } from 'react';
import { FolderOpen, Save, FileText, CheckCircle2, AlertCircle, RefreshCw, ExternalLink, History } from 'lucide-react';

interface FileHistory {
  name: string;
  time: Date;
  success: boolean;
}

export default function App() {
  const [dirHandle, setDirHandle] = useState<any>(null);
  const [fileName, setFileName] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [history, setHistory] = useState<FileHistory[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Settings
  const [autoIncrement, setAutoIncrement] = useState(true);
  const [keepContent, setKeepContent] = useState(false);
  const [defaultExtension, setDefaultExtension] = useState('.txt');

  const fileNameInputRef = useRef<HTMLInputElement>(null);
  const isInIframe = window.self !== window.top;

  const handleSelectFolder = async () => {
    try {
      if (!('showDirectoryPicker' in window)) {
        throw new Error('Your browser does not support direct folder access. Standard downloads will be used.');
      }
      // @ts-ignore
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      setDirHandle(handle);
      setError(null);
    } catch (err: any) {
      console.error(err);
      if (err.name === 'SecurityError') {
        setError('Folder selection is blocked in this preview. Please open the app in a new tab to use direct folder saving.');
      } else if (err.name !== 'AbortError') {
        setError(err.message || 'Failed to select folder. Standard downloads will be used.');
      }
    }
  };

  const incrementFileName = (currentName: string) => {
    // Matches names like "file1", "file002.txt", "document-42"
    const match = currentName.match(/^(.*?)(\d+)(\.[^.]*)?$/);
    if (match) {
      const prefix = match[1];
      const numStr = match[2];
      const suffix = match[3] || '';
      const nextNum = String(parseInt(numStr, 10) + 1).padStart(numStr.length, '0');
      return `${prefix}${nextNum}${suffix}`;
    }
    return '';
  };

  const handleSave = async () => {
    if (!fileName.trim()) {
      setError('Please enter a file name.');
      fileNameInputRef.current?.focus();
      return;
    }

    let finalFileName = fileName;
    if (!finalFileName.includes('.')) {
      finalFileName += defaultExtension;
    }

    let success = false;

    try {
      if (dirHandle) {
        // Direct save to selected folder
        const fileHandle = await dirHandle.getFileHandle(finalFileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(fileContent);
        await writable.close();
        success = true;
      } else {
        // Fallback standard download
        const blob = new Blob([fileContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = finalFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        success = true;
      }

      // Update history
      setHistory(prev => [{ name: finalFileName, time: new Date(), success }, ...prev].slice(0, 50));
      setError(null);

      // Post-save actions
      if (autoIncrement) {
        const nextName = incrementFileName(fileName);
        if (nextName) {
          setFileName(nextName);
        } else {
          setFileName('');
        }
      } else {
        setFileName('');
      }

      if (!keepContent) {
        setFileContent('');
      }

      // Refocus name input for rapid entry
      setTimeout(() => {
        fileNameInputRef.current?.focus();
      }, 50);

    } catch (err: any) {
      console.error('Save error:', err);
      setError(`Failed to save ${finalFileName}: ${err.message}`);
      setHistory(prev => [{ name: finalFileName, time: new Date(), success: false }, ...prev].slice(0, 50));
    }
  };

  // Keyboard shortcut: Ctrl+Enter or Cmd+Enter to save
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fileName, fileContent, dirHandle, autoIncrement, keepContent, defaultExtension]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 font-sans selection:bg-neutral-700">
      {/* Header */}
      <header className="bg-neutral-900 border-b border-neutral-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-neutral-800 p-2 rounded-lg text-neutral-100 border border-neutral-700">
            <FileText size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight text-neutral-100">Fast File Creator</h1>
            <p className="text-sm text-neutral-400">Rapidly generate 500+ files</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {isInIframe && !dirHandle && (
            <div className="hidden md:flex items-center gap-2 text-amber-400 bg-amber-950/30 px-3 py-1.5 rounded-full text-sm font-medium border border-amber-900/50">
              <ExternalLink size={16} />
              <span>Open in new tab for direct folder access</span>
            </div>
          )}
          <button
            onClick={handleSelectFolder}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              dirHandle 
                ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800/50 hover:bg-emerald-900/50' 
                : 'bg-neutral-800 text-neutral-200 border border-neutral-700 hover:bg-neutral-700 shadow-sm'
            }`}
          >
            {dirHandle ? <CheckCircle2 size={18} /> : <FolderOpen size={18} />}
            {dirHandle ? `Saving to: ${dirHandle.name}` : 'Select Target Folder'}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Editor */}
        <div className="lg:col-span-2 space-y-6">
          
          {error && (
            <div className="bg-red-950/30 border border-red-900/50 text-red-400 px-4 py-3 rounded-lg flex items-start gap-3">
              <AlertCircle className="shrink-0 mt-0.5" size={18} />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="bg-neutral-900 rounded-xl shadow-sm border border-neutral-800 overflow-hidden flex flex-col h-[600px]">
            {/* Editor Toolbar */}
            <div className="bg-neutral-900 border-b border-neutral-800 p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex-1 w-full relative">
                <input
                  ref={fileNameInputRef}
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="Filename (e.g., file001.txt)"
                  className="w-full pl-3 pr-16 py-2 bg-neutral-950 border border-neutral-800 rounded-md focus:outline-none focus:ring-1 focus:ring-neutral-500 focus:border-neutral-500 font-mono text-sm text-neutral-200 placeholder-neutral-600"
                  autoFocus
                />
                {!fileName.includes('.') && fileName.length > 0 && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-sm pointer-events-none">
                    {defaultExtension}
                  </span>
                )}
              </div>
              
              <button
                onClick={handleSave}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-neutral-100 hover:bg-white text-neutral-950 px-6 py-2 rounded-md font-medium transition-colors shadow-sm"
              >
                <Save size={18} />
                Save File
                <span className="hidden sm:inline text-neutral-500 text-xs ml-1 font-normal">(Cmd/Ctrl+Enter)</span>
              </button>
            </div>

            {/* Editor Area */}
            <textarea
              value={fileContent}
              onChange={(e) => setFileContent(e.target.value)}
              placeholder="Enter file content here..."
              className="flex-1 w-full p-4 bg-neutral-900 resize-none focus:outline-none font-mono text-sm text-neutral-200 placeholder-neutral-600"
            />
          </div>

          {/* Settings / Workflow Toggles */}
          <div className="bg-neutral-900 rounded-xl shadow-sm border border-neutral-800 p-5">
            <h3 className="text-sm font-semibold text-neutral-200 uppercase tracking-wider mb-4 flex items-center gap-2">
              <RefreshCw size={16} className="text-neutral-500" />
              Workflow Settings
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center mt-0.5">
                  <input 
                    type="checkbox" 
                    className="peer sr-only"
                    checked={autoIncrement}
                    onChange={(e) => setAutoIncrement(e.target.checked)}
                  />
                  <div className="w-5 h-5 border-2 border-neutral-700 bg-neutral-950 rounded peer-checked:bg-neutral-200 peer-checked:border-neutral-200 transition-colors"></div>
                  <CheckCircle2 size={14} className="absolute text-neutral-900 opacity-0 peer-checked:opacity-100 transition-opacity" />
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-200 group-hover:text-white transition-colors">Auto-increment numbers</p>
                  <p className="text-xs text-neutral-500">file1.txt → file2.txt after saving</p>
                </div>
              </label>

              <label className="flex items-start gap-3 cursor-pointer group">
                <div className="relative flex items-center justify-center mt-0.5">
                  <input 
                    type="checkbox" 
                    className="peer sr-only"
                    checked={keepContent}
                    onChange={(e) => setKeepContent(e.target.checked)}
                  />
                  <div className="w-5 h-5 border-2 border-neutral-700 bg-neutral-950 rounded peer-checked:bg-neutral-200 peer-checked:border-neutral-200 transition-colors"></div>
                  <CheckCircle2 size={14} className="absolute text-neutral-900 opacity-0 peer-checked:opacity-100 transition-opacity" />
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-200 group-hover:text-white transition-colors">Keep content after save</p>
                  <p className="text-xs text-neutral-500">Don't clear the text area</p>
                </div>
              </label>
            </div>
          </div>

        </div>

        {/* Right Column: History */}
        <div className="bg-neutral-900 rounded-xl shadow-sm border border-neutral-800 flex flex-col h-[600px] lg:h-auto lg:max-h-[calc(100vh-8rem)]">
          <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900 rounded-t-xl">
            <h2 className="font-semibold text-neutral-200 flex items-center gap-2">
              <History size={18} className="text-neutral-400" />
              Session History
            </h2>
            <span className="bg-neutral-800 text-neutral-300 text-xs font-bold px-2 py-1 rounded-full border border-neutral-700">
              {history.length}
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-2">
            {history.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-neutral-500 p-6 text-center">
                <FileText size={48} className="mb-3 opacity-20" />
                <p className="text-sm">No files created yet in this session.</p>
                <p className="text-xs mt-1">Saved files will appear here.</p>
              </div>
            ) : (
              <ul className="space-y-1">
                {history.map((item, i) => (
                  <li 
                    key={i} 
                    className="flex items-center justify-between p-3 hover:bg-neutral-800/50 rounded-lg transition-colors border border-transparent hover:border-neutral-700"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      {item.success ? (
                        <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                      ) : (
                        <AlertCircle size={16} className="text-red-500 shrink-0" />
                      )}
                      <span className="text-sm font-medium text-neutral-300 truncate" title={item.name}>
                        {item.name}
                      </span>
                    </div>
                    <span className="text-xs text-neutral-500 shrink-0 ml-3">
                      {item.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}
