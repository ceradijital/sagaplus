import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Shield, ArrowLeft, Package, Receipt, Trash2, Plus, Minus, Star, TriangleAlert } from 'lucide-react-native';

interface PackageProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  is_required: boolean; // Bu alan varsayılan paketi belirlemek için kullanılacak
  is_active: boolean;
}

interface SelectedPackageProduct extends PackageProduct {
  quantity: number;
}

const VAT_RATE = 0.20;

export default function KaleAlarmXScreen() {
  const router = useRouter();
  const [packageProducts, setPackageProducts] = useState<PackageProduct[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<SelectedPackageProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [kaleAlarmXId, setKaleAlarmXId] = useState('');

  useEffect(() => {
    fetchKaleAlarmXPackage();
  }, []);

  const fetchKaleAlarmXPackage = async () => {
    try {
      setLoading(true);
      
      let { data: packageData, error: packageError } = await supabase
        .from('packages')
        .select('*')
        .eq('name', 'Kale Alarm X')
        .single();

      if (packageError && packageError.code === 'PGRST116') {
        const { data: newPackage, error: createError } = await supabase
          .from('packages')
          .insert({
            name: 'Kale Alarm X',
            description: 'Premium güvenlik sistemi paketi',
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating Kale Alarm X package:', createError);
          return;
        }
        packageData = newPackage;
      }

      if (packageData) {
        setKaleAlarmXId(packageData.id);
        fetchPackageProducts(packageData.id);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPackageProducts = async (packageId: string) => {
    try {
      const { data, error } = await supabase
        .from('package_products')
        .select('*')
        .eq('package_id', packageId)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching package products:', error);
        return;
      }
      
      const allProducts = data || [];
      setPackageProducts(allProducts);

      const defaultProducts = allProducts
        .filter(p => p.is_required)
        .map(p => ({ ...p, quantity: 1 }));
      
      setSelectedProducts(defaultProducts);

    } catch (error) {
      console.error('Error:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (kaleAlarmXId) {
      await fetchKaleAlarmXPackage();
    }
    setRefreshing(false);
  };

  const addProduct = (product: PackageProduct) => {
    const existingIndex = selectedProducts.findIndex(sp => sp.id === product.id);
    if (existingIndex !== -1) {
      const updated = [...selectedProducts];
      updated[existingIndex].quantity += 1;
      setSelectedProducts(updated);
    } else {
      setSelectedProducts(prev => [...prev, { ...product, quantity: 1 }]);
    }
  };

  const removeProduct = (productId: string) => {
    setSelectedProducts(prev => prev.filter(sp => sp.id !== productId));
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeProduct(productId);
      return;
    }
    setSelectedProducts(prev =>
      prev.map(sp =>
        sp.id === productId ? { ...sp, quantity: newQuantity } : sp
      )
    );
  };

  const calculateTotals = () => {
    const subtotal = selectedProducts.reduce((sum, product) =>
      sum + (product.price * product.quantity), 0
    );
    const vatAmount = subtotal * VAT_RATE;
    const total = subtotal + vatAmount;
    return { subtotal, vatAmount, total };
  };

  const clearAll = () => {
    setSelectedProducts([]);
  };

  const { subtotal, vatAmount, total } = calculateTotals();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Shield size={64} color="#1E293B" />
          <ActivityIndicator size="large" color="#1E293B" style={styles.loadingSpinner} />
          <Text style={styles.loadingText}>Kale Alarm X Yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1E293B" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.titleRow}>
            <Shield size={28} color="#DC2626" />
            <Text style={styles.title}>Kale Alarm X</Text>
          </View>
          <Text style={styles.subtitle}>Premium Güvenlik Paketi</Text>
        </View>
        {selectedProducts.length > 0 ? (
          <TouchableOpacity style={styles.clearAllButton} onPress={clearAll}>
            <Trash2 size={20} color="#DC2626" />
          </TouchableOpacity>
        ) : <View style={{width: 44}} />}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.noteSection}>
          <View style={styles.noteHeader}>
            <TriangleAlert size={20} color="#B91C1C" />
            <Text style={styles.noteTitle}>Personel İçin Önemli Not</Text>
          </View>
          <View style={styles.noteContent}>
            <Text style={styles.noteText}>
              Kale Alarm X paketinde Keypad, Dahili Siren ürünleri zorunlu değildir. Hesaplama sırasında bu ürünleri ekleme, çıkarma işlemi yapabilirsiniz. 
              Sistemde 1 adet PIR ve 1 adet MK ya da 2 adet PIR kullanmak zorunludur.
            </Text>
          </View>
        </View>

        <View style={styles.productsSection}>
          <View style={styles.sectionHeader}>
            <Package size={24} color="#1E293B" />
            <Text style={styles.sectionTitle}>Paket Ürünleri</Text>
          </View>
          {packageProducts.length === 0 ? (
            <View style={styles.emptyState}>
              <Package size={64} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>Henüz paket ürünü yok</Text>
              <Text style={styles.emptyDescription}>
                Ürün Yönetimi bölümünden Kale Alarm X ürünlerini ekleyin
              </Text>
            </View>
          ) : (
            <View style={styles.productsGrid}>
              {packageProducts.map((product) => {
                const selectedProduct = selectedProducts.find(sp => sp.id === product.id);
                const isSelected = !!selectedProduct;
                return (
                  <View key={product.id} style={[styles.productCard, isSelected && styles.selectedProductCard]}>
                    <View style={styles.productHeader}>
                      <View style={styles.productIcon}><Shield size={20} color="#DC2626" /></View>
                      <View style={styles.productInfo}>
                        <View style={styles.productNameRow}>
                           <Text style={styles.productName}>{product.name}</Text>
                           {product.is_required && <View style={styles.requiredBadge}><Text style={styles.requiredText}>VARSAYILAN</Text></View>}
                        </View>
                        {product.description && <Text style={styles.productDescription}>{product.description}</Text>}
                        <Text style={styles.productPrice}>₺{product.price.toLocaleString('tr-TR')} / adet</Text>
                      </View>
                      {isSelected && (
                        <View style={styles.quantityContainer}>
                          <TouchableOpacity style={styles.quantityButton} onPress={() => updateQuantity(product.id, selectedProduct.quantity - 1)}><Minus size={16} color="#DC2626" /></TouchableOpacity>
                          <Text style={styles.quantityText}>{selectedProduct.quantity}</Text>
                          <TouchableOpacity style={styles.quantityButton} onPress={() => updateQuantity(product.id, selectedProduct.quantity + 1)}><Plus size={16} color="#DC2626" /></TouchableOpacity>
                        </View>
                      )}
                    </View>
                    {!isSelected && (
                      <TouchableOpacity style={styles.addButton} onPress={() => addProduct(product)}>
                        <Plus size={16} color="#FFFFFF" />
                        <Text style={styles.addButtonText}>Pakete Ekle</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {selectedProducts.length > 0 && (
          <View style={styles.selectedSection}>
            <Text style={styles.selectedTitle}>Seçilen Ürünler</Text>
            {selectedProducts.map((product) => (
              <View key={product.id} style={styles.selectedProductRow}>
                <View style={styles.selectedProductInfo}>
                   <View style={styles.productNameRow}>
                     <Text style={styles.selectedProductName}>{product.name}</Text>
                      {product.is_required && <View style={styles.requiredBadgeMini}><Text style={styles.requiredTextMini}>V</Text></View>}
                   </View>
                  <Text style={styles.selectedProductPrice}>₺{product.price.toLocaleString('tr-TR')} x {product.quantity}</Text>
                </View>
                 <TouchableOpacity style={styles.deleteButton} onPress={() => removeProduct(product.id)}>
                    <Trash2 size={20} color={'#DC2626'} />
                 </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {selectedProducts.length > 0 && (
        <View style={styles.calculationFooter}>
          <View style={styles.calculationCard}>
            <View style={styles.calculationHeader}>
              <Receipt size={24} color="#1E293B" />
              <Text style={styles.calculationTitle}>Toplam Maliyet</Text>
            </View>
            <View style={styles.calculationRows}>
              <View style={styles.calculationRow}>
                <Text style={styles.calculationLabel}>KDV Hariç:</Text>
                <Text style={styles.calculationValue}>₺{subtotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</Text>
              </View>
              <View style={styles.calculationRow}>
                <Text style={styles.calculationLabel}>KDV (%20):</Text>
                <Text style={styles.calculationValue}>₺{vatAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Aylık Toplam:</Text>
                <Text style={styles.totalValue}>₺{total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</Text>
              </View>
            </View>
            <View style={styles.annualContainer}>
              <Star size={16} color="#F59E0B" />
              <Text style={styles.annualText}>Yıllık: ₺{(total * 12).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</Text>
            </View>
          </View>
        </View>
      )}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E293B',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  clearAllButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  noteSection: {
    backgroundColor: '#FEF2F2',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FCA5A5'
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FCA5A5',
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#B91C1C',
  },
  noteContent: {
    padding: 16,
  },
  noteText: {
    fontSize: 14,
    color: '#B91C1C',
    lineHeight: 20,
  },
  productsSection: {
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
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
  productsGrid: {
    gap: 12,
  },
  productCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedProductCard: {
    backgroundColor: '#FEF7F7',
    borderColor: '#DC2626',
    borderWidth: 2,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  productIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  productNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  requiredBadge: {
    backgroundColor: '#6B7280',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  requiredText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  requiredBadgeMini: {
    backgroundColor: '#6B7280',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  requiredTextMini: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  productDescription: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 4,
    lineHeight: 18,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    minWidth: 24,
    textAlign: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  selectedSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 12,
  },
  selectedProductRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  selectedProductInfo: {
    flex: 1,
  },
  selectedProductName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1E293B',
    marginBottom: 2,
  },
  selectedProductPrice: {
    fontSize: 12,
    color: '#64748B',
  },
  selectedProductTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#059669',
  },
  deleteButton: {
    padding: 8,
  },
  calculationFooter: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  calculationCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  calculationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  calculationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
  },
  calculationRows: {
    gap: 8,
    marginBottom: 16,
  },
  calculationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  calculationLabel: {
    fontSize: 14,
    color: '#64748B',
  },
  calculationValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#DC2626',
  },
  annualContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  annualText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingSpinner: {
    marginVertical: 8,
  },
  loadingText: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '600',
  },
});

