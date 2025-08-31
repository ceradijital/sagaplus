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
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { usePermissions } from '@/hooks/usePermissions';
import { CitySelector } from '@/components/CitySelector';
import { Plus, CreditCard as Edit, Trash2, Shield, Phone, Calendar, MapPin, Users, X } from 'lucide-react-native';

interface Staff {
  id: string;
  profile_id: string;
  employee_code: string;
  phone: string | null;
  hire_date: string | null;
  team_id: string | null;
  is_active: boolean;
  notes: string | null;
  profiles: {
    full_name: string | null;
    email: string;
    role_id: string | null;
    roles?: {
      name: string;
    } | null;
  };
  teams?: {
    name: string;
    cities?: {
      name: string;
    };
  } | null;
}

interface City {
  id: string;
  name: string;
  code: string;
}

interface Team {
  id: string;
  name: string;
  city_id: string;
  cities?: {
    name: string;
  };
}

interface Role {
  id: string;
  name: string;
  description: string | null;
}

export default function StaffScreen() {
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  
  // Form states
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedRoleId, setSelectedRoleId] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [teamSelectorVisible, setTeamSelectorVisible] = useState(false);
  const [selectedTeamName, setSelectedTeamName] = useState('');
  const [roleSelectorVisible, setRoleSelectorVisible] = useState(false);
  const [selectedRoleName, setSelectedRoleName] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!permissionsLoading && (hasPermission('staff.view') || hasPermission('admin.staff.manage'))) {
      fetchData();
    }
  }, [permissionsLoading, hasPermission]);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchStaff(),
        fetchCities(),
        fetchTeams(),
        fetchRoles(),
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      const { data, error } = await supabase
        .from('staff')
        .select(`
          *,
          profiles (
            full_name, 
            email,
            role_id,
            roles (name)
          ),
          teams (
            name,
            cities (name)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching staff:', error);
        return;
      }

      setStaff(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchCities = async () => {
    try {
      const { data, error } = await supabase
        .from('cities')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching cities:', error);
        return;
      }

      setCities(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select(`
          *,
          cities (name)
        `)
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching teams:', error);
        return;
      }

      setTeams(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) {
        console.error('Error fetching roles:', error);
        return;
      }

      setRoles(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleCreateStaff = () => {
    setSelectedStaff(null);
    setEmail('');
    setFullName('');
    setPhone('');
    setSelectedTeamId('');
    setSelectedTeamName('');
    setSelectedRoleId('');
    setSelectedRoleName('');
    setNotes('');
    setModalVisible(true);
  };

  const handleEditStaff = (staffMember: Staff) => {
    setSelectedStaff(staffMember);
    setEmail(staffMember.profiles.email);
    setFullName(staffMember.profiles.full_name || '');
    setPhone(staffMember.phone || '');
    setSelectedTeamId(staffMember.team_id || '');
    setSelectedTeamName(staffMember.teams?.name || '');
    setSelectedRoleId(staffMember.profiles.role_id || '');
    setSelectedRoleName(staffMember.profiles.roles?.name || '');
    setNotes(staffMember.notes || '');
    setModalVisible(true);
  };

  const handleSaveStaff = async () => {
    if (!email.trim() || !fullName.trim()) {
      Alert.alert('Hata', 'E-posta ve ad soyad gereklidir.');
      return;
    }

    if (!selectedStaff && (!selectedTeamId || !selectedRoleId)) {
      Alert.alert('Hata', 'Ekip ve rol seçimi gereklidir.');
      return;
    }

    try {
      setSaving(true);

      if (selectedStaff) {
        // Update existing staff
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            full_name: fullName.trim(),
            team_id: selectedTeamId || null,
            role_id: selectedRoleId || null,
          })
          .eq('id', selectedStaff.profile_id);

        if (profileError) {
          Alert.alert('Hata', 'Profil güncellenemedi.');
          return;
        }

        const { error: staffError } = await supabase
          .from('staff')
          .update({
            phone: phone.trim() || null,
            team_id: selectedTeamId || null,
            notes: notes.trim() || null,
          })
          .eq('id', selectedStaff.id);

        if (staffError) {
          Alert.alert('Hata', 'Personel güncellenemedi.');
          return;
        }
      } else {
        // Create new staff member
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: email.toLowerCase().trim(),
          password: 'TempPassword123!', // Default password - should be changed on first login
          email_confirm: true,
          user_metadata: {
            full_name: fullName.trim(),
          }
        });

        if (authError) {
          Alert.alert('Hata', 'Kullanıcı oluşturulamadı: ' + authError.message);
          return;
        }

        // Update the newly created profile with team and role info
        const { error: profileUpdateError } = await supabase
          .from('profiles')
          .update({
            team_id: selectedTeamId,
            role_id: selectedRoleId || null,
          })
          .eq('id', authData.user.id);

        if (profileUpdateError) {
          console.error('Profile update error:', profileUpdateError);
        }

        // Staff record is automatically created by trigger, just update additional info
        const { error: staffUpdateError } = await supabase
          .from('staff')
          .update({
            phone: phone.trim() || null,
            team_id: selectedTeamId,
            notes: notes.trim() || null,
          })
          .eq('profile_id', authData.user.id);

        if (staffUpdateError) {
          console.error('Staff update error:', staffUpdateError);
        }
      }

      setModalVisible(false);
      fetchStaff();
      Alert.alert('Başarılı', selectedStaff ? 'Personel güncellendi.' : 'Yeni personel eklendi.');
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStaff = (staffMember: Staff) => {
    Alert.alert(
      'Personel Sil',
      `${staffMember.profiles.full_name || staffMember.profiles.email} personelini silmek istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.auth.admin.deleteUser(staffMember.profile_id);

            if (error) {
              Alert.alert('Hata', 'Personel silinemedi.');
              return;
            }

            fetchStaff();
          },
        },
      ]
    );
  };

  const handleTeamSelect = (teamId: string) => {
    setSelectedTeamId(teamId);
    const selectedTeam = teams.find(t => t.id === teamId);
    setSelectedTeamName(selectedTeam ? `${selectedTeam.name} - ${selectedTeam.cities?.name}` : '');
  };

  const handleRoleSelect = (roleId: string) => {
    setSelectedRoleId(roleId);
    const selectedRole = roles.find(r => r.id === roleId);
    setSelectedRoleName(selectedRole?.name || '');
  };

  if (!hasPermission('staff.view') && !hasPermission('admin.staff.manage')) {
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
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Personel Yönetimi</Text>
        {hasPermission('admin.staff.manage') && (
          <TouchableOpacity style={styles.addButton} onPress={handleCreateStaff}>
            <Plus size={24} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {staff.length === 0 ? (
          <View style={styles.emptyState}>
            <Users size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Henüz personel yok</Text>
            <Text style={styles.emptyDescription}>
              {hasPermission('admin.staff.manage') 
                ? 'Yeni personel eklemek için + butonuna dokunun'
                : 'Personel listesi boş görünüyor'
              }
            </Text>
          </View>
        ) : (
          staff.map((staffMember) => (
            <View key={staffMember.id} style={styles.staffCard}>
              <View style={styles.staffHeader}>
                <View style={styles.staffInfo}>
                  <Text style={styles.staffName}>
                    {staffMember.profiles.full_name || 'İsimsiz'}
                  </Text>
                  <Text style={styles.staffEmail}>{staffMember.profiles.email}</Text>
                  <Text style={styles.staffCode}>#{staffMember.employee_code}</Text>
                  {staffMember.profiles.roles && (
                    <View style={styles.roleBadge}>
                      <Text style={styles.roleText}>{staffMember.profiles.roles.name}</Text>
                    </View>
                  )}
                </View>
                {hasPermission('admin.staff.manage') && (
                  <View style={styles.staffActions}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => handleEditStaff(staffMember)}
                    >
                      <Edit size={18} color="#1E40AF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteStaff(staffMember)}
                    >
                      <Trash2 size={18} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <View style={styles.staffDetails}>
                {staffMember.phone && (
                  <View style={styles.detailItem}>
                    <Phone size={14} color="#64748B" />
                    <Text style={styles.detailText}>{staffMember.phone}</Text>
                  </View>
                )}
                
                {staffMember.teams && (
                  <View style={styles.detailItem}>
                    <MapPin size={14} color="#64748B" />
                    <Text style={styles.detailText}>
                      {staffMember.teams.name} - {staffMember.teams.cities?.name}
                    </Text>
                  </View>
                )}
                
                {staffMember.hire_date && (
                  <View style={styles.detailItem}>
                    <Calendar size={14} color="#64748B" />
                    <Text style={styles.detailText}>
                      {new Date(staffMember.hire_date).toLocaleDateString('tr-TR')}
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.statusContainer}>
                <View style={[
                  styles.statusBadge, 
                  staffMember.is_active ? styles.activeBadge : styles.inactiveBadge
                ]}>
                  <Text style={staffMember.is_active ? styles.activeText : styles.inactiveText}>
                    {staffMember.is_active ? 'Aktif' : 'Pasif'}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Create/Edit Staff Modal */}
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
              {selectedStaff ? 'Personel Düzenle' : 'Yeni Personel'}
            </Text>
            <TouchableOpacity onPress={handleSaveStaff} disabled={saving}>
              <Text style={[styles.saveButton, saving && styles.buttonDisabled]}>
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>E-posta *</Text>
              <TextInput
                style={[styles.input, selectedStaff && styles.inputDisabled]}
                value={email}
                onChangeText={setEmail}
                placeholder="personel@firma.com"
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!selectedStaff}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ad Soyad *</Text>
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Ad Soyadını girin"
                autoCapitalize="words"
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

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Rol *</Text>
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setRoleSelectorVisible(true)}
              >
                <Text style={[
                  styles.selectorText,
                  !selectedRoleName && styles.placeholder
                ]}>
                  {selectedRoleName || 'Rol Seçin'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ekip *</Text>
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setTeamSelectorVisible(true)}
              >
                <Text style={[
                  styles.selectorText,
                  !selectedTeamName && styles.placeholder
                ]}>
                  {selectedTeamName || 'Ekip Seçin'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Notlar</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Ek notlar"
                multiline
                numberOfLines={3}
              />
            </View>

            {!selectedStaff && (
              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  ℹ️ Yeni personelin ilk şifresi "TempPassword123!" olacaktır. 
                  İlk giriş sonrası değiştirmesi önerilir.
                </Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Role Selector Modal */}
      <Modal
        visible={roleSelectorVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.selectorModalContainer}>
          <View style={styles.selectorModalHeader}>
            <Text style={styles.selectorModalTitle}>Rol Seçin</Text>
            <TouchableOpacity onPress={() => setRoleSelectorVisible(false)}>
              <X size={24} color="#64748B" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.selectorList}>
            {roles.map((role) => (
              <TouchableOpacity
                key={role.id}
                style={[
                  styles.selectorItem,
                  selectedRoleId === role.id && styles.selectedSelectorItem
                ]}
                onPress={() => {
                  handleRoleSelect(role.id);
                  setRoleSelectorVisible(false);
                }}
              >
                <View style={styles.selectorItemContent}>
                  <Text style={[
                    styles.selectorItemName,
                    selectedRoleId === role.id && styles.selectedSelectorName
                  ]}>
                    {role.name}
                  </Text>
                  {role.description && (
                    <Text style={styles.selectorItemDesc}>
                      {role.description}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Team Selector Modal */}
      <Modal
        visible={teamSelectorVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.selectorModalContainer}>
          <View style={styles.selectorModalHeader}>
            <Text style={styles.selectorModalTitle}>Ekip Seçin</Text>
            <TouchableOpacity onPress={() => setTeamSelectorVisible(false)}>
              <X size={24} color="#64748B" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.selectorList}>
            {teams.map((team) => (
              <TouchableOpacity
                key={team.id}
                style={[
                  styles.selectorItem,
                  selectedTeamId === team.id && styles.selectedSelectorItem
                ]}
                onPress={() => {
                  handleTeamSelect(team.id);
                  setTeamSelectorVisible(false);
                }}
              >
                <View style={styles.selectorItemContent}>
                  <Text style={[
                    styles.selectorItemName,
                    selectedTeamId === team.id && styles.selectedSelectorName
                  ]}>
                    {team.name}
                  </Text>
                  <Text style={styles.selectorItemDesc}>
                    {team.cities?.name}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
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
  addButton: {
    backgroundColor: '#1E40AF',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  staffCard: {
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
  staffHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  staffEmail: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 2,
  },
  staffCode: {
    fontSize: 12,
    color: '#1E40AF',
    fontWeight: '500',
    marginBottom: 6,
  },
  roleBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  roleText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '500',
  },
  staffActions: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
  staffDetails: {
    marginBottom: 12,
    gap: 8,
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
  inputDisabled: {
    backgroundColor: '#F9FAFB',
    color: '#6B7280',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  selector: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  selectorText: {
    fontSize: 16,
    color: '#1F2937',
  },
  placeholder: {
    color: '#9CA3AF',
  },
  selectorModalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  selectorModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  selectorModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  selectorList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  selectorItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedSelectorItem: {
    backgroundColor: '#EFF6FF',
    borderColor: '#1E40AF',
  },
  selectorItemContent: {
    flex: 1,
  },
  selectorItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  selectedSelectorName: {
    color: '#1E40AF',
  },
  selectorItemDesc: {
    fontSize: 12,
    color: '#64748B',
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
});