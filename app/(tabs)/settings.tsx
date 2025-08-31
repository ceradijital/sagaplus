import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import {
  LogOut,
  User,
  Shield,
  Info,
  Mail,
  Building2,
  MapPin,
  Calendar,
  Badge,
} from 'lucide-react-native';

export default function SettingsScreen() {
  const { session } = useAuth();
  const { permissions } = usePermissions();
  const [profile, setProfile] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (session?.user) {
      fetchProfile();
    }
  }, [session]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(
          `
          *,
          roles (name, description),
          team:teams!profiles_team_id_fkey (
            name,
            cities (name)
          ),
          managed_teams:teams!teams_manager_id_fkey (
            id,
            name
          )
        `
        )
        .eq('id', session?.user?.id)
        .single();

      if (error) {
        console.error('Profile fetch error:', error);
        return;
      }

      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Çıkış Yap',
      'Çıkış yapmak istediğinize emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çıkış Yap',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const settingsItems = [
    {
      title: 'Profil Bilgileri',
      description: 'Kişisel bilgilerinizi görüntüleyin',
      icon: User,
      color: '#1E40AF',
      onPress: () => {},
    },
    {
      title: 'Yetki Bilgileri',
      description: 'Mevcut yetki ve rollerinizi görüntüleyin',
      icon: Shield,
      color: '#059669',
      onPress: () => {},
    },
    {
      title: 'Uygulama Hakkında',
      description: 'Versiyon ve uygulama bilgileri',
      icon: Info,
      color: '#7C3AED',
      onPress: () => {
        Alert.alert('Uygulama Bilgileri', 'Saha Satış Uygulaması v1.0.0');
      },
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ayarlar</Text>
      </View>

      <ScrollView style={styles.content}>
        {/* Profile Header Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatar}>
                <User size={28} color="#FFFFFF" />
              </View>
              <View style={styles.onlineIndicator} />
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>
                {profile?.full_name || 'İsimsiz Kullanıcı'}
              </Text>
              <Text style={styles.profileEmail}>{session?.user?.email}</Text>
              {profile?.roles && (
                <View style={styles.roleBadge}>
                  <Badge size={12} color="#1E40AF" />
                  <Text style={styles.roleText}>{profile.roles.name}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Profile Details */}
          <View style={styles.profileDetails}>
            <Text style={styles.sectionLabel}>Profil Bilgileri</Text>

            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Mail size={16} color="#64748B" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>E-posta</Text>
                  <Text style={styles.detailValue}>{session?.user?.email}</Text>
                </View>
              </View>

              {profile?.team && (
                <View style={styles.detailItem}>
                  <Building2 size={16} color="#64748B" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Ekip</Text>
                    <Text style={styles.detailValue}>{profile.team.name}</Text>
                  </View>
                </View>
              )}

              {profile?.team?.cities && (
                <View style={styles.detailItem}>
                  <MapPin size={16} color="#64748B" />
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Şehir</Text>
                    <Text style={styles.detailValue}>{profile.team.cities.name}</Text>
                  </View>
                </View>
              )}

              <View style={styles.detailItem}>
                <Calendar size={16} color="#64748B" />
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Kayıt Tarihi</Text>
                  <Text style={styles.detailValue}>
                    {new Date(
                      session?.user?.created_at || ''
                    ).toLocaleDateString('tr-TR')}
                  </Text>
                </View>
              </View>
            </View>

            {/* YÖNETİCİ BİLGİSİ İÇİN YENİ EKLENEN BÖLÜM */}
            {profile?.managed_teams && profile.managed_teams.length > 0 && (
              <View style={styles.managerInfoContainer}>
                <Text style={styles.managerInfoTitle}>Yönettiği Ekipler</Text>
                {profile.managed_teams.map((managedTeam: any) => (
                  <View key={managedTeam.id} style={styles.managedTeamItem}>
                    <Shield size={14} color="#059669" />
                    <Text style={styles.managedTeamName}>
                      {managedTeam.name}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {profile?.roles?.description && (
              <View style={styles.roleDescription}>
                <Text style={styles.roleDescText}>
                  {profile.roles.description}
                </Text>
              </View>
            )}

            <View style={styles.permissionsContainer}>
              <Text style={styles.permissionsTitle}>
                Aktif Yetkiler ({permissions.length})
              </Text>
              <Text style={styles.permissionsSubtitle}>
                Bu rol ile erişebildiğiniz sistem bölümleri
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.settingsSection}>
          {settingsItems.map((item, index) => {
            const IconComponent = item.icon;
            return (
              <TouchableOpacity
                key={index}
                style={styles.settingsItem}
                onPress={item.onPress}
              >
                <View
                  style={[
                    styles.settingsIconContainer,
                    { backgroundColor: `${item.color}15` },
                  ]}
                >
                  <IconComponent size={20} color={item.color} />
                </View>
                <View style={styles.settingsContent}>
                  <Text style={styles.settingsTitle}>{item.title}</Text>
                  <Text style={styles.settingsDescription}>
                    {item.description}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color="#DC2626" />
          <Text style={styles.logoutText}>Çıkış Yap</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  profileCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1E40AF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    alignSelf: 'flex-start',
    gap: 6,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1E40AF',
  },
  profileDetails: {
    gap: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailsGrid: {
    gap: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#E5E7EB',
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '600',
  },
  roleDescription: {
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  roleDescText: {
    fontSize: 13,
    color: '#065F46',
    lineHeight: 18,
  },
  permissionsContainer: {
    backgroundColor: '#FFFBEB',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  permissionsTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
  },
  permissionsSubtitle: {
    fontSize: 12,
    color: '#A16207',
    lineHeight: 16,
  },
  settingsSection: {
    marginBottom: 32,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  settingsIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  settingsContent: {
    flex: 1,
  },
  settingsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  settingsDescription: {
    fontSize: 14,
    color: '#64748B',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#DC2626',
  },
  // YENİ EKLENEN STİLLER
  managerInfoContainer: {
    backgroundColor: '#F0FDF4',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
    gap: 8,
  },
  managerInfoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#065F46',
    marginBottom: 4,
  },
  managedTeamItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  managedTeamName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#047857',
  },
});