import React, { useEffect, useState } from 'react';
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
  Switch,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';
import { CitySelector } from '@/components/CitySelector';
import { OCRScanner } from '@/components/OCRScanner';
import { 
  Shield, 
  Plus, 
  Users as UsersIcon, 
  CreditCard as Edit, 
  Trash2,
  Phone,
  Mail,
  MapPin,
  Building2,
  User,
  Camera,
  X,
  Search
} from 'lucide-react-native';

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  type: 'individual' | 'corporate';
  tax_number: string | null;
  assigned_staff_id: string | null;
  city_id: string | null;
  notes: string | null;
  is_active: boolean;
  cities?: {
    name: string;
  } | null;
  assigned_staff?: {
    full_name: string | null;
    email: string;
  } | null;
}

export default function CustomersScreen() {
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const { session } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [ocrModalVisible, setOcrModalVisible] = useState(false);
  
  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [customerType, setCustomerType] = useState<'individual' | 'corporate'>('individual');
  const [taxNumber, setTaxNumber] = useState('');
  const [selectedCityId, setSelectedCityId] = useState('');
  const [selectedCityName, setSelectedCityName] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [citySelectorVisible, setCitySelectorVisible] = useState(false);
  const [ocrScannerVisible, setOcrScannerVisible] = useState(false);
  
  // Filter states
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'individual' | 'corporate'>('all');

  useEffect(() => {
    if (!permissionsLoading && hasPermission('sales.customers.view')) {
      fetchCustomers();
    }
  }, [permissionsLoading, hasPermission]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *,
          cities (name),
          assigned_staff:profiles!customers_assigned_staff_id_fkey (full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching customers:', error);
        return;
      }

      setCustomers(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchCustomers();
    setRefreshing(false);
  };

  const handleCreateCustomer = () => {
    setSelectedCustomer(null);
    resetForm();
    setModalVisible(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setName(customer.name);
    setEmail(customer.email || '');
    setPhone(customer.phone || '');
    setAddress(customer.address || '');
    setCustomerType(customer.type);
    setTaxNumber(customer.tax_number || '');
    setSelectedCityId(customer.city_id || '');
    setSelectedCityName(customer.cities?.name || '');
    setNotes(customer.notes || '');
    setModalVisible(true);
  };

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setAddress('');
    setCustomerType('individual');
    setTaxNumber('');
    setSelectedCityId('');
    setSelectedCityName('');
    setNotes('');
  };

  const handleSaveCustomer = async () => {
    if (!name.trim()) {
      Alert.alert('Hata', 'Müşteri adı gereklidir.');
      return;
    }

    if (customerType === 'corporate' && !taxNumber.trim()) {
      Alert.alert('Hata', 'Kurumsal müşteriler için vergi numarası gereklidir.');
      return;
    }

    try {
      setSaving(true);

      const customerData = {
        name: name.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        address: address.trim() || null,
        type: customerType,
        tax_number: customerType === 'corporate' ? taxNumber.trim() : null,
        assigned_staff_id: session?.user?.id,
        city_id: selectedCityId || null,
        notes: notes.trim() || null,
      };

      if (selectedCustomer) {
        // Update existing customer
        const { error } = await supabase
          .from('customers')
          .update(customerData)
          .eq('id', selectedCustomer.id);

        if (error) {
          Alert.alert('Hata', 'Müşteri güncellenemedi: ' + error.message);
          return;
        }
      } else {
        // Create new customer
        const { error } = await supabase
          .from('customers')
          .insert(customerData);

        if (error) {
          Alert.alert('Hata', 'Müşteri oluşturulamadı: ' + error.message);
          return;
        }
      }

      setModalVisible(false);
      fetchCustomers();
      Alert.alert('Başarılı', selectedCustomer ? 'Müşteri güncellendi.' : 'Yeni müşteri eklendi.');
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCustomer = (customer: Customer) => {
    Alert.alert(
      'Müşteri Sil',
      `"${customer.name}" müşterisini silmek istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('customers')
              .delete()
              .eq('id', customer.id);

            if (error) {
              Alert.alert('Hata', 'Müşteri silinemedi.');
              return;
            }

            fetchCustomers();
          },
        },
      ]
    );
  };

  const handleCitySelect = (cityId: string) => {
    setSelectedCityId(cityId);
    // We'll get city name from the CitySelector component
  };

  const handleOCRScan = () => {
    setOcrScannerVisible(true);
  };

  const handleOCRDataExtracted = (data: any) => {
    // OCR'dan gelen veriyi form'a otomatik doldur
    setName(data.name || '');
    setPhone(data.phone || '');
    setEmail(data.email || '');
    setAddress(data.address || '');
    
    // Şirket adı varsa kurumsal müşteri olarak ayarla
    if (data.company && data.company !== data.name) {
      setCustomerType('corporate');
      setName(data.company);
    } else {
      setCustomerType('individual');
    }
    
    // OCR sonrası direkt düzenleme modal'ına geç
    setSelectedCustomer(null);
    setOcrScannerVisible(false);
    setModalVisible(true);
  };

  // Filter customers based on search and type
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = searchText === '' || 
      customer.name.toLowerCase().includes(searchText.toLowerCase()) ||
      (customer.phone && customer.phone.includes(searchText)) ||
      (customer.email && customer.email.toLowerCase().includes(searchText.toLowerCase()));
    
    const matchesType = filterType === 'all' || customer.type === filterType;
    
    return matchesSearch && matchesType;
  });

  if (!hasPermission('sales.customers.view')) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.noPermissionContainer}>
          <Shield size={48} color="#64748B" />
          <Text style={styles.noPermissionTitle}>Yetkisiz Erişim</Text>
          <Text style={styles.noPermissionText}>
            Bu sayfaya erişim yetkiniz bulunmamaktadır.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text style={styles.loadingText}>Müşteriler yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Müşteriler</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={styles.ocrButton} 
            onPress={handleOCRScan}
          >
            <Camera size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={handleCreateCustomer}>
            <Plus size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search and Filter */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchContainer}>
          <Search size={20} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Müşteri ara..."
          />
        </View>
        
        <View style={styles.typeFilters}>
          <TouchableOpacity
            style={[styles.filterButton, filterType === 'all' && styles.activeFilter]}
            onPress={() => setFilterType('all')}
          >
            <Text style={[styles.filterText, filterType === 'all' && styles.activeFilterText]}>
              Tümü
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filterType === 'individual' && styles.activeFilter]}
            onPress={() => setFilterType('individual')}
          >
            <Text style={[styles.filterText, filterType === 'individual' && styles.activeFilterText]}>
              Bireysel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterButton, filterType === 'corporate' && styles.activeFilter]}
            onPress={() => setFilterType('corporate')}
          >
            <Text style={[styles.filterText, filterType === 'corporate' && styles.activeFilterText]}>
              Kurumsal
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredCustomers.length === 0 ? (
          <View style={styles.emptyState}>
            <UsersIcon size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>
              {searchText || filterType !== 'all' ? 'Müşteri bulunamadı' : 'Henüz müşteri yok'}
            </Text>
            <Text style={styles.emptyDescription}>
              {searchText || filterType !== 'all' 
                ? 'Farklı arama kriterleri deneyin'
                : 'Yeni müşteri eklemek için + veya 📷 butonuna dokunun'
              }
            </Text>
          </View>
        ) : (
          filteredCustomers.map((customer) => (
            <View key={customer.id} style={styles.customerCard}>
              <View style={styles.customerHeader}>
                <View style={styles.customerInfo}>
                  <View style={styles.customerNameRow}>
                    <Text style={styles.customerName}>{customer.name}</Text>
                    <View style={[
                      styles.typeBadge, 
                      customer.type === 'corporate' ? styles.corporateBadge : styles.individualBadge
                    ]}>
                      {customer.type === 'corporate' ? (
                        <Building2 size={12} color="#DC2626" />
                      ) : (
                        <User size={12} color="#059669" />
                      )}
                      <Text style={[
                        styles.typeText,
                        customer.type === 'corporate' ? styles.corporateText : styles.individualText
                      ]}>
                        {customer.type === 'corporate' ? 'Kurumsal' : 'Bireysel'}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.customerDetails}>
                    {customer.phone && (
                      <View style={styles.detailItem}>
                        <Phone size={14} color="#64748B" />
                        <Text style={styles.detailText}>{customer.phone}</Text>
                      </View>
                    )}
                    {customer.email && (
                      <View style={styles.detailItem}>
                        <Mail size={14} color="#64748B" />
                        <Text style={styles.detailText}>{customer.email}</Text>
                      </View>
                    )}
                    {customer.cities && (
                      <View style={styles.detailItem}>
                        <MapPin size={14} color="#64748B" />
                        <Text style={styles.detailText}>{customer.cities.name}</Text>
                      </View>
                    )}
                    {customer.type === 'corporate' && customer.tax_number && (
                      <View style={styles.detailItem}>
                        <Building2 size={14} color="#64748B" />
                        <Text style={styles.detailText}>VN: {customer.tax_number}</Text>
                      </View>
                    )}
                  </View>
                </View>
                
                <View style={styles.customerActions}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => handleEditCustomer(customer)}
                  >
                    <Edit size={18} color="#1E40AF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteCustomer(customer)}
                  >
                    <Trash2 size={18} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.statusContainer}>
                <View style={[
                  styles.statusBadge, 
                  customer.is_active ? styles.activeBadge : styles.inactiveBadge
                ]}>
                  <Text style={customer.is_active ? styles.activeText : styles.inactiveText}>
                    {customer.is_active ? 'Aktif' : 'Pasif'}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Create/Edit Customer Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelButton}>İptal</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {selectedCustomer ? 'Müşteri Düzenle' : 'Yeni Müşteri'}
            </Text>
            <TouchableOpacity onPress={handleSaveCustomer} disabled={saving}>
              <Text style={[styles.saveButton, saving && styles.buttonDisabled]}>
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Customer Type Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Müşteri Tipi</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeSelectorButton,
                    customerType === 'individual' && styles.activeTypeButton
                  ]}
                  onPress={() => setCustomerType('individual')}
                >
                  <User size={16} color={customerType === 'individual' ? '#FFFFFF' : '#64748B'} />
                  <Text style={[
                    styles.typeSelectorText,
                    customerType === 'individual' && styles.activeTypeSelectorText
                  ]}>
                    Bireysel
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.typeSelectorButton,
                    customerType === 'corporate' && styles.activeTypeButton
                  ]}
                  onPress={() => setCustomerType('corporate')}
                >
                  <Building2 size={16} color={customerType === 'corporate' ? '#FFFFFF' : '#64748B'} />
                  <Text style={[
                    styles.typeSelectorText,
                    customerType === 'corporate' && styles.activeTypeSelectorText
                  ]}>
                    Kurumsal
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                {customerType === 'corporate' ? 'Firma Adı' : 'Ad Soyad'} *
              </Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder={customerType === 'corporate' ? 'ABC Ltd. Şti.' : 'Ahmet Yılmaz'}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>E-posta</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="ornek@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Telefon</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="0555 123 45 67"
                keyboardType="phone-pad"
              />
            </View>

            {customerType === 'corporate' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Vergi Numarası *</Text>
                <TextInput
                  style={styles.input}
                  value={taxNumber}
                  onChangeText={setTaxNumber}
                  placeholder="1234567890"
                  keyboardType="numeric"
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Şehir</Text>
              <TouchableOpacity
                style={styles.citySelector}
                onPress={() => setCitySelectorVisible(true)}
              >
                <Text style={[
                  styles.citySelectorText,
                  !selectedCityName && styles.placeholder
                ]}>
                  {selectedCityName || 'Şehir Seçin'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Adres</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={address}
                onChangeText={setAddress}
                placeholder="Tam adres bilgisi"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notlar</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Müşteri hakkında notlar"
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* OCR Scanner */}
      <OCRScanner
        visible={ocrScannerVisible}
        onClose={() => setOcrScannerVisible(false)}
        onDataExtracted={handleOCRDataExtracted}
      />

      {/* City Selector Modal */}
      <CitySelector
        visible={citySelectorVisible}
        selectedCityId={selectedCityId}
        onSelect={handleCitySelect}
        onClose={() => setCitySelectorVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  ocrButton: {
    backgroundColor: '#059669',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButton: {
    backgroundColor: '#1E40AF',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersContainer: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    color: '#1F2937',
  },
  typeFilters: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  activeFilter: {
    backgroundColor: '#1E40AF',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeFilterText: {
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  customerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  customerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  corporateBadge: {
    backgroundColor: '#FEE2E2',
  },
  individualBadge: {
    backgroundColor: '#DCFCE7',
  },
  typeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  corporateText: {
    color: '#DC2626',
  },
  individualText: {
    color: '#059669',
  },
  customerDetails: {
    gap: 6,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#374151',
  },
  customerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
  statusContainer: {
    flexDirection: 'row',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeBadge: {
    backgroundColor: '#DCFCE7',
  },
  inactiveBadge: {
    backgroundColor: '#FEE2E2',
  },
  activeText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '500',
  },
  inactiveText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  noPermissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  noPermissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  noPermissionText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748B',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  cancelButton: {
    fontSize: 16,
    color: '#64748B',
  },
  saveButton: {
    fontSize: 16,
    color: '#1E40AF',
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  typeSelectorButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    gap: 8,
  },
  activeTypeButton: {
    backgroundColor: '#1E40AF',
    borderColor: '#1E40AF',
  },
  typeSelectorText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
  },
  activeTypeSelectorText: {
    color: '#FFFFFF',
  },
  citySelector: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  citySelectorText: {
    fontSize: 16,
    color: '#1F2937',
  },
  placeholder: {
    color: '#9CA3AF',
  },
});