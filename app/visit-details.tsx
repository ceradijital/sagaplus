import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  TextInput,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Camera as CameraIcon, Check, Mic, X, Repeat, Building, ArrowLeft } from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import Voice, { SpeechErrorEvent, SpeechResultsEvent } from '@react-native-community/voice';
import * as FileSystem from 'expo-file-system';
import DateTimePicker from '@react-native-community/datetimepicker';

const visitResults = [
  { key: 'Satış Yapıldı', icon: Check, color: '#10B981' },
  { key: 'İlgilenmedi', icon: X, color: '#EF4444' },
  { key: 'Tekrar Gidilecek', icon: Repeat, color: '#F59E0B' },
  { key: 'Diğer', icon: Building, color: '#64748B' },
];

export default function VisitDetailsScreen() {
  const { visitId } = useLocalSearchParams();
  const router = useRouter();
  
  const [visit, setVisit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [visitResult, setVisitResult] = useState('');
  const [notes, setNotes] = useState('');
  const [customerIdentifier, setCustomerIdentifier] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // --- Voice Listeners ---
  useEffect(() => {
    const onSpeechStart = () => setIsRecording(true);
    const onSpeechEnd = () => setIsRecording(false);
    const onSpeechError = (e: SpeechErrorEvent) => {
      console.error('onSpeechError:', e.error);
      setIsRecording(false);
      Alert.alert('Ses Tanıma Hatası', e.error?.message || 'Bilinmeyen bir hata oluştu.');
    };
    const onSpeechResults = (e: SpeechResultsEvent) => {
      if (e.value && e.value.length > 0) {
        setNotes(prev => (prev ? `${prev} ${e.value![0]}` : e.value![0]));
      }
    };

    Voice.onSpeechStart = onSpeechStart;
    Voice.onSpeechEnd = onSpeechEnd;
    Voice.onSpeechError = onSpeechError;
    Voice.onSpeechResults = onSpeechResults;

    return () => {
      Voice.destroy().then(Voice.removeAllListeners);
    };
  }, []);

  // --- Android runtime mikrofon izni ---
  const requestAudioPermission = async () => {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: "Mikrofon İzni",
          message: "Ziyaret notlarını sesli olarak kaydedebilmek için mikrofon izni gerekli",
          buttonNeutral: "Sonra Sor",
          buttonNegative: "İptal",
          buttonPositive: "Tamam",
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
    return true;
  };

  const toggleRecording = async () => {
    const hasPermission = await requestAudioPermission();
    if (!hasPermission) { Alert.alert('Mikrofon izni verilmedi'); return; }

    if (isRecording) {
      try { await Voice.stop(); } catch (e) { console.error('Voice.stop hatası:', e); }
    } else {
      try { await Voice.start('tr-TR'); } 
      catch (e) {
        console.error('[HATA] Voice.start çöktü:', e);
        Alert.alert("Mikrofon Hatası", "Ses tanıma başlatılamadı. Lütfen tekrar deneyin veya uygulama izinlerinizi kontrol edin.");
      }
    }
  };

  // --- Fetch visit ---
  useEffect(() => {
    if (visitId) {
      const fetchVisit = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('visits').select('*').eq('id', visitId as string).single();
        if (error) { Alert.alert('Hata', 'Ziyaret detayı getirilemedi.'); router.back(); } 
        else { setVisit(data); }
        setLoading(false);
      };
      fetchVisit();
    }
  }, [visitId]);

  const handleTakePhoto = async () => {
    const { status } = await requestCameraPermission();
    if (status !== 'granted') { Alert.alert('İzin Gerekli', 'Fotoğraf çekmek için kamera izni vermelisiniz.'); return; }
    setShowCamera(true);
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync();
      if (photo) { setPhotoUri(photo.uri); setShowCamera(false); }
    }
  };

  const handleEndVisit = async () => {
    if (!photoUri) return Alert.alert('Eksik Bilgi', 'Lütfen işletmeye ait bir fotoğraf çekin.');
    if (!visitResult) return Alert.alert('Eksik Bilgi', 'Lütfen ziyaret sonucunu seçin.');
    if (visitResult === 'Tekrar Gidilecek' && !rescheduleDate) return Alert.alert('Eksik Bilgi', 'Lütfen tekrar gidilecek bir tarih seçin.');
    if (!customerIdentifier.trim()) return Alert.alert('Eksik Bilgi', 'Lütfen müşteri/işletme adını girin.');

    setIsSubmitting(true);
    try {
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = location.coords;
      const startLocation = visit.konum.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);
      const startLon = parseFloat(startLocation[1]);
      const startLat = parseFloat(startLocation[2]);
      const distance = getDistance({ latitude: startLat, longitude: startLon }, { latitude, longitude });
      if (distance > 0.2) { Alert.alert('Konum Hatası', 'Ziyareti başlattığınız konumdan çok uzaktasınız.'); setIsSubmitting(false); return; }

      const fileExt = photoUri.split('.').pop();
      const filePath = `${visit.staff_id}/${Date.now()}.${fileExt}`;
      const contentType = `image/${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('visit-photos').upload(filePath, { uri: photoUri, type: contentType, name: filePath }, { upsert: false });
      if (uploadError) throw new Error("Fotoğraf yüklenemedi: " + uploadError.message);
      const { data: urlData } = supabase.storage.from('visit-photos').getPublicUrl(filePath);

      const updatePayload: any = {
        ziyaret_bitis: new Date().toISOString(),
        ziyaret_sonucu: visitResult,
        notlar: notes,
        fotograf_url: urlData.publicUrl,
        musteri_tanimlayici: customerIdentifier,
      };
      if (visitResult === 'Tekrar Gidilecek') updatePayload.tekrar_ziyaret_tarihi = rescheduleDate.toISOString();

      const { error: updateError } = await supabase.from('visits').update(updatePayload).eq('id', visit.id);
      if (updateError) throw updateError;

      Alert.alert('Başarılı', 'Ziyaret başarıyla sonlandırıldı.');
      router.back();
    } catch (error: any) {
      console.error(error);
      Alert.alert('Hata', 'Ziyaret bitirilemedi: ' + error.message);
    } finally { setIsSubmitting(false); }
  };

  const getDistance = (coord1: {latitude: number, longitude: number}, coord2: {latitude: number, longitude: number}) => {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(coord2.latitude - coord1.latitude);
    const dLon = toRad(coord2.longitude - coord1.longitude);
    const lat1 = toRad(coord1.latitude); const lat2 = toRad(coord2.latitude);
    const a = Math.sin(dLat/2)**2 + Math.sin(dLon/2)**2 * Math.cos(lat1) * Math.cos(lat2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const onDateChange = (event: any, selectedDate?: Date) => {
    const currentDate = selectedDate || rescheduleDate;
    setShowDatePicker(Platform.OS === 'ios');
    setRescheduleDate(currentDate);
  };

  const handleSelectResult = (key: string) => {
    setVisitResult(key);
    setShowDatePicker(key === 'Tekrar Gidilecek');
  };

  if (loading) return <SafeAreaView style={styles.container}><ActivityIndicator style={{flex:1}} size="large"/></SafeAreaView>;

  if (showCamera) {
    return (
      <Modal visible={showCamera} animationType="slide">
        <CameraView style={{ flex: 1 }} facing="back" ref={cameraRef}>
          <View style={styles.cameraContainer}>
            <TouchableOpacity style={styles.takePictureButton} onPress={takePicture}/>
            <TouchableOpacity style={styles.closeCameraButton} onPress={() => setShowCamera(false)}><X size={24} color="white"/></TouchableOpacity>
          </View>
        </CameraView>
      </Modal>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}><ArrowLeft size={24} color="#1E293B"/></TouchableOpacity>
        <Text style={styles.title}>Ziyareti Tamamla</Text>
        <View style={{width:44}}/>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>Müşteri / İşletme Bilgisi</Text>
        <TextInput style={styles.input} placeholder="Müşteri Adı veya İşletme Adı" value={customerIdentifier} onChangeText={setCustomerIdentifier}/>
        <Text style={styles.sectionTitle}>Ziyaret Kanıtı</Text>
        <TouchableOpacity style={styles.photoButton} onPress={handleTakePhoto}>
          {photoUri ? <Image source={{ uri: photoUri }} style={styles.photoPreview} /> : (<><CameraIcon size={24} color="#1E40AF" /><Text style={styles.photoButtonText}>Fotoğraf Çek</Text></>)}
        </TouchableOpacity>
        <Text style={styles.sectionTitle}>Ziyaret Sonucu</Text>
        <View style={styles.resultsContainer}>
          {visitResults.map(({ key, icon: Icon, color }) => (
            <TouchableOpacity 
              key={key} 
              style={[styles.resultButton, visitResult === key && { backgroundColor: color, borderColor: color }]} 
              onPress={() => handleSelectResult(key)}
            >
              <Icon size={20} color={visitResult === key ? '#FFFFFF' : '#334155'} />
              <Text style={[styles.resultText, visitResult === key && styles.selectedResultText]}>{key}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {showDatePicker && (
            <DateTimePicker
                testID="dateTimePicker"
                value={rescheduleDate}
                mode="date"
                display="default"
                onChange={onDateChange}
                minimumDate={new Date()}
            />
        )}

        <Text style={styles.sectionTitle}>Notlar</Text>
        <View style={styles.notesContainer}>
          <TextInput style={styles.notesInput} placeholder="Ziyaret ile ilgili notlarınızı buraya yazın veya mikrofonu kullanın..." multiline value={notes} onChangeText={setNotes} />
          <TouchableOpacity style={[styles.micButton, isRecording && styles.micButtonRecording]} onPress={toggleRecording}>
            <Mic size={24} color="white" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.endVisitButton, isSubmitting && { opacity: 0.7 }]} onPress={handleEndVisit} disabled={isSubmitting}>
          {isSubmitting ? <ActivityIndicator color="white" /> : <Text style={styles.endVisitButtonText}>Ziyareti Bitir ve Kaydet</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  backButton: { padding: 8 },
  title: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '600', color: '#1E293B' },
  content: { padding: 20, paddingBottom: 40 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#334155', marginBottom: 12, marginTop: 20 },
  input: { backgroundColor: 'white', padding: 16, borderRadius: 8, fontSize: 16, borderWidth: 1, borderColor: '#CBD5E1', color: '#1E293B' },
  photoButton: { height: 150, borderRadius: 8, backgroundColor: '#DBEAFE', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#93C5FD', borderStyle: 'dashed' },
  photoButtonText: { color: '#1E40AF', marginTop: 8, fontWeight: '500' },
  photoPreview: { width: '100%', height: '100%', borderRadius: 8 },
  resultsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  resultButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'white', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', flexBasis: '48%', flexGrow: 1, gap: 8 },
  resultText: { fontSize: 14, fontWeight: '500', color: '#334155' },
  selectedResultText: { color: 'white' },
  notesContainer: { flexDirection: 'row', alignItems: 'flex-start' },
  notesInput: { flex: 1, height: 120, backgroundColor: 'white', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#CBD5E1', textAlignVertical: 'top', fontSize: 16, color: '#1E293B' },
  micButton: { padding: 12, backgroundColor: '#2563EB', borderRadius: 8, marginLeft: 10, justifyContent: 'center', alignItems: 'center', height: 50 },
  micButtonRecording: { backgroundColor: '#EF4444' },
  endVisitButton: { backgroundColor: '#16A34A', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 30 },
  endVisitButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  cameraContainer: { flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 50 },
  takePictureButton: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'white', borderWidth: 4, borderColor: 'rgba(0,0,0,0.2)' },
  closeCameraButton: { position: 'absolute', top: 60, right: 20, padding: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 }
});
