import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { Search, X, MapPin } from 'lucide-react-native';

interface City {
  id: string;
  name: string;
  code: string;
}

interface CitySelectorProps {
  visible: boolean;
  selectedCityId: string;
  onSelect: (cityId: string) => void;
  onClose: () => void;
}

export function CitySelector({ visible, selectedCityId, onSelect, onClose }: CitySelectorProps) {
  const [cities, setCities] = useState<City[]>([]);
  const [filteredCities, setFilteredCities] = useState<City[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCity, setSelectedCity] = useState<City | null>(null);

  useEffect(() => {
    if (visible) {
      fetchCities();
    }
  }, [visible]);

  useEffect(() => {
    if (selectedCityId && cities.length > 0) {
      const city = cities.find(c => c.id === selectedCityId);
      setSelectedCity(city || null);
    }
  }, [selectedCityId, cities]);

  useEffect(() => {
    if (searchText.trim()) {
      const filtered = cities.filter(city =>
        city.name.toLowerCase().includes(searchText.toLowerCase()) ||
        city.code.includes(searchText)
      );
      setFilteredCities(filtered);
    } else {
      setFilteredCities(cities);
    }
  }, [searchText, cities]);

  const fetchCities = async () => {
    try {
      setLoading(true);
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
      setFilteredCities(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCity = (city: City) => {
    setSelectedCity(city);
    onSelect(city.id);
    onClose();
  };

  const handleClose = () => {
    setSearchText('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Şehir Seçin</Text>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <X size={24} color="#64748B" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <Search size={20} color="#64748B" />
          <TextInput
            style={styles.searchInput}
            value={searchText}
            onChangeText={setSearchText}
            placeholder="Şehir ara... (örn: İstanbul, 34)"
            autoCapitalize="none"
          />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#1E40AF" />
          </View>
        ) : (
          <ScrollView style={styles.citiesList}>
            {filteredCities.map((city) => (
              <TouchableOpacity
                key={city.id}
                style={[
                  styles.cityItem,
                  selectedCity?.id === city.id && styles.selectedCityItem
                ]}
                onPress={() => handleSelectCity(city)}
              >
                <MapPin 
                  size={20} 
                  color={selectedCity?.id === city.id ? "#1E40AF" : "#64748B"} 
                />
                <View style={styles.cityInfo}>
                  <Text style={[
                    styles.cityName,
                    selectedCity?.id === city.id && styles.selectedCityName
                  ]}>
                    {city.name}
                  </Text>
                  <Text style={styles.cityCode}>Plaka: {city.code}</Text>
                </View>
              </TouchableOpacity>
            ))}
            
            {filteredCities.length === 0 && !loading && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  "{searchText}" için şehir bulunamadı
                </Text>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
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
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    color: '#1F2937',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  citiesList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  cityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedCityItem: {
    backgroundColor: '#EFF6FF',
    borderColor: '#1E40AF',
  },
  cityInfo: {
    flex: 1,
    marginLeft: 12,
  },
  cityName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  selectedCityName: {
    color: '#1E40AF',
  },
  cityCode: {
    fontSize: 12,
    color: '#64748B',
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
  },
});