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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { usePermissions } from '@/hooks/usePermissions';
import { Plus, CreditCard as Edit, Trash2, Shield, ChevronDown, ChevronRight } from 'lucide-react-native';

interface Role {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
}

interface Permission {
  id: string;
  name: string;
  code: string;
  category: string;
  description: string | null;
}

interface RolePermission {
  role_id: string;
  permission_id: string;
}

export default function RolesScreen() {
  const { hasPermission } = usePermissions();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  useEffect(() => {
    if (hasPermission('admin.roles.manage')) {
      fetchData();
    }
  }, [hasPermission]);

  const fetchData = async () => {
    try {
      await Promise.all([
        fetchRoles(),
        fetchPermissions(),
        fetchRolePermissions(),
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching roles:', error);
        return;
      }

      setRoles(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchPermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('permissions')
        .select('*')
        .order('category', { ascending: true });

      if (error) {
        console.error('Error fetching permissions:', error);
        return;
      }

      setPermissions(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const fetchRolePermissions = async () => {
    try {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('role_id, permission_id');

      if (error) {
        console.error('Error fetching role permissions:', error);
        return;
      }

      setRolePermissions(data || []);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleCreateRole = () => {
    setSelectedRole(null);
    setRoleName('');
    setRoleDescription('');
    setSelectedPermissions([]);
    setExpandedCategories([]);
    setModalVisible(true);
  };

  const handleEditRole = async (role: Role) => {
    setSelectedRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description || '');
    
    // Fetch current permissions for this role
    const currentPermissions = rolePermissions
      .filter(rp => rp.role_id === role.id)
      .map(rp => rp.permission_id);
    
    setSelectedPermissions(currentPermissions);
    
    // Expand all categories for easier viewing
    const categories = [...new Set(permissions.map(p => p.category))];
    setExpandedCategories(categories);
    
    setModalVisible(true);
  };

  const [saving, setSaving] = useState(false);

  const handleSaveRole = async () => {
    if (!roleName.trim()) {
      Alert.alert('Hata', 'Rol adı gereklidir.');
      return;
    }

    try {
      setSaving(true);
      let roleId: string;

      if (selectedRole) {
        // Update existing role
        const { error } = await supabase
          .from('roles')
          .update({
            name: roleName.trim(),
            description: roleDescription.trim() || null,
          })
          .eq('id', selectedRole.id);

        if (error) {
          console.error('Role update error:', error);
          Alert.alert('Hata', 'Rol güncellenemedi.');
          return;
        }
        roleId = selectedRole.id;
      } else {
        // Create new role
        const { data, error } = await supabase
          .from('roles')
          .insert({
            name: roleName.trim(),
            description: roleDescription.trim() || null,
          })
          .select('id')
          .single();

        if (error) {
          console.error('Role creation error:', error);
          Alert.alert('Hata', 'Rol oluşturulamadı.');
          return;
        }
        roleId = data.id;
      }

      // Permission güncelleme işlemi
      const currentPermissions = rolePermissions
        .filter(rp => rp.role_id === roleId)
        .map(rp => rp.permission_id);
      
      const toAdd = selectedPermissions.filter(p => !currentPermissions.includes(p));
      const toRemove = currentPermissions.filter(p => !selectedPermissions.includes(p));
      
      console.log('Current permissions:', currentPermissions);
      console.log('Selected permissions:', selectedPermissions);
      console.log('To add:', toAdd);
      console.log('To remove:', toRemove);
      
      // Önce yeni permissions ekle
      if (toAdd.length > 0) {
        const newRolePermissions = toAdd.map(permissionId => ({
          role_id: roleId,
          permission_id: permissionId,
        }));

        console.log('Adding permissions:', newRolePermissions);
        
        const { data: addedData, error: addError } = await supabase
          .from('role_permissions')
          .insert(newRolePermissions)
          .select();

        if (addError) {
          console.error('Error adding permissions:', addError);
          Alert.alert('Hata', 'Yeni yetkiler eklenemedi.');
          return;
        }
        
        console.log('Successfully added:', addedData);
      }
      
      // Sonra gereksiz permissions sil
      if (toRemove.length > 0) {
        console.log('Removing permissions:', toRemove);
        
        const { data: removedData, error: removeError } = await supabase
          .from('role_permissions')
          .delete()
          .eq('role_id', roleId)
          .in('permission_id', toRemove)
          .select();

        if (removeError) {
          console.error('Error removing permissions:', removeError);
          Alert.alert('Uyarı', 'Bazı eski yetkiler kaldırılamadı.');
        } else {
          console.log('Successfully removed:', removedData);
        }
      }

      // Refresh data
      await Promise.all([
        fetchRoles(),
        fetchRolePermissions(),
      ]);
      
      setModalVisible(false);
      Alert.alert(
        'Başarılı', 
        selectedRole ? 'Rol ve yetkiler güncellendi.' : 'Yeni rol ve yetkiler oluşturuldu.'
      );
    } catch (error: any) {
      console.error('Save role error:', error);
      Alert.alert('Hata', 'Rol kaydetme hatası: ' + (error.message || 'Bilinmeyen hata'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = (role: Role) => {
    Alert.alert(
      'Rol Sil',
      `"${role.name}" rolünü silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('roles')
              .delete()
              .eq('id', role.id);

            if (error) {
              Alert.alert('Hata', 'Rol silinemedi.');
              return;
            }

            fetchData();
          },
        },
      ]
    );
  };

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  const getRolePermissionCount = (roleId: string) => {
    return rolePermissions.filter(rp => rp.role_id === roleId).length;
  };

  // Group permissions by category
  const permissionsByCategory = permissions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  if (!hasPermission('admin.roles.manage')) {
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
        <Text style={styles.title}>Rol Yönetimi</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleCreateRole}>
          <Plus size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {roles.map((role) => {
          const permissionCount = getRolePermissionCount(role.id);
          return (
            <View key={role.id} style={styles.roleCard}>
              <View style={styles.roleHeader}>
                <View style={styles.roleInfo}>
                  <Text style={styles.roleName}>{role.name}</Text>
                  {role.description && (
                    <Text style={styles.roleDescription}>{role.description}</Text>
                  )}
                  <Text style={styles.permissionCount}>
                    {permissionCount} yetki atanmış
                  </Text>
                </View>
                <View style={styles.roleActions}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => handleEditRole(role)}
                  >
                    <Edit size={18} color="#1E40AF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteRole(role)}
                  >
                    <Trash2 size={18} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.statusContainer}>
                <View style={[styles.statusBadge, role.is_active ? styles.activeBadge : styles.inactiveBadge]}>
                  <Text style={role.is_active ? styles.activeText : styles.inactiveText}>
                    {role.is_active ? 'Aktif' : 'Pasif'}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Create/Edit Role Modal */}
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
              {selectedRole ? 'Rol Düzenle' : 'Yeni Rol'}
            </Text>
            <TouchableOpacity onPress={handleSaveRole} disabled={saving}>
              <Text style={[styles.saveButton, saving && styles.buttonDisabled]}>
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Rol Adı</Text>
              <TextInput
                style={styles.input}
                value={roleName}
                onChangeText={setRoleName}
                placeholder="Rol adını girin"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Açıklama</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={roleDescription}
                onChangeText={setRoleDescription}
                placeholder="Rol açıklamasını girin"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.permissionsSection}>
              <Text style={styles.label}>Yetkiler</Text>
              <Text style={styles.permissionsHelp}>
                Bu rolün hangi sayfalara erişebileceğini ve hangi işlemleri yapabileceğini seçin
              </Text>
              
              {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => (
                <View key={category} style={styles.categoryContainer}>
                  <TouchableOpacity
                    style={styles.categoryHeader}
                    onPress={() => toggleCategory(category)}
                  >
                    {expandedCategories.includes(category) ? (
                      <ChevronDown size={20} color="#1E40AF" />
                    ) : (
                      <ChevronRight size={20} color="#1E40AF" />
                    )}
                    <Text style={styles.categoryTitle}>{category}</Text>
                    <View style={styles.categoryBadge}>
                      <Text style={styles.categoryBadgeText}>
                        {categoryPermissions.filter(p => selectedPermissions.includes(p.id)).length}/{categoryPermissions.length}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  
                  {expandedCategories.includes(category) && (
                    <View style={styles.permissionsList}>
                      {categoryPermissions.map((permission) => (
                        <View key={permission.id} style={styles.permissionItem}>
                          <View style={styles.permissionInfo}>
                            <Text style={styles.permissionName}>{permission.name}</Text>
                            {permission.description && (
                              <Text style={styles.permissionDesc}>{permission.description}</Text>
                            )}
                            <Text style={styles.permissionCode}>{permission.code}</Text>
                          </View>
                          <Switch
                            value={selectedPermissions.includes(permission.id)}
                            onValueChange={() => togglePermission(permission.id)}
                            trackColor={{ false: '#D1D5DB', true: '#1E40AF' }}
                            thumbColor={selectedPermissions.includes(permission.id) ? '#FFFFFF' : '#FFFFFF'}
                          />
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
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
  roleCard: {
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
  roleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  roleInfo: {
    flex: 1,
  },
  roleName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  permissionCount: {
    fontSize: 12,
    color: '#059669',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  roleActions: {
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
  permissionsSection: {
    marginBottom: 20,
  },
  permissionsHelp: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 20,
  },
  categoryContainer: {
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
    marginLeft: 8,
  },
  categoryBadge: {
    backgroundColor: '#1E40AF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  permissionsList: {
    padding: 8,
  },
  permissionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  permissionInfo: {
    flex: 1,
    marginRight: 12,
  },
  permissionName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  permissionDesc: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  permissionCode: {
    fontSize: 11,
    color: '#9CA3AF',
    fontFamily: 'monospace',
  },
});