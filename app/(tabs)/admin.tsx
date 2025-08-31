import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { usePermissions } from '@/hooks/usePermissions';
import { router } from 'expo-router';
import { Shield, Users, UserCheck, Building2 } from 'lucide-react-native';
import { FileText, Package } from 'lucide-react-native';

export default function AdminDashboard() {
  const { hasPermission } = usePermissions();

  const adminItems = [
    {
      title: 'Rol Yönetimi',
      description: 'Kullanıcı rolleri ve yetkileri',
      icon: Shield,
      color: '#7C3AED',
      permission: 'admin.roles.manage',
      route: '/(tabs)/(admin)/roles',
    },
    {
      title: 'Personel Yönetimi',
      description: 'Personel listesi ve işlemleri',
      icon: UserCheck,
      color: '#059669',
      permission: 'admin.staff.manage',
      route: '/(tabs)/(admin)/staff',
    },
    {
      title: 'Ekip Yönetimi',
      description: 'Şehir bazlı ekip yönetimi',
      icon: Building2,
      color: '#DC2626',
      permission: 'admin.teams.manage',
      route: '/(tabs)/(admin)/teams',
    },
    {
      title: 'İK Yönetimi',
      description: 'HR talep onay ve yönetimi',
      icon: FileText,
      color: '#F59E0B',
      permission: 'hr.requests.manage',
      route: '/(tabs)/hr?management=true',
    },
    {
      title: 'Ürün Yönetimi',
      description: 'Ürün ve paket yönetimi',
      icon: Package,
      color: '#7C2D12',
      permission: 'admin.products.manage',
      route: '/(tabs)/(admin)/products',
    },
  ];

  const availableItems = adminItems.filter(item => hasPermission(item.permission));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Yönetim Paneli</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.menuContainer}>
          {availableItems.map((item, index) => {
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

        {availableItems.length === 0 && (
          <View style={styles.noAccessContainer}>
            <Shield size={64} color="#D1D5DB" />
            <Text style={styles.noAccessTitle}>Yönetim Yetkisi Yok</Text>
            <Text style={styles.noAccessText}>
              Bu bölüme erişim yetkiniz bulunmamaktadır.
            </Text>
          </View>
        )}
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
  menuContainer: {
    gap: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
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
  noAccessContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  noAccessTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  noAccessText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
});