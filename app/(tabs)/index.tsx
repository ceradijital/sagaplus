import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/lib/supabase';
import { router } from 'expo-router';
import { Users, ShoppingCart, ChartBar as BarChart3, Shield, Settings, Plus, TrendingUp } from 'lucide-react-native';

interface Profile {
  id: string;
  full_name: string | null;
  email: string;
  roles?: {
    name: string;
  } | null;
}

export default function HomeScreen() {
  const { session } = useAuth();
  const { permissions, hasPermission } = usePermissions();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (session?.user) {
      fetchProfile();
    }
  }, [session]);

  const fetchProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          *,
          roles (name)
        `)
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

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProfile();
    setRefreshing(false);
  };

  const menuItems = [
    {
      title: 'Müşteriler',
      description: 'Müşteri listesi ve işlemleri',
      icon: Users,
      color: '#059669',
      permission: 'sales.customers.view',
      route: '/customers',
    },
    {
      title: 'Siparişler',
      description: 'Sipariş yönetimi',
      icon: ShoppingCart,
      color: '#DC2626',
      permission: 'orders.view',
      route: '/orders',
    },
    {
      title: 'Personel',
      description: 'Personel yönetimi',
      icon: Users,
      color: '#059669',
      permission: 'staff.view',
      route: '/staff',
    },
    {
      title: 'Rol Yönetimi',
      description: 'Kullanıcı rolleri ve yetkileri',
      icon: Shield,
      color: '#EA580C',
      permission: 'admin.roles.manage',
      route: '/roles',
    },
  ];

  const availableMenuItems = menuItems.filter(item => hasPermission(item.permission));

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.welcomeText}>Hoş Geldiniz</Text>
            <Text style={styles.nameText}>
              {profile?.full_name || profile?.email || 'Kullanıcı'}
            </Text>
            {profile?.roles && (
              <Text style={styles.roleText}>{profile.roles.name}</Text>
            )}
          </View>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => router.push('/add-quick')}
          >
            <Plus size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <TrendingUp size={24} color="#059669" />
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Toplam Satış</Text>
          </View>
          <View style={styles.statCard}>
            <Users size={24} color="#1E40AF" />
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Müşteriler</Text>
          </View>
          <View style={styles.statCard}>
            <ShoppingCart size={24} color="#DC2626" />
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Siparişler</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View style={styles.menuContainer}>
          <Text style={styles.sectionTitle}>Menü</Text>
          {availableMenuItems.map((item, index) => {
            const IconComponent = item.icon;
            return (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={() => router.push(item.route as any)}
              >
                <View style={[styles.menuIconContainer, { backgroundColor: `${item.color}15` }]}>
                  <IconComponent size={24} color={item.color} />
                </View>
                <View style={styles.menuContent}>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuDescription}>{item.description}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  welcomeText: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 4,
  },
  nameText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E40AF',
    marginBottom: 4,
  },
  roleText: {
    fontSize: 14,
    color: '#059669',
    fontWeight: '500',
  },
  addButton: {
    backgroundColor: '#1E40AF',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginVertical: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  menuContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  menuItem: {
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
  menuIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  menuDescription: {
    fontSize: 14,
    color: '#64748B',
  },
});