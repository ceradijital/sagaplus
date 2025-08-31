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
import { 
  Plus, 
  CreditCard as Edit, 
  Trash2, 
  Shield, 
  Package, 
  Wifi, 
  Cable,
  DollarSign
} from 'lucide-react-native';

interface Product {
  id: string;
  name: string;
  description: string | null;
  type: 'main_package' | 'additional_product';
  connection_type: 'wired' | 'wireless';
  monthly_price: number;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export default function ProductsScreen() {
  const { hasPermission, loading: permissionsLoading } = usePermissions();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [productType, setProductType] = useState<'main_package' | 'additional_product'>('main_package');
  const [connectionType, setConnectionType] = useState<'wired' | 'wireless'>('wired');
  const [monthlyPrice, setMonthlyPrice] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!permissionsLoading && hasPermission('admin.products.manage')) {
      fetchProducts();
    }
  }, [permissionsLoading, hasPermission]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching products:', error);
        return;
      }

      setProducts(data || []);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchProducts();
    setRefreshing(false);
  };

  const handleCreateProduct = () => {
    setSelectedProduct(null);
    resetForm();
    setModalVisible(true);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setName(product.name);
    setDescription(product.description || '');
    setProductType(product.type);
    setConnectionType(product.connection_type);
    setMonthlyPrice(formatPrice(product.monthly_price.toString()));
    setModalVisible(true);
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setProductType('main_package');
    setConnectionType('wired');
    setMonthlyPrice('');
  };

  const formatPrice = (value: string): string => {
    // Remove all non-numeric characters except comma and dot
    const numericValue = value.replace(/[^\d,.]/g, '');
    
    // Convert to number for formatting
    const number = parseFloat(numericValue.replace(',', '.'));
    
    if (isNaN(number)) return '';
    
    // Format as Turkish currency (without currency symbol for input)
    return new Intl.NumberFormat('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(number);
  };

  const handlePriceChange = (value: string) => {
    setMonthlyPrice(formatPrice(value));
  };

  const parsePrice = (formattedPrice: string): number => {
    // Convert formatted price back to number
    const cleanValue = formattedPrice.replace(/\./g, '').replace(',', '.');
    return parseFloat(cleanValue) || 0;
  };

  const handleSaveProduct = async () => {
    if (!name.trim()) {
      Alert.alert('Hata', 'Ürün adı gereklidir.');
      return;
    }

    const price = parsePrice(monthlyPrice);
    if (price <= 0) {
      Alert.alert('Hata', 'Geçerli bir aylık fiyat girin.');
      return;
    }

    try {
      setSaving(true);

      const productData = {
        name: name.trim(),
        description: description.trim() || null,
        type: productType,
        connection_type: connectionType,
        monthly_price: price,
      };

      if (selectedProduct) {
        // Update existing product
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', selectedProduct.id);

        if (error) {
          Alert.alert('Hata', 'Ürün güncellenemedi: ' + error.message);
          return;
        }
      } else {
        // Create new product
        const { error } = await supabase
          .from('products')
          .insert(productData);

        if (error) {
          Alert.alert('Hata', 'Ürün oluşturulamadı: ' + error.message);
          return;
        }
      }

      setModalVisible(false);
      fetchProducts();
      Alert.alert('Başarılı', selectedProduct ? 'Ürün güncellendi.' : 'Yeni ürün eklendi.');
    } catch (error: any) {
      Alert.alert('Hata', error.message || 'Bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = (product: Product) => {
    Alert.alert(
      'Ürün Sil',
      `"${product.name}" ürününü silmek istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('products')
              .delete()
              .eq('id', product.id);

            if (error) {
              Alert.alert('Hata', 'Ürün silinemedi.');
              return;
            }

            fetchProducts();
          },
        },
      ]
    );
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'main_package': return 'Ana Paket';
      case 'additional_product': return 'İlave Ürün';
      default: return type;
    }
  };

  const getConnectionText = (connectionType: string) => {
    switch (connectionType) {
      case 'wired': return 'Kablolu';
      case 'wireless': return 'Kablosuz';
      default: return connectionType;
    }
  };

  if (!hasPermission('admin.products.manage')) {
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
          <Text style={styles.loadingText}>Ürünler yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Ürün Yönetimi</Text>
        <TouchableOpacity style={styles.addButton} onPress={handleCreateProduct}>
          <Plus size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {products.length === 0 ? (
          <View style={styles.emptyState}>
            <Package size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Henüz ürün yok</Text>
            <Text style={styles.emptyDescription}>
              Yeni ürün eklemek için + butonuna dokunun
            </Text>
          </View>
        ) : (
          products.map((product) => (
            <View key={product.id} style={styles.productCard}>
              <View style={styles.productHeader}>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{product.name}</Text>
                  {product.description && (
                    <Text style={styles.productDescription}>{product.description}</Text>
                  )}
                  
                  <View style={styles.productMeta}>
                    <View style={styles.metaRow}>
                      <View style={[
                        styles.typeBadge,
                        product.type === 'main_package' ? styles.mainPackageBadge : styles.additionalBadge
                      ]}>
                        <Text style={[
                          styles.typeText,
                          product.type === 'main_package' ? styles.mainPackageText : styles.additionalText
                        ]}>
                          {getTypeText(product.type)}
                        </Text>
                      </View>
                      
                      <View style={styles.connectionBadge}>
                        {product.connection_type === 'wireless' ? (
                          <Wifi size={12} color="#059669" />
                        ) : (
                          <Cable size={12} color="#DC2626" />
                        )}
                        <Text style={styles.connectionText}>
                          {getConnectionText(product.connection_type)}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={styles.priceContainer}>
                      <DollarSign size={16} color="#059669" />
                      <Text style={styles.priceText}>
                        ₺{product.monthly_price.toLocaleString('tr-TR')} / ay
                      </Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.productActions}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => handleEditProduct(product)}
                  >
                    <Edit size={18} color="#1E40AF" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteProduct(product)}
                  >
                    <Trash2 size={18} color="#DC2626" />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.statusContainer}>
                <View style={[
                  styles.statusBadge, 
                  product.is_active ? styles.activeBadge : styles.inactiveBadge
                ]}>
                  <Text style={product.is_active ? styles.activeText : styles.inactiveText}>
                    {product.is_active ? 'Aktif' : 'Pasif'}
                  </Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Create/Edit Product Modal */}
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
              {selectedProduct ? 'Ürün Düzenle' : 'Yeni Ürün'}
            </Text>
            <TouchableOpacity onPress={handleSaveProduct} disabled={saving}>
              <Text style={[styles.saveButton, saving && styles.buttonDisabled]}>
                {saving ? 'Kaydediliyor...' : 'Kaydet'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ürün Adı *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Ürün adını girin"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Açıklama</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Ürün açıklaması"
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ürün Tipi</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeSelectorButton,
                    productType === 'main_package' && styles.activeTypeButton
                  ]}
                  onPress={() => setProductType('main_package')}
                >
                  <Package size={16} color={productType === 'main_package' ? '#FFFFFF' : '#64748B'} />
                  <Text style={[
                    styles.typeSelectorText,
                    productType === 'main_package' && styles.activeTypeSelectorText
                  ]}>
                    Ana Paket
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.typeSelectorButton,
                    productType === 'additional_product' && styles.activeTypeButton
                  ]}
                  onPress={() => setProductType('additional_product')}
                >
                  <Plus size={16} color={productType === 'additional_product' ? '#FFFFFF' : '#64748B'} />
                  <Text style={[
                    styles.typeSelectorText,
                    productType === 'additional_product' && styles.activeTypeSelectorText
                  ]}>
                    İlave Ürün
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Bağlantı Tipi</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeSelectorButton,
                    connectionType === 'wired' && styles.activeTypeButton
                  ]}
                  onPress={() => setConnectionType('wired')}
                >
                  <Cable size={16} color={connectionType === 'wired' ? '#FFFFFF' : '#64748B'} />
                  <Text style={[
                    styles.typeSelectorText,
                    connectionType === 'wired' && styles.activeTypeSelectorText
                  ]}>
                    Kablolu
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.typeSelectorButton,
                    connectionType === 'wireless' && styles.activeTypeButton
                  ]}
                  onPress={() => setConnectionType('wireless')}
                >
                  <Wifi size={16} color={connectionType === 'wireless' ? '#FFFFFF' : '#64748B'} />
                  <Text style={[
                    styles.typeSelectorText,
                    connectionType === 'wireless' && styles.activeTypeSelectorText
                  ]}>
                    Kablosuz
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Aylık Fiyat *</Text>
              <View style={styles.priceInputContainer}>
                <Text style={styles.currencySymbol}>₺</Text>
                <TextInput
                  style={styles.priceInput}
                  value={monthlyPrice}
                  onChangeText={handlePriceChange}
                  placeholder="0,00"
                  keyboardType="numeric"
                />
              </View>
              <Text style={styles.helperText}>Örnek: 149,90</Text>
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
  productCard: {
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
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  productDescription: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
    lineHeight: 20,
  },
  productMeta: {
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  mainPackageBadge: {
    backgroundColor: '#DBEAFE',
  },
  additionalBadge: {
    backgroundColor: '#FEF3C7',
  },
  typeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  mainPackageText: {
    color: '#1E40AF',
  },
  additionalText: {
    color: '#D97706',
  },
  connectionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
  },
  connectionText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  priceText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
  },
  productActions: {
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
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#F0FDF4',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  priceInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: '#1F2937',
  },
  helperText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
});