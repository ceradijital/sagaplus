import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { MapPin, Plus, Clock, Check, X, Repeat, Building } from 'lucide-react-native';
import * as Location from 'expo-location';

interface Visit {
  id: string;
  ziyaret_baslangic: string;
  ziyaret_bitis: string | null;
  ziyaret_sonucu: string | null;
  musteri_tanimlayici: string | null;
  staff: {
    profiles: {
      full_name: string | null;
    }
  }
}

export default function VisitsScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeVisit, setActiveVisit] = useState<Visit | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);

  const fetchStaffAndVisits = async () => {
    if (!session?.user.id) return;

    // Önce staff_id'yi alalım
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('id')
      .eq('profile_id', session.user.id)
      .single();

    if (staffError || !staffData) {
      console.error("Staff ID alınamadı:", staffError);
      setLoading(false);
      return;
    }
    setStaffId(staffData.id);

    // Aktif ziyaret kontrolü
    const { data: activeData } = await supabase
      .from('visits')
      .select('*')
      .eq('staff_id', staffData.id)
      .is('ziyaret_bitis', null)
      .single();
    
    setActiveVisit(activeData || null);

    // Geçmiş ziyaretleri çek
    const { data, error } = await supabase
      .from('visits')
      .select('*, staff:staff_id(profiles(full_name))')
      .eq('staff_id', staffData.id)
      .not('ziyaret_bitis', 'is', null)
      .order('ziyaret_baslangic', { ascending: false })
      .limit(20);

    if (error) {
      Alert.alert('Hata', 'Ziyaretler getirilirken bir sorun oluştu.');
      console.error(error);
    } else {
      setVisits(data as any[] || []);
    }
    setLoading(false);
  };

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchStaffAndVisits();
    }, [session])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStaffAndVisits().finally(() => setRefreshing(false));
  }, [session]);

  const handleStartVisit = async () => {
    if (activeVisit) {
      Alert.alert('Uyarı', 'Mevcut bir ziyaretiniz devam ederken yeni bir ziyaret başlatamazsınız.', [
        { text: 'Tamam' },
        { text: 'Devam Eden Ziyarete Git', onPress: () => router.push({ pathname: '/visit-details', params: { visitId: activeVisit.id } }) }
      ]);
      return;
    }

    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Ziyaret başlatmak için konum izni vermeniz gerekmektedir.');
      return;
    }

    try {
      setLoading(true);
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = location.coords;
      
      const { data, error } = await supabase
        .from('visits')
        .insert({
          staff_id: staffId,
          konum: `POINT(${longitude} ${latitude})`,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      Alert.alert('Başarılı', 'Yeni ziyaret başlatıldı!');
      router.push({ pathname: '/visit-details', params: { visitId: data.id } });
    
    } catch (error: any) {
      Alert.alert('Hata', 'Ziyaret başlatılamadı: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const getResultIcon = (result: string | null) => {
    const props = { size: 18 };
    switch(result) {
      case 'Satış Yapıldı': return <Check {...props} color="#10B981" />;
      case 'İlgilenmedi': return <X {...props} color="#EF4444" />;
      case 'Tekrar Gidilecek': return <Repeat {...props} color="#F59E0B" />;
      default: return <Building {...props} color="#64748B" />;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text style={styles.loadingText}>Ziyaretler Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Saha Ziyaretleri</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleStartVisit}>
          <Plus size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {activeVisit && (
          <TouchableOpacity 
            style={styles.activeVisitCard} 
            onPress={() => router.push({ pathname: '/visit-details', params: { visitId: activeVisit.id } })}>
            <View style={styles.activeVisitHeader}>
              <Clock size={20} color="#F59E0B" />
              <Text style={styles.activeVisitTitle}>Devam Eden Ziyaret</Text>
            </View>
            <Text style={styles.activeVisitText}>Ziyareti tamamlamak için dokunun.</Text>
             <Text style={styles.activeVisitTime}>Başlangıç: {new Date(activeVisit.ziyaret_baslangic).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.sectionTitle}>Son Ziyaretler</Text>

        {visits.length === 0 && !activeVisit ? (
          <View style={styles.emptyState}>
            <MapPin size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Henüz ziyaret kaydınız yok</Text>
            <Text style={styles.emptyDescription}>Yeni bir ziyaret başlatmak için '+' butonuna dokunun.</Text>
          </View>
        ) : (
          visits.map(visit => (
            <View key={visit.id} style={styles.visitCard}>
              <View style={styles.visitCardHeader}>
                <Text style={styles.visitDate}>
                  {new Date(visit.ziyaret_baslangic).toLocaleDateString('tr-TR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </Text>
                <View style={styles.resultBadge}>
                  {getResultIcon(visit.ziyaret_sonucu)}
                  <Text style={styles.resultText}>{visit.ziyaret_sonucu || 'Bilinmiyor'}</Text>
                </View>
              </View>
              <Text style={styles.customerText}>{visit.musteri_tanimlayici || 'Müşteri Belirtilmemiş'}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 10, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  title: { fontSize: 24, fontWeight: '700', color: '#1F2937' },
  addButton: { backgroundColor: '#1E40AF', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  content: { padding: 20 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  loadingText: { fontSize: 16, color: '#64748B' },
  activeVisitCard: { backgroundColor: '#FFFBEB', padding: 16, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#FBBF24' },
  activeVisitHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activeVisitTitle: { fontSize: 16, fontWeight: 'bold', color: '#B45309' },
  activeVisitText: { fontSize: 14, color: '#D97706', marginTop: 4 },
  activeVisitTime: { fontSize: 12, color: '#B45309', marginTop: 8, textAlign: 'right' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#374151', marginBottom: 12 },
  visitCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  visitCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  visitDate: { fontSize: 14, fontWeight: '500', color: '#64748B' },
  resultBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F3F4F6', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  resultText: { fontSize: 12, fontWeight: '600', color: '#4B5563' },
  customerText: { fontSize: 16, fontWeight: 'bold', color: '#1F2937' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#374151', marginTop: 16, marginBottom: 8 },
  emptyDescription: { fontSize: 14, color: '#64748B', textAlign: 'center' },
});