import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { ActivityIndicator, View, StyleSheet, Text } from 'react-native';
import { Shield } from 'lucide-react-native';

export default function IndexScreen() {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (session) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [session, loading, router]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Shield size={64} color="#1E40AF" />
        <ActivityIndicator size="large" color="#1E40AF" style={{ marginTop: 20 }} />
        <Text style={styles.loadingText}>Saha Satış Uygulaması</Text>
      </View>
    );
  }
  return (
    <View style={styles.container}>
      <Shield size={64} color="#1E40AF" />
      <ActivityIndicator size="large" color="#1E40AF" />
      <Text style={styles.loadingText}>Yönlendiriliyor...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E40AF',
    marginTop: 12,
  },
});