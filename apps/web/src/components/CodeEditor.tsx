import Editor, { type BeforeMount, type OnMount } from '@monaco-editor/react';
import { useThemeStore } from '@/stores/theme';
import { Loading } from '@/components/ui';

export interface LanguageOption {
  id: string;
  label: string;
  monacoLang: string;
  /** Whether the judge currently supports this language. */
  enabled: boolean;
  defaultCode: string;
}

/**
 * Editor languages. Only languages active in the judge are enabled; Java and
 * JavaScript are listed so users know they're on the roadmap, but cannot be
 * submitted until the judge supports them.
 */
export const LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    id: 'cpp17',
    label: 'C++17',
    monacoLang: 'cpp',
    enabled: true,
    defaultCode:
      '#include <bits/stdc++.h>\nusing namespace std;\n\nint main() {\n    ios_base::sync_with_stdio(false);\n    cin.tie(nullptr);\n\n    // Write your solution here\n\n    return 0;\n}\n',
  },
  {
    id: 'python3',
    label: 'Python 3',
    monacoLang: 'python',
    enabled: true,
    defaultCode: 'import sys\ninput = sys.stdin.readline\n\ndef solve():\n    # Write your solution here\n    pass\n\nsolve()\n',
  },
  {
    id: 'java17',
    label: 'Java 17',
    monacoLang: 'java',
    enabled: false,
    defaultCode:
      'import java.util.*;\nimport java.io.*;\n\npublic class Main {\n    public static void main(String[] args) throws IOException {\n        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));\n        // Write your solution here\n    }\n}\n',
  },
  {
    id: 'javascript',
    label: 'JavaScript (Node)',
    monacoLang: 'javascript',
    enabled: false,
    defaultCode:
      "const lines = require('fs').readFileSync(0, 'utf8').split('\\n');\n\n// Write your solution here\n",
  },
];

export const DEFAULT_LANGUAGE = LANGUAGE_OPTIONS[0]!;

const defineThemes: BeforeMount = (monaco) => {
  monaco.editor.defineTheme('arena-classic', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '808080', fontStyle: 'italic' },
      { token: 'keyword', foreground: '000080', fontStyle: 'bold' },
      { token: 'string', foreground: '008000' },
      { token: 'number', foreground: 'a000a0' },
      { token: 'type', foreground: '006d73' },
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.lineHighlightBackground': '#eef6f6',
      'editorLineNumber.foreground': '#9a9a9a',
      'editorLineNumber.activeForeground': '#000080',
      'editorGutter.background': '#f4f4f0',
      'editor.selectionBackground': '#000080',
      'editor.selectionForeground': '#ffffff',
      'editor.inactiveSelectionBackground': '#c8d0ff',
      'editorCursor.foreground': '#000000',
    },
  });
  monaco.editor.defineTheme('arena-midnight', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6b7280', fontStyle: 'italic' },
      { token: 'keyword', foreground: '7cc4ff', fontStyle: 'bold' },
      { token: 'string', foreground: '3ddc84' },
      { token: 'number', foreground: 'd38cff' },
      { token: 'type', foreground: '27ced7' },
    ],
    colors: {
      'editor.background': '#14171e',
      'editor.lineHighlightBackground': '#1b2030',
      'editorLineNumber.foreground': '#4b5163',
      'editorLineNumber.activeForeground': '#27ced7',
      'editorGutter.background': '#191d26',
      'editor.selectionBackground': '#2f6fd680',
      'editorCursor.foreground': '#27ced7',
    },
  });
};

/** Monaco editor themed to match the OS chrome. */
export function CodeEditor({
  value,
  onChange,
  language,
  onMount,
  height = '100%',
  fontSize = 14,
}: {
  value: string;
  onChange: (v: string) => void;
  language: string;
  onMount?: OnMount;
  height?: string | number;
  fontSize?: number;
}) {
  const { theme } = useThemeStore();
  return (
    <Editor
      height={height}
      language={language}
      theme={theme === 'dark' ? 'arena-midnight' : 'arena-classic'}
      value={value}
      onChange={(v) => onChange(v ?? '')}
      beforeMount={defineThemes}
      onMount={onMount}
      loading={<Loading label="Starting editor…" />}
      options={{
        fontSize,
        fontFamily: "'Inconsolata', 'Cascadia Code', Consolas, monospace",
        fontLigatures: false,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        padding: { top: 12, bottom: 12 },
        lineNumbersMinChars: 3,
        renderLineHighlight: 'all',
        tabSize: 4,
        automaticLayout: true,
        smoothScrolling: true,
        cursorBlinking: 'phase',
        roundedSelection: false,
        scrollbar: { verticalScrollbarSize: 12, horizontalScrollbarSize: 12 },
      }}
    />
  );
}
