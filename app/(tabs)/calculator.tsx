import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Calculator as CalculatorIcon, Package, Plus, Wifi, Cable, Trash2, Receipt, Shield, TriangleAlert as AlertTriangle, X } from 'lucide-react-native';

// Represents the actual data structure in the 'products' table
interface ProductFromDB {
  id: string;
  name: string;
  description: string | null;
  type: 'main_package' | 'additional_product';
  wired_price: number;
  wireless_price: number;
  is_active: boolean;
}

// Represents the "virtual" product structure for selected items
interface Product {
  id: string; // This will be a composite key like 'uuid-wired'
  name: string;
  description: string | null;
  type: 'main_package' | 'additional_product';
  connection_type: 'wired' | 'wireless';
  monthly_price: number;
  is_active: boolean;
}

// Interface for a product that has been selected by the user, including quantity
interface SelectedProduct extends Product {
  quantity: number;
}

// Interface for package products
interface PackageProduct {
  id: string;
  package_id: string;
  name: string;
  description: string | null;
  price: number;
  is_required: boolean;
  is_active: boolean;
}

// Interface for selected package products  
interface SelectedPackageProduct extends PackageProduct {
  quantity: number;
}

type FilterType = 'all' | 'main_package' | 'additional_product';

const filters = [
  { key: 'all', label: 'Tümü', icon: Package, color: '#64748B' },
  { key: 'main_package', label: 'Ana Paket', icon: Package, color: '#1E40AF' },
  { key: 'additional_product', label: 'İlave Ürün', icon: Plus, color: '#D97706' },
];

export default function CalculatorScreen() {
  const [dbProducts, setDbProducts] = useState<ProductFromDB[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [packageProducts, setPackageProducts] = useState<PackageProduct[]>([]);
  const [selectedPackageProducts, setSelectedPackageProducts] = useState<SelectedPackageProduct[]>([]);
  const [kaleAlarmXId, setKaleAlarmXId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [isSelectionModalVisible, setSelectionModalVisible] = useState(false);
  const [productForSelection, setProductForSelection] = useState<ProductFromDB | null>(null);

  const VAT_RATE = 0.20;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('type', { ascending: false })
        .order('name', { ascending: true });

      if (productsError) {
        console.error('Error fetching products:', productsError);
        return;
      }
      setDbProducts(productsData || []);
      
      const { data: packageData, error: packageError } = await supabase
        .from('packages')
        .select('id')
        .eq('name', 'Kale Alarm X')
        .eq('is_active', true)
        .single();
        
      if (packageError) {
        console.error('Error fetching package:', packageError);
      }
      
      if (packageData) {
        setKaleAlarmXId(packageData.id);
        const { data: packageProductsData, error: packageProductsError } = await supabase
          .from('package_products')
          .select('*')
          .eq('package_id', packageData.id)
          .eq('is_active', true)
          .order('is_required', { ascending: false })
          .order('name', { ascending: true });
          
        if (packageProductsError) {
          console.error('Error fetching package products:', packageProductsError);
        } else {
          setPackageProducts(packageProductsData || []);
        }
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const addProduct = (product: Product) => {
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
    setSelectedProducts(prev => prev.map(sp => (sp.id === productId ? { ...sp, quantity: newQuantity } : sp)));
  };
  
  const handleProductPress = (product: ProductFromDB) => {
    setProductForSelection(product);
    setSelectionModalVisible(true);
  };

  const handleConnectionTypeSelect = (connectionType: 'wired' | 'wireless') => {
    if (!productForSelection) return;

    const productToAdd: Product = {
      id: `${productForSelection.id}-${connectionType}`,
      name: productForSelection.name,
      description: productForSelection.description,
      type: productForSelection.type,
      connection_type: connectionType,
      monthly_price: connectionType === 'wired' ? productForSelection.wired_price : productForSelection.wireless_price,
      is_active: productForSelection.is_active,
    };
    
    addProduct(productToAdd);
    setSelectionModalVisible(false);
    setProductForSelection(null);
  };

  const calculateTotals = () => {
    const subtotal = selectedProducts.reduce((sum, product) => sum + (product.monthly_price * product.quantity), 0);
    const packageSubtotal = selectedPackageProducts.reduce((sum, product) => sum + (product.price * product.quantity), 0);
    const totalSubtotal = subtotal + packageSubtotal;
    const vatAmount = totalSubtotal * VAT_RATE;
    const total = totalSubtotal + vatAmount;
    return { subtotal: totalSubtotal, vatAmount, total, regularSubtotal: subtotal, packageSubtotal };
  };

  const clearAll = () => setSelectedProducts([]);

  const getMissingRequiredProducts = () => {
    const requiredProducts = packageProducts.filter(p => p.is_required);
    const selectedProductIds = selectedPackageProducts.map(sp => sp.id);
    return requiredProducts.filter(rp => !selectedProductIds.includes(rp.id));
  };

  const missingRequired = getMissingRequiredProducts();
  const getTypeText = (type: string) => (type === 'main_package' ? 'Ana Paket' : 'İlave Ürün');
  const getConnectionText = (type: string) => (type === 'wired' ? 'Kablolu' : 'Kablosuz');
  
  const { subtotal, vatAmount, total, regularSubtotal, packageSubtotal } = calculateTotals();

  const filteredProducts = dbProducts.filter(product => {
    if (activeFilter === 'all') return true;
    return product.type === activeFilter;
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1E40AF" />
          <Text style={styles.loadingText}>Hesaplayıcı yükleniyor...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <CalculatorIcon size={32} color="#1F2937" />
          <View>
            <Text style={styles.title}>Paket Hesaplayıcı</Text>
            <Text style={styles.subtitle}>Ürün seçin ve toplam maliyeti görün</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.promoSection}>
            <TouchableOpacity style={styles.kaleAlarmButton} onPress={() => router.push('/kale-alarm-x')}>
                <Shield size={24} color="#DC2626" />
                <View style={styles.promoTextContainer}>
                    <Text style={styles.kaleAlarmButtonTitle}>Kale Alarm X</Text>
                    <Text style={styles.kaleAlarmButtonSubtitle}>Premium güvenlik paketinizi oluşturun</Text>
                </View>
            </TouchableOpacity>
        </View>

        <View style={styles.filtersContainer}>
          <Text style={styles.filtersTitle}>Kategoriler</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filtersRow}>
              {filters.map((filter) => {
                const IconComponent = filter.icon;
                const isActive = activeFilter === filter.key;
                return (
                  <TouchableOpacity key={filter.key} style={[styles.filterButton, isActive && { backgroundColor: filter.color, borderColor: filter.color }]} onPress={() => setActiveFilter(filter.key as FilterType)}>
                    <IconComponent size={16} color={isActive ? '#FFFFFF' : filter.color} />
                    <Text style={[styles.filterText, { color: isActive ? '#FFFFFF' : filter.color }]}>{filter.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        <View style={styles.productsContainer}>
          <Text style={styles.productsTitle}>Ürünler ({filteredProducts.length})</Text>
          <View style={styles.productsGrid}>
            {filteredProducts.map((product) => (
              <TouchableOpacity key={product.id} style={styles.productCard} onPress={() => handleProductPress(product)}>
                <View style={styles.productHeader}>
                  <View style={[styles.productIcon, { backgroundColor: product.type === 'main_package' ? '#DBEAFE' : '#FEF3C7' }]}>
                    <Package size={20} color={product.type === 'main_package' ? '#1E40AF' : '#D97706'} />
                  </View>
                  <View style={[styles.typeBadge, product.type === 'main_package' ? styles.mainPackageBadge : styles.additionalBadge]}>
                    <Text style={[styles.typeText, product.type === 'main_package' ? styles.mainPackageText : styles.additionalText]}>{getTypeText(product.type)}</Text>
                  </View>
                </View>
                <Text style={styles.productName}>{product.name}</Text>
                {product.description && <Text style={styles.productDescription}>{product.description}</Text>}
                <View style={styles.priceInfoContainer}>
                  <View style={styles.priceItem}><Cable size={14} color="#059669" /><Text style={styles.priceItemText}>₺{product.wired_price.toLocaleString('tr-TR')}</Text></View>
                  <View style={styles.priceItem}><Wifi size={14} color="#7C3AED" /><Text style={styles.priceItemText}>₺{product.wireless_price.toLocaleString('tr-TR')}</Text></View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        {selectedProducts.length > 0 && (
          <View style={styles.selectedContainer}>
            <View style={styles.selectedHeader}>
              <Text style={styles.selectedTitle}>Seçilen Ürünler</Text>
              <TouchableOpacity style={styles.clearButton} onPress={clearAll}><Trash2 size={16} color="#DC2626" /><Text style={styles.clearText}>Temizle</Text></TouchableOpacity>
            </View>
            {selectedProducts.map((product) => (
              <View key={product.id} style={styles.selectedProductCard}>
                <View style={styles.selectedProductInfo}>
                  <Text style={styles.selectedProductName}>{product.name} ({getConnectionText(product.connection_type)})</Text>
                  <Text style={styles.selectedProductPrice}>₺{product.monthly_price.toLocaleString('tr-TR')} /ay</Text>
                </View>
                <View style={styles.quantityContainer}>
                  <TouchableOpacity style={styles.quantityButton} onPress={() => updateQuantity(product.id, product.quantity - 1)}><Text style={styles.quantityButtonText}>-</Text></TouchableOpacity>
                  <Text style={styles.quantityText}>{product.quantity}</Text>
                  <TouchableOpacity style={styles.quantityButton} onPress={() => updateQuantity(product.id, product.quantity + 1)}><Text style={styles.quantityButtonText}>+</Text></TouchableOpacity>
                </View>
                <TouchableOpacity style={styles.removeButton} onPress={() => removeProduct(product.id)}><Trash2 size={16} color="#DC2626" /></TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {(selectedProducts.length > 0) && (
        <View style={styles.calculationContainer}>
          <View style={styles.calculationHeader}><Receipt size={24} color="#1E40AF" /><Text style={styles.calculationTitle}>Aylık Maliyet Özeti</Text></View>
          <View style={styles.calculationRows}>
            <View style={styles.calculationRow}><Text style={styles.calculationLabel}>KDV Hariç Tutar:</Text><Text style={styles.calculationValue}>₺{subtotal.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</Text></View>
            <View style={styles.calculationRow}><Text style={styles.calculationLabel}>KDV (%20):</Text><Text style={styles.calculationValue}>₺{vatAmount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</Text></View>
            <View style={[styles.calculationRow, styles.totalRow]}><Text style={styles.totalLabel}>Toplam Aylık Tutar:</Text><Text style={styles.totalValue}>₺{total.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</Text></View>
          </View>
          <View style={styles.annualInfo}><Text style={styles.currencyIcon}>₺</Text><Text style={styles.annualText}>Yıllık: ₺{(total * 12).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</Text></View>
        </View>
      )}

      <Modal animationType="slide" transparent={true} visible={isSelectionModalVisible} onRequestClose={() => { setSelectionModalVisible(false); setProductForSelection(null); }}>
        <View style={styles.modalOverlay}>
            <View style={styles.modalView}>
                <Text style={styles.modalTitle}>{productForSelection?.name}</Text>
                <Text style={styles.modalSubtitle}>Bağlantı tipini seçin</Text>
                <TouchableOpacity style={styles.modalOption} onPress={() => handleConnectionTypeSelect('wired')}>
                    <View style={styles.modalIconContainer}><Cable size={24} color="#059669" /></View>
                    <View style={styles.modalTextContainer}><Text style={styles.modalOptionTitle}>Kablolu</Text><Text style={styles.modalOptionPrice}>₺{productForSelection?.wired_price.toLocaleString('tr-TR', {minimumFractionDigits: 2})} /ay</Text></View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalOption} onPress={() => handleConnectionTypeSelect('wireless')}>
                    <View style={styles.modalIconContainer}><Wifi size={24} color="#7C3AED" /></View>
                    <View style={styles.modalTextContainer}><Text style={styles.modalOptionTitle}>Kablosuz</Text><Text style={styles.modalOptionPrice}>₺{productForSelection?.wireless_price.toLocaleString('tr-TR', {minimumFractionDigits: 2})} /ay</Text></View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalCloseButton} onPress={() => setSelectionModalVisible(false)}><Text style={styles.modalCloseText}>İptal</Text></TouchableOpacity>
            </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { fontSize: 24, fontWeight: '700', color: '#1F2937' },
  subtitle: { fontSize: 14, color: '#64748B', marginTop: 2 },
  content: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  loadingText: { fontSize: 16, color: '#64748B' },
  promoSection: { paddingHorizontal: 20, paddingTop: 20 },
  kaleAlarmButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#FCA5A5', gap: 12 },
  promoTextContainer: { flex: 1 },
  kaleAlarmButtonTitle: { fontSize: 16, fontWeight: '700', color: '#DC2626' },
  kaleAlarmButtonSubtitle: { fontSize: 14, color: '#B91C1C' },
  filtersContainer: { padding: 20, paddingBottom: 12 },
  filtersTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 12 },
  filtersRow: { flexDirection: 'row', gap: 8 },
  filterButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#D1D5DB', gap: 6 },
  filterText: { fontSize: 14, fontWeight: '500' },
  productsContainer: { paddingHorizontal: 20 },
  productsTitle: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 12 },
  productsGrid: { gap: 12 },
  productCard: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2, borderWidth: 1, borderColor: '#F1F5F9' },
  productHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  productIcon: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  typeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  mainPackageBadge: { backgroundColor: '#DBEAFE' },
  additionalBadge: { backgroundColor: '#FEF3C7' },
  typeText: { fontSize: 10, fontWeight: '600' },
  mainPackageText: { color: '#1E40AF' },
  additionalText: { color: '#D97706' },
  productName: { fontSize: 16, fontWeight: '600', color: '#1F2937', marginBottom: 4 },
  productDescription: { fontSize: 14, color: '#64748B', marginBottom: 12, lineHeight: 20 },
  priceInfoContainer: { flexDirection: 'row', gap: 16, marginTop: 'auto', paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  priceItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  priceItemText: { fontSize: 14, fontWeight: '600', color: '#4B5563' },
  selectedContainer: { margin: 20, backgroundColor: '#FFFFFF', borderRadius: 12, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  selectedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  selectedTitle: { fontSize: 16, fontWeight: '600', color: '#374151' },
  clearButton: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4 },
  clearText: { fontSize: 14, color: '#DC2626', fontWeight: '500' },
  selectedProductCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  selectedProductInfo: { flex: 1 },
  selectedProductName: { fontSize: 14, fontWeight: '500', color: '#1F2937', marginBottom: 2 },
  selectedProductPrice: { fontSize: 12, color: '#059669', fontWeight: '500' },
  quantityContainer: { flexDirection: 'row', alignItems: 'center', gap: 12, marginRight: 12 },
  quantityButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#F1F5F9', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#D1D5DB' },
  quantityButtonText: { fontSize: 16, fontWeight: '600', color: '#374151' },
  quantityText: { fontSize: 16, fontWeight: '600', color: '#1F2937', minWidth: 20, textAlign: 'center' },
  removeButton: { padding: 4 },
  calculationContainer: { backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#D1D5DB', paddingHorizontal: 20, paddingVertical: 20, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 5 },
  calculationHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  calculationTitle: { fontSize: 18, fontWeight: '700', color: '#374151' },
  calculationRows: { gap: 12, marginBottom: 16 },
  calculationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  calculationLabel: { fontSize: 14, color: '#6B7280' },
  calculationValue: { fontSize: 16, fontWeight: '600', color: '#374151' },
  totalRow: { paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#374151' },
  totalValue: { fontSize: 20, fontWeight: '700', color: '#059669' },
  currencyIcon: { fontSize: 16, fontWeight: '700', color: '#059669' },
  annualInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  annualText: { fontSize: 14, color: '#059669', fontWeight: '500' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0, 0, 0, 0.5)' },
  modalView: { backgroundColor: 'white', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.25, shadowRadius: 4, elevation: 5 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1F2937', textAlign: 'center', marginBottom: 4 },
  modalSubtitle: { fontSize: 16, color: '#64748B', textAlign: 'center', marginBottom: 24 },
  modalOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 16, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  modalIconContainer: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF', marginRight: 16 },
  modalTextContainer: { flex: 1 },
  modalOptionTitle: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
  modalOptionPrice: { fontSize: 14, color: '#059669', fontWeight: '500' },
  modalCloseButton: { marginTop: 12, padding: 16, borderRadius: 12 },
  modalCloseText: { fontSize: 16, fontWeight: '600', color: '#64748B', textAlign: 'center' },
});

