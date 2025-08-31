import { Tabs } from 'expo-router';
import { Chrome as Home, Users, Settings, Shield, FileText, Calculator } from 'lucide-react-native';
import { usePermissions } from '@/hooks/usePermissions';

export default function TabLayout() {
  const { hasPermission } = usePermissions();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#1E40AF',
        tabBarInactiveTintColor: '#64748B',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#E5E7EB',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ana Sayfa',
          tabBarIcon: ({ size, color }) => (
            <Home size={size} color={color} />
          ),
        }}
      />
      
      <Tabs.Screen
        name="customers"
        options={{
          title: 'Müşteriler',
          tabBarIcon: ({ size, color }) => (
            <Users size={size} color={color} />
          ),
          href: hasPermission('sales.customers.view') ? '/customers' : null,
        }}
      />

      <Tabs.Screen
        name="hr"
        options={{
          title: 'İK',
          tabBarIcon: ({ size, color }) => (
            <FileText size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="calculator"
        options={{
          title: 'Hesaplayıcı',
          tabBarIcon: ({ size, color }) => (
            <Calculator size={size} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="(admin)"
        options={{
          title: 'Yönetim',
          tabBarIcon: ({ size, color }) => (
            <Shield size={size} color={color} />
          ),
          href: hasPermission('admin.roles.manage') || hasPermission('admin.staff.manage') || hasPermission('admin.teams.manage') || hasPermission('admin.products.manage') ? '/(admin)' : null,
        }}
      />

      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ayarlar',
          tabBarIcon: ({ size, color }) => (
            <Settings size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}