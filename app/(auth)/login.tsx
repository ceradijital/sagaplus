import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
  StatusBar,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase'; // Make sure you import your Supabase client correctly
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Mail, Lock, Fingerprint, ScanFace, Facebook, Instagram, Linkedin } from 'lucide-react-native';
import * as LocalAuthentication from 'expo-local-authentication';

// Checkbox component
const Checkbox = ({ value, onValueChange, label }: { value: boolean, onValueChange: (value: boolean) => void, label: string }) => (
  <TouchableOpacity style={styles.checkboxContainer} onPress={() => onValueChange(!value)}>
    <View style={[styles.checkbox, value && styles.checkboxChecked]}>
      {value && <Text style={styles.checkboxCheckmark}>✓</Text>}
    </View>
    <Text style={styles.checkboxLabel}>{label}</Text>
  </TouchableOpacity>
);

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [biometricType, setBiometricType] = useState<string | null>(null);
  const [isBiometricAvailable, setIsBiometricAvailable] = useState(false);
  const [autoLoginAttempted, setAutoLoginAttempted] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      await checkBiometricSupport();
      const credentialsFound = await loadSavedCredentials();
      
      if (credentialsFound && !autoLoginAttempted) {
        setAutoLoginAttempted(true);
        handleBiometricAuth(true); // Attempt auto-login
      }
    };
    initialize();
  }, []);

  const checkBiometricSupport = async () => {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (hasHardware && isEnrolled) {
        setIsBiometricAvailable(true);
        const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          setBiometricType('Face ID');
        } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          setBiometricType('Touch ID');
        }
    }
  };

  const loadSavedCredentials = async (): Promise<boolean> => {
    try {
      const savedEmail = await AsyncStorage.getItem('saved_email');
      const savedPassword = await AsyncStorage.getItem('saved_password');
      const shouldRemember = await AsyncStorage.getItem('remember_me');
      
      if (shouldRemember === 'true' && savedEmail && savedPassword) {
        setEmail(savedEmail);
        setPassword(savedPassword);
        setRememberMe(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error loading saved credentials:', error);
      return false;
    }
  };

  const saveCredentials = async (emailToSave: string, passwordToSave: string) => {
    try {
      if (rememberMe) {
        await AsyncStorage.setItem('saved_email', emailToSave);
        await AsyncStorage.setItem('saved_password', passwordToSave);
        await AsyncStorage.setItem('remember_me', 'true');
      } else {
        await AsyncStorage.removeItem('saved_email');
        await AsyncStorage.removeItem('saved_password');
        await AsyncStorage.removeItem('remember_me');
      }
    } catch (error) {
      console.error('Error saving credentials:', error);
    }
  };
  
  const handleLogin = async (emailToLogin?: string, passwordToLogin?: string) => {
    const finalEmail = emailToLogin || email;
    const finalPassword = passwordToLogin || password;
    
    if (!finalEmail || !finalPassword) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: finalEmail.toLowerCase().trim(),
        password: finalPassword,
      });

      if (error) {
        Alert.alert('Login Error', error.message);
        await AsyncStorage.removeItem('saved_email');
        await AsyncStorage.removeItem('saved_password');
        await AsyncStorage.removeItem('remember_me');
        return;
      }

      if (data.session) {
        await saveCredentials(finalEmail, finalPassword);
        router.replace('/(tabs)'); // Page to redirect to on successful login
      }
      
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricAuth = async (isAutoAttempt = false) => {
    if (!isBiometricAvailable) {
        if (!isAutoAttempt) {
            Alert.alert('Biometric Authentication', 'Biometric authentication is not available or not set up on your device.');
        }
        return;
    }

    const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to log in',
        cancelLabel: 'Cancel',
        disableDeviceFallback: true,
    });

    if (result.success) {
      const savedEmail = await AsyncStorage.getItem('saved_email');
      const savedPassword = await AsyncStorage.getItem('saved_password');

      if(savedEmail && savedPassword) {
        await handleLogin(savedEmail, savedPassword);
      } else if (!isAutoAttempt) {
        Alert.alert('Success', 'Authentication successful. Please enter your email and password and check "Remember Me" to use this feature.');
      }
    } else if (!isAutoAttempt) {
        console.log('Biometric authentication failed or was canceled by the user.');
    }
  };

  const handleLinkPress = async (url: string) => {
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert(`Cannot open this URL: ${url}`);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <StatusBar barStyle="dark-content" />
      <View style={styles.mainContent}>
        <View style={styles.topContainer}>
          {/* Make sure your logo.png file is in the assets folder of your project. */}
          <Image 
            source={require('@/assets/saga-logo.png')} 
            style={styles.logoImage} 
          />
          <Text style={styles.title}>Hesabınıza Giriş Yapın</Text>
          <Text style={styles.subtitle}>
            Giriş yaparak <Text style={styles.link}>Kullanım Sözleşmesi</Text> ve <Text style={styles.link}>Gizlilik Sözleşmesi</Text> kabul etmiş olacaksınız.
          </Text>

          <View style={styles.inputContainer}>
            <Mail color="#9CA3AF" size={20} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="Personel Mail Adresiniz"
              placeholderTextColor="#9CA3AF"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Lock color="#9CA3AF" size={20} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Personel Şifreniz"
              placeholderTextColor="#9CA3AF"
              secureTextEntry
            />
          </View>

          <View style={styles.optionsContainer}>
            <Checkbox value={rememberMe} onValueChange={setRememberMe} label="Hızlı Giriş için Bilgileri Kaydet" />
            <TouchableOpacity>
              <Text style={styles.link}>Şifremi Unuttum!</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.loginActionsContainer}>
            <TouchableOpacity
              style={[styles.button, styles.loginButton, loading && styles.buttonDisabled, !isBiometricAvailable && {flex: 1}]}
              onPress={() => handleLogin()}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.buttonText}>Giriş Yap</Text>
              )}
            </TouchableOpacity>
            {isBiometricAvailable && (
                <TouchableOpacity 
                    style={styles.biometricButton} 
                    onPress={() => handleBiometricAuth(false)}
                >
                    {biometricType === 'Face ID' ? (
                        <ScanFace size={28} color="#06a3e5" />
                    ) : (
                        <Fingerprint size={28} color="#06a3e5" />
                    )}
                </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.bottomContainer}>
            {/* Make sure your illustration file is in the assets folder. */}
              <Image 
                source={require('@/assets/Fingerprint-cuate.png')} 
                style={styles.illustrationImage} 
            />
          <View style={styles.socialSection}>
            <Text style={styles.connectText}>Sosyal Medya Hesaplarımız</Text>
            <View style={styles.socialButtonsContainer}>
                <TouchableOpacity style={styles.socialButton} onPress={() => handleLinkPress('https://facebook.com')}>
                    <Facebook size={24} color="#3b5998" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialButton} onPress={() => handleLinkPress('https://instagram.com')}>
                    <Instagram size={24} color="#e1306c" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialButton} onPress={() => handleLinkPress('https://linkedin.com')}>
                    <Linkedin size={24} color="#0077b5" />
                </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA', // Background color
  },
  mainContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 20) + 20 : 80, // Increased top padding
    paddingBottom: 30,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
  },
  logoImage: {
    width: 180,
    height: 70,
    resizeMode: 'contain',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#f47116', // Orange title color
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 25,
    textAlign: 'center',
    lineHeight: 20,
  },
  link: {
    color: '#06a3e5', // Blue link color
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF', // Changed for shadow effect
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    // --- Modern Shadow Effect ---
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 52,
    fontSize: 16,
    color: '#111827',
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: '#06a3e5',
    borderColor: '#06a3e5',
  },
  checkboxCheckmark: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#374151',
  },
  loginActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  biometricButton: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#06a3e5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  button: {
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButton: {
    flex: 1,
    backgroundColor: '#06a3e5',
    shadowColor: '#06a3e5',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 40, // Increased bottom padding
    justifyContent: 'center', // Centered content for better layout
  },
  illustrationImage: {
    width: '100%',
    height: 220, // Increased height
    resizeMode: 'contain',
    alignSelf: 'center',
    marginBottom: 10, // Increased margin
  },
  socialSection: {
    alignItems: 'center',
  },
  connectText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 15,
  },
  socialButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    paddingBottom: 30,
  },
  socialButton: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: 50,
    height: 50,
    borderRadius: 25,
    marginHorizontal: 10,
  },
});
