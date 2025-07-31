import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { getWASMInstance, type Suggestion } from '../../lib/wordserve-wasm';
import './App.css';

interface Settings {
  enabled: boolean;
  domainsCount: number;
}

interface WASMState {
  isLoading: boolean;
  isReady: boolean;
  error: string | null;
  testResults: Suggestion[];
}

function App() {
  const [settings, setSettings] = useState<Settings>({ enabled: true, domainsCount: 0 });
  const [wasmState, setWasmState] = useState<WASMState>({
    isLoading: false,
    isReady: false,
    error: null,
    testResults: []
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const testWASM = async () => {
    setWasmState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      console.log('🧪 Testing WASM module...');
      const wasm = getWASMInstance();
      await wasm.waitForReady();
      console.log('✅ WASM module loaded successfully');
      
      // Test completion
      const results = await wasm.complete('hello', 5);
      console.log('📝 Completion results:', results);
      
      setWasmState({
        isLoading: false,
        isReady: true,
        error: null,
        testResults: results
      });
    } catch (error) {
      console.error('❌ WASM test failed:', error);
      setWasmState({
        isLoading: false,
        isReady: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        testResults: []
      });
    }
  };

  const loadSettings = async () => {
    try {
      const stored = await browser.storage.sync.get('wordserve-settings');
      const wsSettings = stored['wordserve-settings'];
      if (wsSettings) {
        const domainsCount = wsSettings.domains?.blacklistMode 
          ? wsSettings.domains.blacklist?.length || 0
          : wsSettings.domains?.whitelist?.length || 0;
        setSettings({
          enabled: true,
          domainsCount
        });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const openSettings = () => {
    browser.runtime.openOptionsPage();
  };

  return (
    <div className="w-80 p-4 bg-background text-foreground">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-serif font-bold">WordServe</h1>
        <div className={`w-2 h-2 rounded-full ${settings.enabled ? 'bg-green-500' : 'bg-red-500'}`} />
      </div>
      
      <div className="space-y-3 text-sm text-muted-foreground">
        <div className="flex justify-between">
          <span>Status:</span>
          <span className={settings.enabled ? 'text-green-600' : 'text-red-600'}>
            {settings.enabled ? 'Active' : 'Inactive'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Configured domains:</span>
          <span>{settings.domainsCount}</span>
        </div>
      </div>

      <div className="mt-6 space-y-2">
        <Button 
          onClick={testWASM} 
          disabled={wasmState.isLoading}
          variant={wasmState.isReady ? "default" : "secondary"}
          className="w-full"
        >
          {wasmState.isLoading ? '🔄 Testing WASM...' : 
           wasmState.isReady ? '✅ WASM Ready' : '🧪 Test WASM'}
        </Button>
        
        {wasmState.error && (
          <div className="text-xs text-red-500 p-2 bg-red-50 rounded">
            Error: {wasmState.error}
          </div>
        )}
        
        {wasmState.testResults.length > 0 && (
          <div className="text-xs text-green-600 p-2 bg-green-50 rounded">
            <div className="font-medium mb-1">Completions for "hello":</div>
            {wasmState.testResults.slice(0, 3).map((result, i) => (
              <div key={i}>{result.word} (rank: {result.rank})</div>
            ))}
          </div>
        )}
        
        <Button onClick={openSettings} className="w-full">
          Open settings
        </Button>
        
        <p className="text-xs text-muted-foreground text-center">
          Use Tab/Enter to accept suggestions, 1-9 for quick selection
        </p>
      </div>
    </div>
  );
}

export default App;
