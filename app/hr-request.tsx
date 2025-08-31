import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Platform, Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { ArrowLeft, Calendar, CircleCheck as CheckCircle, CircleX as XCircle, Clock, Download, FileText, User } from 'lucide-react-native';
import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';
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
  signature: string | null;
  staff?: {
    profiles: { full_name: string | null; email: string; };
    employee_code: string;
  };
  approvals?: Array<{
    id: string;
    approval_type: 'sales_manager' | 'hr_manager';
    status: 'approved' | 'rejected';
    notes: string | null;
    signature: string | null;
    approver: { full_name: string | null; email: string; };
    created_at: string;
  }>;
}

// --- COMPONENT ---
export default function HRRequestDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { session } = useAuth();
  const { hasPermission } = usePermissions();

  const [request, setRequest] = useState<HRRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isSignatureModalVisible, setSignatureModalVisible] = useState(false);
  const [approvalContext, setApprovalContext] = useState<{ type: 'sales_manager' | 'hr_manager', status: 'approved' | 'rejected' } | null>(null);

  const baseQuery = `
    id, created_at, type, title, description, amount, start_date, end_date, status, signature,
    staff (employee_code, profiles (full_name, email)),
    approvals:hr_request_approvals (
      id, approval_type, status, notes, signature, created_at,
      approver:profiles!hr_request_approvals_approver_id_fkey (full_name, email)
    )
  `;

  const fetchRequest = async () => {
    if (!id) return;
    setLoading(true);
    const { data, error } = await supabase.from('hr_requests').select(baseQuery).eq('id', id as string).single();
    if (error) {
      Alert.alert("Hata", "Talep detayları getirilemedi.");
      console.error(error);
    } else {
      setRequest(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRequest();
  }, [id]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRequest().finally(() => setRefreshing(false));
  };

  const initiateApproval = (type: 'sales_manager' | 'hr_manager', status: 'approved' | 'rejected') => {
    setApprovalContext({ type, status });
    setSignatureModalVisible(true);
  };

  const onSaveSignature = async (signature: string) => {
    if (!request || !approvalContext) return;

    setSignatureModalVisible(false);
    
    const { error: approvalError } = await supabase.from('hr_request_approvals').insert({
      request_id: request.id,
      approver_id: session?.user?.id,
      approval_type: approvalContext.type,
      status: approvalContext.status,
      signature: signature,
    });
  
    if (approvalError) return Alert.alert('Hata', 'Onay kaydedilemedi: ' + approvalError.message);

    const newStatus = approvalContext.type === 'sales_manager'
      ? (approvalContext.status === 'approved' ? 'sales_approved' : 'sales_rejected')
      : (approvalContext.status === 'approved' ? 'hr_approved' : 'hr_rejected');

    const { error: updateError } = await supabase.from('hr_requests').update({ status: newStatus }).eq('id', request.id);
  
    if (updateError) return Alert.alert('Hata', 'Talep durumu güncellenemedi.');
  
    Alert.alert('Başarılı', `Talep ${approvalContext.status === 'approved' ? 'onaylandı' : 'reddedildi'}.`);
    onRefresh();
  };


  const generatePDF = async () => {
    if (!request) return;
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/generate-hr-pdf`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: request.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Bilinmeyen PDF hatası');
      }
      const htmlContent = await response.text();

      const { uri } = await Print.printToFileAsync({ html: htmlContent, base64: false });
      await shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'İK Talebini Paylaş' });

    } catch (error: any) {
      console.error('PDF generation error:', error);
      Alert.alert('Hata', `PDF oluşturulamadı: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}><View style={styles.loadingContainer}><ActivityIndicator size="large" color="#2563EB" /></View></SafeAreaView>
    );
  }

  if (!request) {
    return (
      <SafeAreaView style={styles.container}>
          <View style={styles.header}><TouchableOpacity style={styles.backButton} onPress={() => router.back()}><ArrowLeft size={24} color="#1E293B" /></TouchableOpacity></View>
        <View style={styles.emptyState}><Text>Talep bulunamadı.</Text></View>
      </SafeAreaView>
    );
  }

  const timelineEvents = [
    { type: 'created', date: request.created_at, title: 'Talep Oluşturuldu', actor: request.staff?.profiles.full_name || 'Personel' },
    ...(request.approvals || []).map(approval => ({
        type: approval.status,
        date: approval.created_at,
        title: `${approval.approval_type === 'sales_manager' ? 'Satış Müdürü' : 'İK'} ${approval.status === 'approved' ? 'Onayladı' : 'Reddetti'}`,
        actor: approval.approver?.full_name || 'Yönetici'
    })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  ];

  const canApproveSales = request.status === 'pending' && hasPermission('hr.requests.approve_sales');
  const canApproveHR = request.status === 'sales_approved' && hasPermission('hr.requests.manage');
  const isFinalState = ['hr_approved', 'hr_rejected', 'sales_rejected'].includes(request.status);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}><ArrowLeft size={24} color="#1E293B" /></TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{request.title}</Text>
        {isFinalState && hasPermission('hr.requests.manage') 
            ? <TouchableOpacity style={styles.pdfButton} onPress={generatePDF}><Download size={24} color="#1E293B" /></TouchableOpacity>
            : <View style={{width: 44}} />
        }
      </View>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>Talep Sahibi</Text>
            <Text style={styles.infoValue}>{request.staff?.profiles.full_name}</Text>
            <Text style={styles.infoSubValue}>#{request.staff?.employee_code}</Text>
        </View>
         {request.amount && (
            <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>Tutar</Text>
                <Text style={styles.infoValueAmount}>₺{request.amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</Text>
            </View>
        )}
        {request.start_date && (
            <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>Tarih Aralığı</Text>
                <Text style={styles.infoValue}>{new Date(request.start_date).toLocaleDateString('tr-TR')} - {new Date(request.end_date!).toLocaleDateString('tr-TR')}</Text>
            </View>
        )}
        {request.description && (
             <View style={styles.infoCard}>
                <Text style={styles.infoTitle}>Açıklama</Text>
                <Text style={styles.infoDescription}>{request.description}</Text>
            </View>
        )}
        
        <View style={styles.timelineSection}>
            <Text style={styles.sectionTitle}>Talep Geçmişi</Text>
            {timelineEvents.map((event, index) => {
                const Icon = event.type === 'approved' ? CheckCircle : event.type === 'rejected' ? XCircle : FileText;
                const color = event.type === 'approved' ? '#10B981' : event.type === 'rejected' ? '#EF4444' : '#64748B';
                return(
                    <View key={index} style={styles.timelineItem}>
                        <View style={styles.timelineIconContainer}>
                           {index < timelineEvents.length - 1 && <View style={styles.timelineConnector} />}
                            <View style={[styles.timelineIcon, {backgroundColor: `${color}20`}]}><Icon size={20} color={color} /></View>
                        </View>
                        <View style={styles.timelineContent}>
                            <Text style={styles.timelineTitle}>{event.title}</Text>
                            <Text style={styles.timelineActor}>{event.actor}</Text>
                            <Text style={styles.timelineDate}>{new Date(event.date).toLocaleString('tr-TR')}</Text>
                        </View>
                    </View>
                )
            })}
        </View>
      </ScrollView>

      {(canApproveSales || canApproveHR) && (
        <View style={styles.footerActions}>
            <TouchableOpacity style={[styles.actionButton, styles.rejectButton]} onPress={() => initiateApproval(canApproveSales ? 'sales_manager' : 'hr_manager', 'rejected')}>
                <XCircle size={20} color="#B91C1C" /><Text style={styles.rejectButtonText}>Reddet ve İmzala</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, styles.approveButton]} onPress={() => initiateApproval(canApproveSales ? 'sales_manager' : 'hr_manager', 'approved')}>
                <CheckCircle size={20} color="#166534" /><Text style={styles.approveButtonText}>Onayla ve İmzala</Text>
            </TouchableOpacity>
        </View>
      )}

      <Modal visible={isSignatureModalVisible} transparent={true} animationType="fade">
        <View style={styles.signatureModalContainer}>
            <View style={styles.signatureModalContent}>
                <Text style={styles.signatureTitle}>Lütfen İmzalayın</Text>
                <SignatureScreen
                    onOK={onSaveSignature}
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
    container: { flex: 1, backgroundColor: '#F1F5F9' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E2E8F0' },
    backButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '600', color: '#1E293B', marginHorizontal: 12 },
    pdfButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center' },
    content: { padding: 16, paddingBottom: 32 },
    infoCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, marginBottom: 16, shadowColor: '#334155', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
    infoTitle: { fontSize: 14, color: '#64748B', marginBottom: 4 },
    infoValue: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
    infoValueAmount: { fontSize: 20, fontWeight: 'bold', color: '#166534'},
    infoSubValue: { fontSize: 14, color: '#9CA3AF' },
    infoDescription: { fontSize: 15, color: '#334155', lineHeight: 22 },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: '#334155', marginBottom: 16 },
    timelineSection: { marginTop: 16 },
    timelineItem: { flexDirection: 'row', gap: 16 },
    timelineIconContainer: { alignItems: 'center' },
    timelineIcon: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    timelineConnector: { position: 'absolute', top: 40, bottom: -16, width: 2, backgroundColor: '#E2E8F0' },
    timelineContent: { flex: 1, paddingBottom: 24 },
    timelineTitle: { fontSize: 16, fontWeight: '600', color: '#1E293B' },
    timelineActor: { fontSize: 14, color: '#475569', marginTop: 2 },
    timelineDate: { fontSize: 12, color: '#9CA3AF', marginTop: 4 },
    footerActions: { flexDirection: 'row', padding: 16, gap: 12, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#E2E8F0' },
    actionButton: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, borderRadius: 8, gap: 8 },
    approveButton: { backgroundColor: '#DCFCE7' },
    approveButtonText: { color: '#166534', fontWeight: 'bold', fontSize: 16 },
    rejectButton: { backgroundColor: '#FEE2E2' },
    rejectButtonText: { color: '#B91C1C', fontWeight: 'bold', fontSize: 16 },
    signatureModalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
    signatureModalContent: { width: '90%', height: '60%', backgroundColor: 'white', borderRadius: 12, padding: 16 },
    signatureTitle: { fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 12 },
    signatureCloseButton: { marginTop: 16, backgroundColor: '#FFFFFF', padding: 12, borderRadius: 8 },
    signatureCloseText: { textAlign: 'center', color: '#334155', fontWeight: '600' }
});

