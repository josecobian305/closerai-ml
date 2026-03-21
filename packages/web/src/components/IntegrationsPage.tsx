import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CheckCircle2, XCircle, Loader2, ChevronDown, ChevronUp,
  Eye, EyeOff, Trash2, Plug, Upload, ClipboardList,
  AlertTriangle, RefreshCw,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────

/** All supported provider IDs */
type Provider =
  | 'ghl' | 'salesforce' | 'hubspot'
  | 'texttorrent' | 'twilio' | 'aws_sms'
  | 'gmail' | 'outlook' | 'aws_ses'
  | 'aws_bedrock' | 'openai'
  | 'stripe' | 'apipay'
  | 'github'
  | 'vapi' | 'twilio_voice'
  | 'plaid';

type IntegrationStatus = 'connected' | 'disconnected' | 'error';

/** Masked credential field from the API */
interface MaskedCredential {
  key: string;
  masked: string;
}

/** Integration as returned by the API */
interface IntegrationResponse {
  provider: Provider;
  status: IntegrationStatus;
  last_tested: string | null;
  credentials: MaskedCredential[];
  created_at: string | null;
}

/** What we store locally in the form (plain text before saving) */
type CredentialForm = Record<string, string>;

/** Test result from POST /test */
interface TestResult {
  success: boolean;
  message: string;
  timestamp: string;
}

// ── Metadata ───────────────────────────────────────────────────────────────

interface FieldDef {
  key: string;
  label: string;
  placeholder?: string;
  isSecret?: boolean;
  readOnly?: boolean;
  oauthButton?: boolean;
}

interface ProviderMeta {
  name: string;
  emoji: string;
  category: string;
  fields: FieldDef[];
  description: string;
}

/** Full metadata map for all providers */
const PROVIDER_META: Record<Provider, ProviderMeta> = {
  ghl:          { name: 'GoHighLevel', emoji: '🔗', category: 'CRM', description: 'CRM & automation platform', fields: [{ key: 'api_key', label: 'API Key', isSecret: true, placeholder: 'eyJ...' }] },
  salesforce:   { name: 'Salesforce', emoji: '☁️', category: 'CRM', description: 'Enterprise CRM', fields: [{ key: 'client_id', label: 'Client ID', placeholder: '3MVG9...' }, { key: 'client_secret', label: 'Client Secret', isSecret: true }, { key: 'refresh_token', label: 'Refresh Token', isSecret: true }] },
  hubspot:      { name: 'HubSpot', emoji: '🟠', category: 'CRM', description: 'Inbound CRM & marketing', fields: [{ key: 'api_key', label: 'API Key', isSecret: true, placeholder: 'pat-na1-...' }] },
  texttorrent:  { name: 'TextTorrent', emoji: '💬', category: 'SMS', description: 'SMS messaging API', fields: [{ key: 'sid', label: 'SID', placeholder: 'TT-...' }, { key: 'public_key', label: 'Public Key', isSecret: true }] },
  twilio:       { name: 'Twilio SMS', emoji: '📱', category: 'SMS', description: 'Programmable SMS', fields: [{ key: 'account_sid', label: 'Account SID', placeholder: 'AC...' }, { key: 'auth_token', label: 'Auth Token', isSecret: true }] },
  aws_sms:      { name: 'AWS SNS', emoji: '📡', category: 'SMS', description: 'AWS Simple Notification Service', fields: [{ key: 'access_key', label: 'Access Key ID', placeholder: 'AKIA...' }, { key: 'secret_key', label: 'Secret Access Key', isSecret: true }, { key: 'region', label: 'Region', placeholder: 'us-east-1' }] },
  gmail:        { name: 'Gmail', emoji: '📧', category: 'Email', description: 'Google Gmail', fields: [{ key: 'access_token', label: 'OAuth Access Token', isSecret: true, oauthButton: true }] },
  outlook:      { name: 'Outlook', emoji: '📨', category: 'Email', description: 'Microsoft Outlook', fields: [{ key: 'access_token', label: 'OAuth Access Token', isSecret: true, oauthButton: true }] },
  aws_ses:      { name: 'AWS SES', emoji: '✉️', category: 'Email', description: 'Amazon Simple Email Service', fields: [{ key: 'access_key', label: 'Access Key ID', placeholder: 'AKIA...' }, { key: 'secret_key', label: 'Secret Access Key', isSecret: true }, { key: 'region', label: 'Region', placeholder: 'us-east-1' }] },
  aws_bedrock:  { name: 'AWS Bedrock', emoji: '🤖', category: 'AI', description: 'Amazon Bedrock LLMs', fields: [{ key: 'access_key', label: 'Access Key ID', placeholder: 'AKIA...' }, { key: 'secret_key', label: 'Secret Access Key', isSecret: true }, { key: 'region', label: 'Region', placeholder: 'us-east-1' }] },
  openai:       { name: 'OpenAI', emoji: '🧠', category: 'AI', description: 'GPT-4 & Embeddings', fields: [{ key: 'api_key', label: 'API Key', isSecret: true, placeholder: 'sk-proj-...' }] },
  stripe:       { name: 'Stripe', emoji: '💳', category: 'Payments', description: 'Payment processing', fields: [{ key: 'publishable_key', label: 'Publishable Key', placeholder: 'pk_live_...' }, { key: 'secret_key', label: 'Secret Key', isSecret: true, placeholder: 'sk_live_...' }] },
  apipay:       { name: 'apiPay', emoji: '💰', category: 'Payments', description: 'Business payments', fields: [{ key: 'account_id', label: 'Account ID', placeholder: 'Auto-linked from registration', readOnly: false }] },
  github:       { name: 'GitHub', emoji: '🐙', category: 'Dev', description: 'Code repository & CI', fields: [{ key: 'pat_token', label: 'Personal Access Token', isSecret: true, placeholder: 'ghp_...' }, { key: 'username', label: 'Username', placeholder: 'your-handle' }] },
  vapi:         { name: 'Vapi', emoji: '📞', category: 'Phone', description: 'Voice AI platform', fields: [{ key: 'api_key', label: 'API Key', isSecret: true, placeholder: 'vapi_...' }] },
  twilio_voice: { name: 'Twilio Voice', emoji: '☎️', category: 'Phone', description: 'Programmable voice calls', fields: [{ key: 'account_sid', label: 'Account SID', placeholder: 'AC...' }, { key: 'auth_token', label: 'Auth Token', isSecret: true }] },
  plaid:        { name: 'Plaid', emoji: '🏦', category: 'Banking', description: 'Bank data & ACH', fields: [{ key: 'client_id', label: 'Client ID', placeholder: 'plaid_client_...' }, { key: 'secret', label: 'Secret', isSecret: true }, { key: 'environment', label: 'Environment', placeholder: 'sandbox | development | production' }] },
};

const CATEGORY_ORDER = ['CRM', 'SMS', 'Email', 'AI', 'Payments', 'Dev', 'Phone', 'Banking'];

const CATEGORY_ICONS: Record<string, string> = {
  CRM: '🗂️', SMS: '💬', Email: '📧', AI: '🤖',
  Payments: '💳', Dev: '🛠️', Phone: '📞', Banking: '🏦',
};

// ── API helpers ────────────────────────────────────────────────────────────

const BASE = '/app/api/v1/integrations';

/** Fetch all integrations */
async function apiFetchIntegrations(): Promise<IntegrationResponse[]> {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error(`API ${res.status}`);
  const data = await res.json() as { integrations: IntegrationResponse[] };
  return data.integrations;
}

/** Save credentials */
async function apiSave(provider: Provider, credentials: CredentialForm): Promise<void> {
  const res = await fetch(`${BASE}/${provider}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ credentials }),
  });
  if (!res.ok) throw new Error(`Save failed: ${res.status}`);
}

/** Test connection */
async function apiTest(provider: Provider, credentials?: CredentialForm): Promise<TestResult> {
  const res = await fetch(`${BASE}/${provider}/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials ? { credentials } : {}),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Test failed: ${text}`);
  }
  return res.json() as Promise<TestResult>;
}

/** Delete integration */
async function apiDelete(provider: Provider): Promise<void> {
  const res = await fetch(`${BASE}/${provider}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
}

// ── Sub-components ─────────────────────────────────────────────────────────

interface MaskedInputProps {
  fieldKey: string;
  label: string;
  placeholder?: string;
  isSecret?: boolean;
  readOnly?: boolean;
  oauthButton?: boolean;
  storedMasked: string; // value from API (••••last4)
  value: string;        // current form value (plain text, empty = not changed)
  onChange: (val: string) => void;
}

/** Password field with reveal toggle and masked stored value display */
function MaskedInput({
  fieldKey, label, placeholder, isSecret, readOnly, oauthButton,
  storedMasked, value, onChange,
}: MaskedInputProps): React.ReactElement {
  const [revealed, setRevealed] = useState(false);

  const inputType = isSecret && !revealed ? 'password' : 'text';
  const displayPlaceholder = storedMasked ? storedMasked : (placeholder ?? '');

  return (
    <div className="mb-3">
      <label className="block text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">
        {label}
        {storedMasked && (
          <span className="ml-2 text-green-500 font-normal normal-case tracking-normal">
            ✓ saved
          </span>
        )}
      </label>
      {oauthButton ? (
        <div className="flex gap-2">
          <input
            type={inputType}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={displayPlaceholder || 'Paste OAuth access token…'}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="button"
            onClick={() => alert('OAuth flow coming soon — paste your access token above for now.')}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-xs text-white font-semibold whitespace-nowrap"
          >
            Connect OAuth
          </button>
        </div>
      ) : (
        <div className="relative">
          <input
            type={inputType}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={displayPlaceholder || placeholder}
            readOnly={readOnly}
            className={`w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 pr-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500 ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
          />
          {isSecret && (
            <button
              type="button"
              onClick={() => setRevealed((r) => !r)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              tabIndex={-1}
            >
              {revealed ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Integration card ───────────────────────────────────────────────────────

interface CardState {
  form: CredentialForm;
  saving: boolean;
  testing: boolean;
  testResult: TestResult | null;
  error: string | null;
  expanded: boolean;
}

interface IntegrationCardProps {
  meta: ProviderMeta;
  integration: IntegrationResponse;
  onRefresh: () => void;
}

/** Single integration card with expand/collapse, credential inputs, and actions */
function IntegrationCard({ meta, integration, onRefresh }: IntegrationCardProps): React.ReactElement {
  const [state, setState] = useState<CardState>({
    form: {},
    saving: false,
    testing: false,
    testResult: null,
    error: null,
    expanded: false,
  });

  const setField = (key: string, val: string) =>
    setState((s) => ({ ...s, form: { ...s.form, [key]: val } }));

  const handleSave = async () => {
    setState((s) => ({ ...s, saving: true, error: null }));
    try {
      // Only send fields that have values (don't overwrite stored fields with empty)
      const creds: CredentialForm = {};
      for (const f of meta.fields) {
        if (state.form[f.key]) creds[f.key] = state.form[f.key];
      }
      if (Object.keys(creds).length === 0) {
        setState((s) => ({ ...s, saving: false, error: 'Enter at least one credential field.' }));
        return;
      }
      await apiSave(integration.provider, creds);
      setState((s) => ({ ...s, saving: false, error: null, form: {} }));
      onRefresh();
    } catch (err) {
      setState((s) => ({ ...s, saving: false, error: String(err) }));
    }
  };

  const handleTest = async () => {
    setState((s) => ({ ...s, testing: true, error: null, testResult: null }));
    try {
      // If user has values in form, test with those; otherwise test stored
      const formCreds: CredentialForm = {};
      for (const f of meta.fields) {
        if (state.form[f.key]) formCreds[f.key] = state.form[f.key];
      }
      const result = await apiTest(
        integration.provider,
        Object.keys(formCreds).length > 0 ? formCreds : undefined,
      );
      setState((s) => ({ ...s, testing: false, testResult: result }));
      onRefresh();
    } catch (err) {
      setState((s) => ({ ...s, testing: false, error: String(err) }));
    }
  };

  const handleDisconnect = async () => {
    if (!confirm(`Disconnect ${meta.name}? This will delete stored credentials.`)) return;
    try {
      await apiDelete(integration.provider);
      onRefresh();
    } catch (err) {
      setState((s) => ({ ...s, error: String(err) }));
    }
  };

  const isConnected = integration.status === 'connected';
  const isError = integration.status === 'error';
  const hasStoredCreds = integration.credentials.some((c) => c.masked);

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 ${
        isConnected
          ? 'bg-gray-900 border-green-800/50'
          : isError
          ? 'bg-gray-900 border-red-800/40'
          : 'bg-gray-900 border-gray-800'
      }`}
    >
      {/* Card header */}
      <button
        className="w-full flex items-center gap-3 p-4 text-left"
        onClick={() => setState((s) => ({ ...s, expanded: !s.expanded }))}
      >
        <span className="text-2xl w-9 text-center flex-shrink-0">{meta.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white">{meta.name}</span>
            {isConnected && (
              <span className="flex items-center gap-1 text-xs text-green-400">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" /> Connected
              </span>
            )}
            {isError && (
              <span className="flex items-center gap-1 text-xs text-red-400">
                <AlertTriangle size={10} /> Error
              </span>
            )}
            {!isConnected && !isError && (
              <span className="flex items-center gap-1 text-xs text-gray-600">
                <span className="w-1.5 h-1.5 rounded-full bg-gray-600 inline-block" /> Not connected
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{meta.description}</p>
          {integration.last_tested && (
            <p className="text-xs text-gray-600 mt-0.5">
              Tested {new Date(integration.last_tested).toLocaleString()}
            </p>
          )}
        </div>
        {state.expanded ? <ChevronUp size={16} className="text-gray-600 flex-shrink-0" /> : <ChevronDown size={16} className="text-gray-600 flex-shrink-0" />}
      </button>

      {/* Expanded body */}
      {state.expanded && (
        <div className="px-4 pb-4 border-t border-gray-800/60">
          <div className="pt-4">
            {meta.fields.map((f) => {
              const stored = integration.credentials.find((c) => c.key === f.key);
              return (
                <MaskedInput
                  key={f.key}
                  fieldKey={f.key}
                  label={f.label}
                  placeholder={f.placeholder}
                  isSecret={f.isSecret}
                  readOnly={f.readOnly}
                  oauthButton={f.oauthButton}
                  storedMasked={stored?.masked ?? ''}
                  value={state.form[f.key] ?? ''}
                  onChange={(v) => setField(f.key, v)}
                />
              );
            })}

            {/* Test result */}
            {state.testResult && (
              <div
                className={`flex items-start gap-2 p-3 rounded-xl text-xs mb-3 ${
                  state.testResult.success
                    ? 'bg-green-900/30 border border-green-800/50 text-green-300'
                    : 'bg-red-900/30 border border-red-800/50 text-red-300'
                }`}
              >
                {state.testResult.success
                  ? <CheckCircle2 size={14} className="flex-shrink-0 mt-0.5" />
                  : <XCircle size={14} className="flex-shrink-0 mt-0.5" />}
                <span>{state.testResult.message}</span>
              </div>
            )}

            {/* Error */}
            {state.error && (
              <div className="flex items-start gap-2 p-3 rounded-xl text-xs mb-3 bg-red-900/30 border border-red-800/50 text-red-300">
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                <span>{state.error}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={state.saving}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg text-xs font-semibold text-white transition-colors"
              >
                {state.saving ? <Loader2 size={13} className="animate-spin" /> : <Plug size={13} />}
                Save
              </button>

              {hasStoredCreds && (
                <button
                  onClick={handleTest}
                  disabled={state.testing}
                  className="flex items-center gap-1.5 px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 rounded-lg text-xs font-semibold text-gray-200 transition-colors"
                >
                  {state.testing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                  Test Connection
                </button>
              )}

              {isConnected && (
                <button
                  onClick={handleDisconnect}
                  className="flex items-center gap-1.5 px-3 py-2 bg-red-900/40 hover:bg-red-900/70 rounded-lg text-xs font-semibold text-red-400 border border-red-800/40 transition-colors"
                >
                  <Trash2 size={13} />
                  Disconnect
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── CSV / Data Upload section ──────────────────────────────────────────────

interface UploadedData {
  rows: string[][];
  headers: string[];
  fileName: string;
  rowCount: number;
}

/** CSV drag-and-drop upload + manual paste section */
function DataUploadSection(): React.ReactElement {
  const [dragging, setDragging] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [uploadedData, setUploadedData] = useState<UploadedData | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string, fileName = 'pasted data'): UploadedData => {
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length === 0) return { rows: [], headers: [], fileName, rowCount: 0 };

    // Detect delimiter: tab vs comma
    const firstLine = lines[0];
    const delim = firstLine.includes('\t') ? '\t' : ',';

    const parseRow = (line: string): string[] => {
      const result: string[] = [];
      let inQuote = false;
      let cell = '';
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuote && line[i + 1] === '"') { cell += '"'; i++; }
          else inQuote = !inQuote;
        } else if (ch === delim && !inQuote) {
          result.push(cell.trim());
          cell = '';
        } else {
          cell += ch;
        }
      }
      result.push(cell.trim());
      return result;
    };

    const headers = parseRow(lines[0]);
    const rows = lines.slice(1).map(parseRow);
    return { rows, headers, fileName, rowCount: rows.length };
  };

  const handleFile = (file: File) => {
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const data = parseCSV(text, file.name);
      setUploadedData(data);
      setUploading(false);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.tsv') || file.type === 'text/plain')) {
      handleFile(file);
    }
  };

  const handlePaste = () => {
    if (!pasteText.trim()) return;
    const data = parseCSV(pasteText);
    setUploadedData(data);
  };

  return (
    <div className="mt-10">
      <h2 className="text-lg font-bold text-white mb-1">Data Import</h2>
      <p className="text-sm text-gray-500 mb-5">Upload a CSV file or paste tab-delimited data to import contacts, deals, or other records.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 cursor-pointer transition-all duration-200 ${
            dragging
              ? 'border-indigo-500 bg-indigo-900/20'
              : 'border-gray-700 bg-gray-900 hover:border-gray-600 hover:bg-gray-800/60'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.tsv,.txt"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          {uploading ? (
            <Loader2 size={28} className="text-indigo-400 animate-spin" />
          ) : (
            <Upload size={28} className={dragging ? 'text-indigo-400' : 'text-gray-600'} />
          )}
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-300">
              {dragging ? 'Drop to upload' : 'Drag & drop CSV / TSV'}
            </p>
            <p className="text-xs text-gray-600 mt-1">or click to browse</p>
          </div>
        </div>

        {/* Manual paste */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <ClipboardList size={16} className="text-gray-500" />
            <span className="text-sm font-semibold text-gray-300">Paste tab-delimited data</span>
          </div>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={`First Name\tLast Name\tPhone\tEmail\nJohn\tDoe\t+13051234567\tjohn@example.com`}
            rows={6}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-700 font-mono focus:outline-none focus:border-indigo-500 resize-none"
          />
          <button
            onClick={handlePaste}
            disabled={!pasteText.trim()}
            className="self-start px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-lg text-xs font-semibold text-white transition-colors"
          >
            Parse Data
          </button>
        </div>
      </div>

      {/* Preview table */}
      {uploadedData && uploadedData.headers.length > 0 && (
        <div className="mt-5 rounded-2xl border border-gray-800 bg-gray-900 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
            <div>
              <span className="text-sm font-semibold text-white">{uploadedData.fileName}</span>
              <span className="ml-2 text-xs text-gray-500">{uploadedData.rowCount} rows · {uploadedData.headers.length} columns</span>
            </div>
            <button
              className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold"
              onClick={() => alert('Import to contacts coming soon!')}
            >
              Import to Contacts →
            </button>
          </div>
          <div className="overflow-x-auto max-h-64">
            <table className="w-full text-xs">
              <thead className="bg-gray-800/60 sticky top-0">
                <tr>
                  {uploadedData.headers.map((h, i) => (
                    <th key={i} className="px-3 py-2 text-left text-gray-400 font-semibold whitespace-nowrap">{h || `Column ${i + 1}`}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {uploadedData.rows.slice(0, 20).map((row, ri) => (
                  <tr key={ri} className="border-t border-gray-800/40 hover:bg-gray-800/30">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-3 py-2 text-gray-300 whitespace-nowrap max-w-[180px] truncate">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {uploadedData.rowCount > 20 && (
              <p className="px-4 py-2 text-xs text-gray-600 border-t border-gray-800">
                Showing 20 of {uploadedData.rowCount} rows
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

/**
 * IntegrationsPage — Settings/Integrations page component.
 * Displays a categorized grid of integration cards with credential management,
 * connection testing, and a data import section.
 */
export function IntegrationsPage(): React.ReactElement {
  const [integrations, setIntegrations] = useState<IntegrationResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetchIntegrations();
      setIntegrations(data);
      setError(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Group by category
  const integrationMap = new Map(integrations.map((i) => [i.provider, i]));

  const grouped = CATEGORY_ORDER.map((cat) => {
    const providers = (Object.entries(PROVIDER_META) as [Provider, ProviderMeta][])
      .filter(([, m]) => m.category === cat)
      .map(([p, m]) => ({ provider: p, meta: m }));
    return { category: cat, providers };
  }).filter((g) => g.providers.length > 0);

  const connectedCount = integrations.filter((i) => i.status === 'connected').length;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="h-8 bg-gray-800 rounded-xl w-48 mb-6 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-900 rounded-2xl border border-gray-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Integrations</h1>
          <p className="text-sm text-gray-500 mt-1">
            {connectedCount} of {integrations.length} integrations connected
          </p>
        </div>
        <button
          onClick={() => { setLoading(true); load(); }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-5 p-4 rounded-xl bg-red-900/30 border border-red-800/50 text-red-300 text-sm flex items-center gap-2">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* Integration categories */}
      <div className="space-y-8">
        {grouped.map(({ category, providers }) => (
          <section key={category}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{CATEGORY_ICONS[category]}</span>
              <h2 className="text-base font-bold text-white">{category}</h2>
              <span className="text-xs text-gray-600 font-medium">
                {providers.filter(({ provider }) => integrationMap.get(provider)?.status === 'connected').length}/{providers.length} connected
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {providers.map(({ provider, meta }) => {
                const integration = integrationMap.get(provider) ?? {
                  provider,
                  status: 'disconnected' as IntegrationStatus,
                  last_tested: null,
                  credentials: meta.fields.map((f) => ({ key: f.key, masked: '' })),
                  created_at: null,
                };
                return (
                  <IntegrationCard
                    key={provider}
                    meta={meta}
                    integration={integration}
                    onRefresh={load}
                  />
                );
              })}
            </div>
          </section>
        ))}
      </div>

      {/* Data import section */}
      <DataUploadSection />
    </div>
  );
}
