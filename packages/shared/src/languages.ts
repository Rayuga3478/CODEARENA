/**
 * Centralized language configuration.
 * Every language supported by the judge is defined here exactly once.
 * Frontend, backend, and judge-worker all import from this file.
 */

export interface LanguageConfig {
  /** Unique slug identifier */
  id: string;
  /** Human-readable display name */
  displayName: string;
  /** File extension (without dot) */
  fileExtension: string;
  /** Monaco Editor language identifier */
  monacoLanguage: string;
  /** Docker image used for sandboxing */
  dockerImage: string;
  /** Whether the language requires compilation before execution */
  compiled: boolean;
  /**
   * Compile command template. Use {source} for source file and {output} for binary.
   * Undefined for interpreted languages.
   */
  compileCommand?: string;
  /**
   * Run command template. Use {output} for compiled binary, {source} for interpreted source.
   */
  runCommand: string;
  /** Time limit multiplier relative to base (e.g., 2.0 for Python) */
  timeMultiplier: number;
  /** Memory limit multiplier relative to base */
  memoryMultiplier: number;
  /** Whether this language is currently active and available for submissions */
  isActive: boolean;
  /** Default boilerplate code shown in the editor */
  boilerplate: string;
}

export const LANGUAGES: Record<string, LanguageConfig> = {
  cpp17: {
    id: 'cpp17',
    displayName: 'C++17',
    fileExtension: 'cpp',
    monacoLanguage: 'cpp',
    dockerImage: 'cp-judge-cpp:latest',
    compiled: true,
    compileCommand: 'g++ -std=c++17 -O2 -Wall -o {output} {source}',
    runCommand: './{output}',
    timeMultiplier: 1.0,
    memoryMultiplier: 1.0,
    isActive: true,
    boilerplate: `#include <bits/stdc++.h>
using namespace std;

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);
    
    // Your solution here
    
    return 0;
}
`,
  },
  python3: {
    id: 'python3',
    displayName: 'Python 3',
    fileExtension: 'py',
    monacoLanguage: 'python',
    dockerImage: 'cp-judge-python:latest',
    compiled: false,
    runCommand: 'python3 {source}',
    timeMultiplier: 3.0,
    memoryMultiplier: 2.0,
    isActive: true, // Activated: C++17 judge verified end-to-end
    boilerplate: `import sys
input = sys.stdin.readline

def solve():
    # Your solution here
    pass

solve()
`,
  },
  java17: {
    id: 'java17',
    displayName: 'Java 17',
    fileExtension: 'java',
    monacoLanguage: 'java',
    dockerImage: 'cp-judge-java:latest',
    compiled: true,
    compileCommand: 'javac {source}',
    runCommand: 'java -Xmx{memoryMb}m Main',
    timeMultiplier: 2.0,
    memoryMultiplier: 2.0,
    isActive: false,
    boilerplate: `import java.util.*;
import java.io.*;

public class Main {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        
        // Your solution here
        
        br.close();
    }
}
`,
  },
  nodejs: {
    id: 'nodejs',
    displayName: 'JavaScript (Node.js)',
    fileExtension: 'js',
    monacoLanguage: 'javascript',
    dockerImage: 'cp-judge-node:latest',
    compiled: false,
    runCommand: 'node {source}',
    timeMultiplier: 3.0,
    memoryMultiplier: 2.0,
    isActive: false,
    boilerplate: `'use strict';

const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });
const lines = [];

rl.on('line', (line) => lines.push(line));
rl.on('close', () => {
    // Your solution here
    
});
`,
  },
} as const;

/**
 * Returns only languages that are currently active for submissions.
 */
export function getActiveLanguages(): LanguageConfig[] {
  return Object.values(LANGUAGES).filter((lang) => lang.isActive);
}

/**
 * Returns a language config by its ID, or undefined if not found.
 */
export function getLanguageById(id: string): LanguageConfig | undefined {
  return LANGUAGES[id];
}

/**
 * Returns all language IDs (both active and inactive).
 */
export function getAllLanguageIds(): string[] {
  return Object.keys(LANGUAGES);
}
