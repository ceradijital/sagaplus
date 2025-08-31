import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="roles" />
      <Stack.Screen name="staff" />
      <Stack.Screen name="teams" />
      <Stack.Screen name="products" />
    </Stack>
  );
}