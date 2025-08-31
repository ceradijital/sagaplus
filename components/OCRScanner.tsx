import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import TextRecognition from '@react-native-ml-kit/text-recognition';
import { X, Camera, RotateCcw, Check } from 'lucide-react-native';

interface ExtractedData {
  name: string;
  phone: string;
  email: string;
  address: string;
  company?: string;
}

interface OCRScannerProps {
  visible: boolean;
  onClose: () => void;
  onDataExtracted: (data: ExtractedData) => void;
}

export function OCRScanner({ visible, onClose, onDataExtracted }: OCRScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [processing, setProcessing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const extractBusinessCardInfo = (text: string): ExtractedData => {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let name = '';
    let phone = '';
    let email = '';
    let address = '';
    let company = '';

    // Email pattern
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    
    // Phone patterns (Turkish formats)
    const phoneRegex = /(\+90|0)?[\s\-\.]?(\(?5\d{2}\)?[\s\-\.]?\d{3}[\s\-\.]?\d{2}[\s\-\.]?\d{2}|\(?2\d{2}\)?[\s\-\.]?\d{3}[\s\-\.]?\d{2}[\s\-\.]?\d{2}|\(?3\d{2}\)?[\s\-\.]?\d{3}[\s\-\.]?\d{2}[\s\-\.]?\d{2}|\(?4\d{2}\)?[\s\-\.]?\d{3}[\s\-\.]?\d{2}[\s\-\.]?\d{2})/g;
    
    // Website pattern (to distinguish from email)
    const websiteRegex = /www\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    
    // Turkish title patterns (to identify names)
    const titleRegex = /^(Dr|Doç|Prof|Mühendis|Avukat|Doktor|Bay|Bayan|Mr|Mrs|Ms)\.?\s+/i;

    for (const line of lines) {
      const cleanLine = line.trim();
      
      // Extract email
      const emailMatch = cleanLine.match(emailRegex);
      if (emailMatch && !websiteRegex.test(cleanLine)) {
        email = emailMatch[0];
        continue;
      }

      // Extract phone
      const phoneMatch = cleanLine.match(phoneRegex);
      if (phoneMatch) {
        phone = phoneMatch[0].replace(/[\s\-\.]/g, ' ').trim();
        continue;
      }

      // Skip websites and URLs
      if (websiteRegex.test(cleanLine) || cleanLine.includes('http')) {
        continue;
      }

      // Extract name (usually first non-company line or line with title)
      if (!name && (titleRegex.test(cleanLine) || 
          (cleanLine.length > 3 && cleanLine.length < 50 && 
           /^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/.test(cleanLine) &&
           !cleanLine.toLowerCase().includes('ltd') &&
           !cleanLine.toLowerCase().includes('san') &&
           !cleanLine.toLowerCase().includes('tic') &&
           !cleanLine.toLowerCase().includes('inc') &&
           !cleanLine.toLowerCase().includes('co')))) {
        name = cleanLine.replace(titleRegex, '');
        continue;
      }

      // Extract company (lines with business indicators)
      if (!company && (
          cleanLine.toLowerCase().includes('ltd') ||
          cleanLine.toLowerCase().includes('san') ||
          cleanLine.toLowerCase().includes('tic') ||
          cleanLine.toLowerCase().includes('inc') ||
          cleanLine.toLowerCase().includes('co') ||
          cleanLine.toLowerCase().includes('şti') ||
          cleanLine.toLowerCase().includes('a.ş')
        )) {
        company = cleanLine;
        continue;
      }

      // Extract address (longer text lines)
      if (!address && cleanLine.length > 20 && 
          !emailMatch && !phoneMatch && 
          !titleRegex.test(cleanLine)) {
        address = cleanLine;
      }
    }

    return {
      name: name || company || '',
      phone: phone,
      email: email,
      address: address,
      company: company
    };
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;

    try {
      setProcessing(true);

      // Take photo
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      if (!photo) {
        Alert.alert('Hata', 'Fotoğraf çekilemedi');
        return;
      }

      // Resize image for better OCR performance
      const resizedImage = await manipulateAsync(
        photo.uri,
        [{ resize: { width: 1000 } }], // Resize for optimal OCR
        { compress: 0.8, format: SaveFormat.JPEG, base64: true }
      );

      // Perform OCR
      const result = await TextRecognition.recognize(resizedImage.uri);
      
      if (!result.text || result.text.trim().length === 0) {
        Alert.alert('OCR Sonucu', 'Kartvizitte metin algılanamadı. Manuel olarak ekleyin.');
        return;
      }

      console.log('OCR Raw Text:', result.text);

      // Extract structured data from OCR text
      const extractedData = extractBusinessCardInfo(result.text);
      
      console.log('Extracted Data:', extractedData);

      if (!extractedData.name && !extractedData.phone && !extractedData.email) {
        Alert.alert(
          'OCR Sonucu',
          'Kartvizitte yeterli bilgi algılanamadı. Lütfen manuel olarak ekleyin.',
          [
            { text: 'Tamam' }
          ]
        );
        return;
      }

      // Show confirmation with extracted data
      Alert.alert(
        'OCR Sonucu',
        `Algılanan Bilgiler:\n\n${extractedData.name ? `İsim: ${extractedData.name}\n` : ''}${extractedData.phone ? `Telefon: ${extractedData.phone}\n` : ''}${extractedData.email ? `Email: ${extractedData.email}\n` : ''}${extractedData.address ? `Adres: ${extractedData.address}\n` : ''}${extractedData.company ? `Şirket: ${extractedData.company}\n` : ''}\n\nBu bilgileri kullanarak müşteri eklensin mi?`,
        [
          { text: 'İptal', style: 'cancel' },
          {
            text: 'Kullan',
            onPress: () => {
              onDataExtracted(extractedData);
              onClose();
            }
          }
        ]
      );

    } catch (error) {
      console.error('OCR Error:', error);
      Alert.alert('OCR Hatası', 'Metin algılama işleminde hata oluştu. Manuel olarak ekleyin.');
    } finally {
      setProcessing(false);
    }
  };

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
        <View style={styles.permissionContainer}>
          <View style={styles.permissionContent}>
            <Camera size={64} color="#64748B" />
            <Text style={styles.permissionTitle}>Kamera İzni Gerekli</Text>
            <Text style={styles.permissionText}>
              Kartvizit taramak için kamera erişimi gereklidir.
            </Text>
            <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
              <Text style={styles.permissionButtonText}>İzin Ver</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>İptal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.title}>Kartvizit Tarayın</Text>
          <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
            <RotateCcw size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Camera View */}
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
          mode="picture"
        >
          {/* OCR Guide Overlay */}
          <View style={styles.overlay}>
            <View style={styles.guideContainer}>
              <View style={styles.guideFrame} />
              <Text style={styles.guideText}>
                Kartviziti çerçeveye yerleştirin
              </Text>
            </View>
          </View>

          {/* Processing Overlay */}
          {processing && (
            <View style={styles.processingOverlay}>
              <ActivityIndicator size="large" color="#FFFFFF" />
              <Text style={styles.processingText}>Kartvizit taranıyor...</Text>
            </View>
          )}
        </CameraView>

        {/* Controls */}
        <View style={styles.controls}>
          <View style={styles.controlsContent}>
            <View style={styles.instructions}>
              <Text style={styles.instructionsTitle}>Nasıl Kullanılır:</Text>
              <Text style={styles.instructionsText}>
                • Kartviziti iyi aydınlatılmış yere koyun{'\n'}
                • Çerçeveye sığdırın{'\n'}
                • Fotoğraf düğmesine basın{'\n'}
                • OCR otomatik olarak metni algılayacak
              </Text>
            </View>
            
            <TouchableOpacity
              style={[styles.captureButton, processing && styles.captureButtonDisabled]}
              onPress={takePicture}
              disabled={processing}
            >
              <View style={styles.captureButtonInner}>
                {processing ? (
                  <ActivityIndicator color="#1E40AF" />
                ) : (
                  <Camera size={32} color="#1E40AF" />
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  flipButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  guideContainer: {
    alignItems: 'center',
  },
  guideFrame: {
    width: 300,
    height: 180,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 20,
  },
  guideText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  controls: {
    backgroundColor: 'rgba(0,0,0,0.9)',
    paddingTop: 20,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  controlsContent: {
    alignItems: 'center',
  },
  instructions: {
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  instructionsTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  instructionsText: {
    color: '#D1D5DB',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonDisabled: {
    opacity: 0.6,
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1E40AF',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionContent: {
    backgroundColor: '#FFFFFF',
    margin: 40,
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#1E40AF',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginBottom: 12,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  cancelButtonText: {
    color: '#64748B',
    fontSize: 16,
  },
});