import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/lib/supabase';
import { FileText, Plus, Calendar, CreditCard, Clock, CircleCheck as CheckCircle, CircleX as XCircle, User, AlertCircle, Award, Briefcase } from 'lucide-react-native';
import SignatureScreen from 'react-native-signature-canvas';

// --- INTERFACES ---
interface HRRequest {
  id: string;
  staff_id: string;
  type: 'leave' | 'advance' | 'other';
  title: string;
  description: string | null;
  amount: number | null;
  start_date: string | null;
  end_date: string | null;
  status: 'pending' | 'sales_approved' | 'sales_rejected' | 'hr_approved' | 'hr_rejected';
  created_at: string;
  staff?: {
    profiles: { full_name: string | null; email: string; };
    employee_code: string;
  };
}

interface Staff {
  id: string;
  profile_id: string;
  employee_code: string;
}

const requestTypes = [
    { key: 'annual_leave', label: 'Yıllık İzin', category: 'leave', icon: Award },
    { key: 'paid_leave', label: 'Ücretli İzin', category: 'leave', icon: Calendar },
    { key: 'unpaid_leave', label: 'Ücretsiz İzin', category: 'leave', icon: Briefcase },
    { key: 'advance', label: 'Avans Talebi', category: 'advance', icon: CreditCard },
    { key: 'other', label: 'Diğer', category: 'other', icon: FileText },
];

// --- COMPONENT ---
export default function HRScreen() {
  const { session } = useAuth();
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const { management } = useLocalSearchParams();
  const router = useRouter();
  
  const [requests, setRequests] = useState<HRRequest[]>([]);
  const [userStaff, setUserStaff] = useState<Staff | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showManagement, setShowManagement] = useState(!!management);
  const [allRequests, setAllRequests] = useState<HRRequest[]>([]);
  const [isSignatureModalVisible, setSignatureModalVisible] = useState(false);

  // Form State
  const [requestType, setRequestType] = useState<'leave' | 'advance' | 'other'>('leave');
  const [selectedTypeKey, setSelectedTypeKey] = useState('annual_leave');
  const [title, setTitle] = useState('Yıllık İzin Talebi');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [startDateObj, setStartDateObj] = useState(new Date());
  const [endDateObj, setEndDateObj] = useState(new Date());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!permissionsLoading && session?.user) {
      fetchUserStaff();
    }
  }, [permissionsLoading, session]);

  useEffect(() => {
    if (permissionsLoading) return;
    const loadRequestData = async () => {
      setLoading(true);
      try {
        const promises = [];
        if (userStaff) {
          promises.push(fetchMyRequests());
        }
        if (hasPermission('hr.requests.manage') || hasPermission('hr.requests.approve_sales')) {
          promises.push(fetchAllRequests());
        }
        if (promises.length > 0) {
          await Promise.all(promises);
        }
      } catch (error) {
        console.error("Talep verileri yüklenirken hata oluştu:", error);
        Alert.alert("Hata", "Talepler yüklenirken bir sorun oluştu.");
      } finally {
        setLoading(false);
      }
    };
    loadRequestData();
  }, [userStaff, hasPermission, permissionsLoading]);

  const fetchUserStaff = async () => {
    const { data, error } = await supabase.from('staff').select('*').eq('profile_id', session?.user?.id).single();
    if (error && error.code !== 'PGRST116') console.error('Error fetching user staff:', error);
    setUserStaff(data);
  };

  const baseQuery = `id, created_at, type, title, description, amount, start_date, end_date, status, staff (employee_code, profiles (full_name, email))`;
  
  const fetchMyRequests = async () => {
    if(!userStaff?.id) return;
    const { data, error } = await supabase.from('hr_requests').select(baseQuery).eq('staff_id', userStaff.id).order('created_at', { ascending: false });
    if (error) Alert.alert('Hata', 'Talepleriniz getirilemedi.');
    setRequests(data || []);
  };
  
  const fetchAllRequests = async () => {
    const { data, error } = await supabase.from('hr_requests').select(baseQuery).order('created_at', { ascending: false });
    if (error) Alert.alert('Hata', 'Tüm talepler getirilemedi.');
    setAllRequests(data || []);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
        userStaff ? fetchMyRequests() : Promise.resolve(),
        (hasPermission('hr.requests.manage') || hasPermission('hr.requests.approve_sales')) ? fetchAllRequests() : Promise.resolve()
    ]);
    setRefreshing(false);
  };

  const handleCreateRequest = () => {
    setSelectedTypeKey('annual_leave');
    setRequestType('leave');
    setTitle('Yıllık İzin Talebi');
    setDescription('');
    setAmount('');
    setStartDate('');
    setEndDate('');
    const today = new Date();
    setStartDateObj(today);
    setEndDateObj(today);
    setModalVisible(true);
  };
  
  const handleTypeSelect = (type: (typeof requestTypes)[0]) => {
      setSelectedTypeKey(type.key);
      setRequestType(type.category as 'leave' | 'advance' | 'other');
      setTitle(type.label);
  };

  const initiateSaveRequest = () => {
    if (!title.trim()) return Alert.alert('Hata', 'Talep başlığı boş bırakılamaz.');
    const cleanAmount = amount.replace(/\./g, '').replace(',', '.');
    const parsedAmount = parseFloat(cleanAmount);
    if (requestType === 'advance' && (isNaN(parsedAmount) || parsedAmount <= 0)) {
      return Alert.alert('Hata', 'Lütfen geçerli bir avans tutarı girin.');
    }
    if (requestType === 'leave' && (!startDate || !endDate)) {
      return Alert.alert('Hata', 'Lütfen izin için başlangıç ve bitiş tarihlerini seçin.');
    }
    setSignatureModalVisible(true);
  };

  const handleSaveRequestWithSignature = async (signature: string) => {
    setSaving(true);
    const cleanAmount = amount.replace(/\./g, '').replace(',', '.');
    const parsedAmount = parseFloat(cleanAmount);

    const { error } = await supabase.from('hr_requests').insert({
      staff_id: userStaff?.id,
      type: requestType,
      title: title.trim(),
      description: description.trim() || null,
      amount: requestType === 'advance' ? parsedAmount : null,
      start_date: requestType === 'leave' ? startDate : null,
      end_date: requestType === 'leave' ? endDate : null,
      signature: signature,
    });
    setSaving(false);
    setSignatureModalVisible(false);

    if (error) {
      Alert.alert('Hata', 'Talep oluşturulamadı: ' + error.message);
    } else {
      Alert.alert('Başarılı', 'Talebiniz başarıyla gönderildi.');
      setModalVisible(false);
      onRefresh();
    }
  };

  const handleAmountChange = (value: string) => {
    const numericValue = value.replace(/[^\d,]/g, '').replace(',', '.');
    setAmount(numericValue);
  };

  const handleDateChange = (setter: React.Dispatch<React.SetStateAction<string>>, dateObjSetter: React.Dispatch<React.SetStateAction<Date>>, pickerSetter: React.Dispatch<React.SetStateAction<boolean>>) => (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') pickerSetter(false);
    if (selectedDate) {
      dateObjSetter(selectedDate);
      setter(selectedDate.toISOString().split('T')[0]);
    }
  };

  const getStatusDetails = (status: HRRequest['status']) => {
    switch (status) {
      case 'pending': return { text: 'Satış Onayı Bekliyor', color: '#F59E0B', Icon: Clock };
      case 'sales_approved': return { text: 'İK Onayı Bekliyor', color: '#3B82F6', Icon: CheckCircle };
      case 'hr_approved': return { text: 'Onaylandı', color: '#10B981', Icon: CheckCircle };
      case 'sales_rejected': return { text: 'Satış Reddetti', color: '#EF4444', Icon: XCircle };
      case 'hr_rejected': return { text: 'İK Reddetti', color: '#EF4444', Icon: XCircle };
      default: return { text: status, color: '#6B7280', Icon: AlertCircle };
    }
  };

  const renderRequestCard = (request: HRRequest) => {
    const { text, color } = getStatusDetails(request.status);
    return (
      <TouchableOpacity key={request.id} style={styles.requestCard} onPress={() => router.push({ pathname: '/hr-request', params: { id: request.id }})}>
        <View style={[styles.cardLeftBorder, {backgroundColor: color}]} />
        <View style={styles.cardMainContent}>
            <View style={styles.cardHeader}><View style={styles.cardHeaderInfo}><Text style={styles.requestTitle}>{request.title}</Text>{showManagement && (<Text style={styles.requestStaff}>{`${request.staff?.profiles.full_name || 'İsimsiz'} - #${request.staff?.employee_code}`}</Text>)}</View></View>
            <View style={styles.cardBody}><View style={styles.metaRow}>{request.amount != null && <Text style={styles.amountText}>₺{request.amount.toLocaleString('tr-TR', {minimumFractionDigits: 2})}</Text>}{request.start_date && (<View style={styles.dateContainer}><Calendar size={14} color="#64748B" /><Text style={styles.dateText}>{`${new Date(request.start_date).toLocaleDateString('tr-TR')}`}</Text></View>)}</View></View>
            <View style={styles.cardFooter}><View style={[styles.statusBadge, { backgroundColor: `${color}1A` }]}><Clock color={color} size={14} /><Text style={[styles.statusText, { color }]}>{text}</Text></View></View>
        </View>
      </TouchableOpacity>
    );
  };

  if (permissionsLoading || (loading && !refreshing)) {
    return (
      <SafeAreaView style={styles.container}><View style={styles.loadingContainer}><ActivityIndicator size="large" color="#2563EB" /><Text style={styles.loadingText}>Yükleniyor...</Text></View></SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>İK Talepleri</Text>
        <View style={styles.headerActions}>
          {(hasPermission('hr.requests.manage') || hasPermission('hr.requests.approve_sales')) && (<TouchableOpacity style={[styles.iconButton, showManagement && styles.iconButtonActive]} onPress={() => setShowManagement(!showManagement)}><User size={20} color={showManagement ? "#1E40AF" : "#334155"} /></TouchableOpacity>)}
          <TouchableOpacity style={styles.addButton} onPress={handleCreateRequest} disabled={!userStaff}><Plus size={20} color="#FFFFFF" /></TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <Text style={styles.sectionTitle}>{showManagement ? 'Tüm Talepler' : 'Taleplerim'}</Text>
        {(showManagement ? allRequests : requests).length > 0 ? ((showManagement ? allRequests : requests).map(renderRequestCard)) : (<View style={styles.emptyState}><FileText size={48} color="#9CA3AF" /><Text style={styles.emptyTitle}>Henüz talep yok</Text><Text style={styles.emptyDescription}>Yeni bir talep oluşturmak için + butonuna dokunun.</Text></View>)}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}><Text style={styles.modalButtonText}>İptal</Text></TouchableOpacity>
            <Text style={styles.modalTitle}>Yeni Talep Oluştur</Text>
            <TouchableOpacity onPress={initiateSaveRequest} disabled={saving}><Text style={[styles.modalButtonText, styles.modalButtonPrimary, saving && {opacity: 0.5}]}>{saving ? '...' : 'İmzala ve Gönder'}</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <Text style={styles.label}>Talep Tipi</Text>
            <View style={styles.typeSelectorGrid}>{requestTypes.map(type => {const isActive = selectedTypeKey === type.key; return (<TouchableOpacity key={type.key} style={[styles.typeSelectorButton, isActive && styles.activeTypeButton]} onPress={() => handleTypeSelect(type)}><type.icon size={20} color={isActive ? "#FFFFFF" : "#334155"} /><Text style={[styles.typeSelectorText, isActive && styles.activeTypeSelectorText]}>{type.label}</Text></TouchableOpacity>)})}</View>
            <Text style={styles.label}>Başlık *</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Örn: Yıllık İzin Talebi"/>
            <Text style={styles.label}>Açıklama</Text>
            <TextInput style={[styles.input, styles.textArea]} value={description} onChangeText={setDescription} multiline placeholder="Talebinizle ilgili detaylar (opsiyonel)..."/>
            {requestType === 'advance' && <><Text style={styles.label}>Tutar (₺) *</Text><TextInput style={styles.input} value={amount} onChangeText={setAmount} placeholder="0,00" keyboardType="numeric"/></>}
            {requestType === 'leave' && <><View style={styles.dateRow}><View style={{flex: 1}}><Text style={styles.label}>Başlangıç *</Text><TouchableOpacity style={styles.input} onPress={() => setShowStartDatePicker(true)}><Text>{startDate ? new Date(startDate).toLocaleDateString('tr-TR') : 'Seçin'}</Text></TouchableOpacity></View><View style={{flex: 1}}><Text style={styles.label}>Bitiş *</Text><TouchableOpacity style={styles.input} onPress={() => setShowEndDatePicker(true)}><Text>{endDate ? new Date(endDate).toLocaleDateString('tr-TR') : 'Seçin'}</Text></TouchableOpacity></View></View>{showStartDatePicker && <DateTimePicker value={startDateObj} mode="date" display="default" onChange={handleDateChange(setStartDate, setStartDateObj, setShowStartDatePicker)} />}{showEndDatePicker && <DateTimePicker value={endDateObj} mode="date" display="default" minimumDate={startDateObj} onChange={handleDateChange(setEndDate, setEndDateObj, setShowEndDatePicker)} />}</>}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      <Modal visible={isSignatureModalVisible} transparent={true} animationType="fade">
        <View style={styles.signatureModalContainer}>
            <View style={styles.signatureModalContent}>
                <Text style={styles.signatureTitle}>Talebi İmzala</Text>
                <SignatureScreen
                    onOK={handleSaveRequestWithSignature}
                    onEmpty={() => Alert.alert("Hata", "Lütfen imza alanını doldurun.")}
                    descriptionText=""
                    clearText="Temizle"
                    confirmText="Onayla ve Kaydet"
                    webStyle={`.m-signature-pad--footer {box-shadow: none; margin-top: 10px;}`}
                    autoClear={true}
                />
            </View>
            <TouchableOpacity style={styles.signatureCloseButton} onPress={() => setSignatureModalVisible(false)}>
                <Text style={styles.signatureCloseText}>Kapat</Text>
            </TouchableOpacity>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // Main layout
  container: { flex: 1, backgroundColor: '#F1F5F9' },
  content: { padding: 16, paddingBottom: 32, gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  title: { fontSize: 22, fontWeight: 'bold', color: '#0F172A' },
  headerActions: { flexDirection: 'row', gap: 12 },
  iconButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F1F5F9' },
  iconButtonActive: { backgroundColor: '#DBEAFE' },
  addButton: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: '#2563EB' },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#334155' },
  requestCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 12, shadowColor: '#334155', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3},
  cardLeftBorder: { width: 5, borderTopLeftRadius: 12, borderBottomLeftRadius: 12 },
  cardMainContent: { flex: 1, padding: 16, gap: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  cardHeaderInfo: { flex: 1, gap: 2 },
  requestTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
  requestStaff: { fontSize: 13, color: '#64748B' },
  cardBody: { gap: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  amountText: { fontSize: 14, fontWeight: '600', color: '#166534', backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, overflow: 'hidden' },
  dateContainer: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { fontSize: 13, color: '#475569' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText: { fontSize: 16, color: '#64748B' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 64, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#334155' },
  emptyDescription: { fontSize: 14, color: '#64748B', textAlign: 'center' },
  modalContainer: { flex: 1, backgroundColor: '#F8FAFC' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0F172A' },
  modalButtonText: { fontSize: 16, color: '#64748B' },
  modalButtonPrimary: { color: '#2563EB', fontWeight: '600' },
  modalContent: { padding: 20, gap: 16 },
  label: { fontSize: 16, fontWeight: '500', color: '#334155' },
  input: { backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, padding: 12, fontSize: 16, justifyContent: 'center' },
  textArea: { height: 100, textAlignVertical: 'top' },
  dateRow: { flexDirection: 'row', gap: 16 },
  typeSelectorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  typeSelectorButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, width: '48%' },
  activeTypeButton: { backgroundColor: '#2563EB', borderColor: '#2563EB' },
  typeSelectorText: { fontSize: 14, fontWeight: '500', color: '#334155' },
  activeTypeSelectorText: { color: '#FFFFFF' },
  signatureModalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  signatureModalContent: { width: '90%', height: '60%', backgroundColor: 'white', borderRadius: 12, padding: 16 },
  signatureTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
  signatureCloseButton: { marginTop: 16, backgroundColor: '#FFFFFF', padding: 12, borderRadius: 8 },
  signatureCloseText: { textAlign: 'center', color: '#334155', fontWeight: '600' }
});


