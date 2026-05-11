// Minimal App.tsx for native d2 simulator smoke verification.
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

interface NativeD2 {
  render: (source: string) => Promise<string>;
  getVersion: () => Promise<string>;
}
const D2: NativeD2 | undefined = NativeModules.SupramarkD2Native;

type Status = 'pending' | 'ok' | 'error';

export default function App() {
  const [status, setStatus] = useState<Status>('pending');
  const [detail, setDetail] = useState<string>('booting...');

  useEffect(() => {
    (async () => {
      try {
        if (!D2) {
          throw new Error(
            'NativeModules.SupramarkD2Native is undefined — module not linked',
          );
        }
        const version = await D2.getVersion();
        const svg = await D2.render('a -> b -> c');
        const line = `[D2_SMOKE_OK] v=${version} len=${svg.length} head=${svg.slice(0, 120)}`;
        console.log(line);
        setStatus('ok');
        setDetail(
          `version=${version}\nsvg.length=${svg.length}\n\n${svg.slice(0, 800)}`,
        );
      } catch (err) {
        const msg =
          err instanceof Error
            ? `${err.message}\n${err.stack ?? ''}`
            : String(err);
        console.log(`[D2_SMOKE_ERROR] ${msg.slice(0, 500)}`);
        setStatus('error');
        setDetail(msg.slice(0, 800));
      }
    })();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>supramark · d2 native smoke</Text>
        <Text style={[styles.badge, badgeStyle(status)]}>{status.toUpperCase()}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.mono} selectable>
          {detail}
        </Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomColor: '#21262d',
    borderBottomWidth: 1,
  },
  title: { color: '#f0f6fc', fontSize: 18, fontWeight: '600' },
  badge: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    overflow: 'hidden',
  },
  body: { padding: 16 },
  mono: { color: '#c9d1d9', fontFamily: 'Menlo', fontSize: 11, lineHeight: 16 },
});
