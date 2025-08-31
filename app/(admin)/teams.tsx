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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { usePermissions } from '@/hooks/usePermissions';
import { CitySelector } from '@/components/CitySelector';
import { Plus, CreditCard as Edit, Trash2, Shield, MapPin, User, X } from 'lucide-react-native';

interface Team {
  id: string;
  name: string;
  city_id: string | null;
  manager_id: string | null;
  is_active: boolean;
  cities?: {
    name: string;
  } | null;
  managers?: {
    full_name: string | null;
    email: string;
  } | null;
  _count?: {
    staff: number;
  };
}

interface City {
  id: string;
  name: string;
}

interface Manager {
  id: string;
  full_name: string | null;
  email: string;
}

export default function TeamsScreen() {
  const { hasPermission } = usePermissions();
  const [teams, setTeams] = useState<Team[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [managers, setManagers] = useState<Manager[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamName, setTeamName] = useState('');
  const [selectedCityId, setSelectedCityId] = useState('');
  const [selectedCityName, setSelectedCityName] = useState('');
  const [selectedManagerId, setSelectedManagerId] = useState('');
  const [citySelectorVisible, setCitySelectorVisible] = useState(false);
  const [managerSelectorVisible, setManagerSelectorVisible] = useState(false);
  const [selectedManagerName, setSelectedManagerName] = useState('');

  useEffect(() => {
    if (hasPermission('admin.teams.manage')) {
      fetchData();
    }
  }, [hasPermission]);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchTeams(),
        fetchCities(),
        fetchManagers(),
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select(`
          *,
          cities (name),
          managers:profiles!teams_manager_id_fkey (full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching teams:', error);
        return;
      }

      setTeams(data || []);
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

  const fetchManagers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .order('full_name');

      if (error) {
        console.error('Error fetching managers:', error);
        return;
      }

      setManagers(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleCreateTeam = () => {
    setSelectedTeam(null);
    setTeamName('');
    setSelectedCityId('');
    setSelectedCityName('');
    setSelectedManagerId('');
    setSelectedManagerName('');
    setModalVisible(true);
  };

  const handleEditTeam = (team: Team) => {
    setSelectedTeam(team);
    setTeamName(team.name);
    setSelectedCityId(team.city_id || '');
    setSelectedCityName(team.cities?.name || '');
    setSelectedManagerId(team.manager_id || '');
    setSelectedManagerName(team.managers?.full_name || team.managers?.email || '');
    setModalVisible(true);
  };

  const handleSaveTeam = async () => {
    if (!teamName.trim()) {
      Alert.alert('Hata', 'Ekip adı gereklidir.');
      return;
    }

    if (!selectedCityId) {
      Alert.alert('Hata', 'Şehir seçimi gereklidir.');
      return;
    }

    try {
      if (selectedTeam) {
        // Update existing team
        const { error } = await supabase
          .from('teams')
          .update({
            name: teamName.trim(),
            city_id: selectedCityId,
            manager_id: selectedManagerId || null,
          })
          .eq('id', selectedTeam.id);

        if (error) {
          Alert.alert('Hata', 'Ekip güncellenemedi.');
          return;
        }
      } else {
        // Create new team
        const { error } = await supabase
          .from('teams')
          .insert({
            name: teamName.trim(),
            city_id: selectedCityId,
            manager_id: selectedManagerId || null,
          });

        if (error) {
          Alert.alert('Hata', 'Ekip oluşturulamadı.');
          return;
        }
      }

      setModalVisible(false);
      fetchTeams();
    } catch (error) {
      Alert.alert('Hata', 'Bir hata oluştu.');
    }
  };

  const handleDeleteTeam = (team: Team) => {
    Alert.alert(
      'Ekip Sil',
      `"${team.name}" ekibini silmek istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('teams')
              .delete()
              .eq('id', team.id);

            if (error) {
              Alert.alert('Hata', 'Ekip silinemedi.');
              return;
            }

            fetchTeams();
          },
        },
      ]
    );
  };

  const handleCitySelect = (cityId: string) => {
    setSelectedCityId(cityId);
    const selectedCity = cities.find(c => c.id === cityId);
    setSelectedCityName(selectedCity?.name || '');
  };

  const handleManagerSelect = (managerId: string) => {
    setSelectedManagerId(managerId);
    const selectedManager = managers.find(m => m.id === managerId);
    setSelectedManagerName(selectedManager?.full_name || selectedManager?.email || '');
  };

  if (!hasPermission('admin.teams.manage')) {
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
        <Text style={styles.title}>Ekip Yönetimi</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleCreateTeam}>
          <Plus size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {teams.map((team) => (
          <View key={team.id} style={styles.teamCard}>
            <View style={styles.teamHeader}>
              <View style={styles.teamInfo}>
                <Text style={styles.teamName}>{team.name}</Text>
                <View style={styles.teamDetails}>
                  {team.cities && (
                    <View style={styles.detailItem}>
                      <MapPin size={14} color="#64748B" />
                      <Text style={styles.detailText}>{team.cities.name}</Text>
                    </View>
                  )}
                  {team.managers && (
                    <View style={styles.detailItem}>
                      <User size={14} color="#64748B" />
                      <Text style={styles.detailText}>
                        {team.managers.full_name || team.managers.email}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.teamActions}>
                <TouchableOpacity
                  style={styles.editButton}
                  onPress={() => handleEditTeam(team)}
                >
                  <Edit size={18} color="#1E40AF" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteTeam(team)}
                >
                  <Trash2 size={18} color="#DC2626" />
                </TouchableOpacity>
              </View>
            </View>
            
            <View style={styles.statusContainer}>
              <View style={[styles.statusBadge, team.is_active ? styles.activeBadge : styles.inactiveBadge]}>
                <Text style={team.is_active ? styles.activeText : styles.inactiveText}>
                  {team.is_active ? 'Aktif' : 'Pasif'}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Create/Edit Team Modal */}
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
              {selectedTeam ? 'Ekip Düzenle' : 'Yeni Ekip'}
            </Text>
            <TouchableOpacity onPress={handleSaveTeam}>
              <Text style={styles.saveButton}>Kaydet</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ekip Adı</Text>
              <TextInput
                style={styles.input}
                value={teamName}
                onChangeText={setTeamName}
                placeholder="Ekip adını girin"
              />
            </View>

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
              <Text style={styles.label}>Yönetici</Text>
              <TouchableOpacity
                style={styles.managerSelector}
                onPress={() => setManagerSelectorVisible(true)}
              >
                <Text style={[
                  styles.managerSelectorText,
                  !selectedManagerName && styles.placeholder
                ]}>
                  {selectedManagerName || 'Yönetici Seçin (Opsiyonel)'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* City Selector Modal */}
      <CitySelector
        visible={citySelectorVisible}
        selectedCityId={selectedCityId}
        onSelect={handleCitySelect}
        onClose={() => setCitySelectorVisible(false)}
      />

      {/* Manager Selector Modal */}
      <Modal
        visible={managerSelectorVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.managerModalContainer}>
          <View style={styles.managerModalHeader}>
            <Text style={styles.managerModalTitle}>Yönetici Seçin</Text>
            <TouchableOpacity onPress={() => setManagerSelectorVisible(false)}>
              <X size={24} color="#64748B" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.managersList}>
            <TouchableOpacity
              style={[
                styles.managerItem,
                !selectedManagerId && styles.selectedManagerItem
              ]}
              onPress={() => {
                handleManagerSelect('');
                setManagerSelectorVisible(false);
              }}
            >
              <Text style={[
                styles.managerItemName,
                !selectedManagerId && styles.selectedManagerName
              ]}>
                Yönetici Yok
              </Text>
            </TouchableOpacity>
            
            {managers.map((manager) => (
              <TouchableOpacity
                key={manager.id}
                style={[
                  styles.managerItem,
                  selectedManagerId === manager.id && styles.selectedManagerItem
                ]}
                onPress={() => {
                  handleManagerSelect(manager.id);
                  setManagerSelectorVisible(false);
                }}
              >
                <View style={styles.managerItemContent}>
                  <Text style={[
                    styles.managerItemName,
                    selectedManagerId === manager.id && styles.selectedManagerName
                  ]}>
                    {manager.full_name || 'İsimsiz'}
                  </Text>
                  <Text style={styles.managerItemEmail}>
                    {manager.email}
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
  teamCard: {
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
  teamHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  teamDetails: {
    gap: 6,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: '#64748B',
  },
  teamActions: {
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
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  picker: {
    height: 50,
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
  managerSelector: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
  },
  managerSelectorText: {
    fontSize: 16,
    color: '#1F2937',
  },
  managerModalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  managerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  managerModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  managersList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  managerItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedManagerItem: {
    backgroundColor: '#EFF6FF',
    borderColor: '#1E40AF',
  },
  managerItemContent: {
    flex: 1,
  },
  managerItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  selectedManagerName: {
    color: '#1E40AF',
  },
  managerItemEmail: {
    fontSize: 12,
    color: '#64748B',
  },
  infoBox: {
    backgroundColor: '#EFF6FF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
});