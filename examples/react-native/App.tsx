// Minimal App.tsx for native FFI simulator smoke verification across d2 / mermaid / plantuml.
// Original demo App is stashed at App.full.tsx.bak — restore once
// @supramark/rn-diagram-worker (or equivalent) is back in the workspace.

import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  Text,
  View,
  StyleSheet,
  NativeModules,
} from 'react-native';

interface NativeEngine {
  render: (source: string) => Promise<string>;
  getVersion: () => Promise<string>;
}

type Status = 'pending' | 'ok' | 'error';
interface EngineResult {
  name: string;
  module: NativeEngine | undefined;
  source: string;
  status: Status;
  detail: string;
}

const ENGINES_SPEC: Array<{ name: string; key: string; source: string }> = [
  { name: 'd2', key: 'SupramarkD2Native', source: 'a -> b -> c' },
  {
    name: 'mermaid',
    key: 'SupramarkMermaidNative',
    source: 'graph TD; A-->B; A-->C; B-->D; C-->D;',
  },
  {
    name: 'plantuml',
    key: 'SupramarkPlantumlNative',
    source: '@startuml\nAlice -> Bob: hi\nBob --> Alice: hello\n@enduml',
  },
];

export default function App() {
  const [results, setResults] = useState<EngineResult[]>(
    ENGINES_SPEC.map((s) => ({
      name: s.name,
      module: NativeModules[s.key] as NativeEngine | undefined,
      source: s.source,
      status: 'pending',
      detail: 'booting...',
    })),
  );

  useEffect(() => {
    (async () => {
      for (let i = 0; i < ENGINES_SPEC.length; i++) {
        const spec = ENGINES_SPEC[i];
        const mod = NativeModules[spec.key] as NativeEngine | undefined;
        let next: EngineResult;
        try {
          if (!mod) {
            throw new Error(`NativeModules.${spec.key} is undefined — not linked`);
          }
          const version = await mod.getVersion();
          const svg = await mod.render(spec.source);
          const line = `[${spec.name.toUpperCase()}_SMOKE_OK] v=${version} len=${svg.length}`;
          console.log(line);
          next = {
            name: spec.name,
            module: mod,
            source: spec.source,
            status: 'ok',
            detail: `v=${version}  svg.length=${svg.length}\n${svg.slice(0, 400)}`,
          };
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.log(`[${spec.name.toUpperCase()}_SMOKE_ERROR] ${msg.slice(0, 300)}`);
          next = {
            name: spec.name,
            module: mod,
            source: spec.source,
            status: 'error',
            detail: msg.slice(0, 600),
          };
        }
        setResults((prev) => {
          const arr = [...prev];
          arr[i] = next;
          return arr;
        });
      }
    })();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>supramark · native FFI smoke</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        {results.map((r) => (
          <View key={r.name} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{r.name}</Text>
              <Text style={[styles.badge, badgeStyle(r.status)]}>
                {r.status.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.mono} selectable>
              {r.detail}
            </Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function badgeStyle(s: Status) {
  switch (s) {
    case 'ok':
      return { backgroundColor: '#1f883d', color: '#ffffff' };
    case 'error':
      return { backgroundColor: '#cf222e', color: '#ffffff' };
    default:
      return { backgroundColor: '#9aa0a6', color: '#ffffff' };
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1117' },
  header: {
    padding: 16,
    borderBottomColor: '#21262d',
    borderBottomWidth: 1,
  },
  title: { color: '#f0f6fc', fontSize: 18, fontWeight: '600' },
  body: { padding: 16 },
  card: {
    marginBottom: 16,
    borderColor: '#21262d',
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
    backgroundColor: '#161b22',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  cardTitle: { color: '#f0f6fc', fontSize: 16, fontWeight: '600' },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
    overflow: 'hidden',
  },
  mono: { color: '#c9d1d9', fontFamily: 'Menlo', fontSize: 10, lineHeight: 14 },
});
