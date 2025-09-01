import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActivityIndicator } from 'react-native-paper';
import Toast from 'react-native-toast-message';
import apiService from '../services/apiService';
import storageService from '../services/storageService';
import config from '../config';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Check if user is already logged in
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await storageService.getUserToken();
      if (token) {
        // Verify token with backend
        const isValid = await apiService.verifyToken();
        if (isValid.success) {
          navigation.replace('MainTabs');
        }
      }
    } catch (error) {
      console.log('Auth check failed:', error);
    }
  };

  const validateForm = () => {
    if (!email.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Email Required',
        text2: 'Please enter your email address',
      });
      return false;
    }

    if (!password.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Password Required',
        text2: 'Please enter your password',
      });
      return false;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Toast.show({
        type: 'error',
        text1: 'Invalid Email',
        text2: 'Please enter a valid email address',
      });
      return false;
    }

    if (password.length < 6) {
      Toast.show({
        type: 'error',
        text1: 'Password Too Short',
        text2: 'Password must be at least 6 characters long',
      });
      return false;
    }

    return true;
  };

  const handleLogin = async () => {
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const response = await apiService.login({
        email: email.trim().toLowerCase(),
        password: password,
      });

      if (response.success) {
        Toast.show({
          type: 'success',
          text1: 'Login Successful',
          text2: 'Welcome to Blue Carbon MRV',
        });

        // Navigate to main app
        navigation.replace('MainTabs');
      } else {
        Toast.show({
          type: 'error',
          text1: 'Login Failed',
          text2: response.message || 'Invalid credentials',
        });
      }
    } catch (error) {
      console.error('Login error:', error);
      Toast.show({
        type: 'error',
        text1: 'Login Error',
        text2: error.message || 'An error occurred during login',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoading(true);

    try {
      // Demo credentials for testing
      const demoCredentials = {
        email: 'demo@bluecarbon.org',
        password: 'demo123',
      };

      const response = await apiService.login(demoCredentials);

      if (response.success) {
        Toast.show({
          type: 'success',
          text1: 'Demo Login Successful',
          text2: 'Welcome to Blue Carbon MRV Demo',
        });

        navigation.replace('MainTabs');
      } else {
        Toast.show({
          type: 'error',
          text1: 'Demo Login Failed',
          text2: 'Demo account not available',
        });
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Demo Login Error',
        text2: 'Please try with your actual credentials',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <View style={styles.logo}>
                <Text style={styles.logoText}>🌊</Text>
              </View>
            </View>
            <Text style={styles.title}>Blue Carbon MRV</Text>
            <Text style={styles.subtitle}>
              Monitoring, Reporting & Verification System
            </Text>
          </View>

          {/* Login Form */}
          <View style={styles.formContainer}>
            <Text style={styles.formTitle}>Sign In</Text>
            <Text style={styles.formSubtitle}>
              Access your blue carbon projects and data
            </Text>

            {/* Email Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email Address</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Enter your email"
                placeholderTextColor={config.UI.TEXT_SECONDARY}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isLoading}
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.textInput, styles.passwordInput]}
                  placeholder="Enter your password"
                  placeholderTextColor={config.UI.TEXT_SECONDARY}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  <Text style={styles.eyeIcon}>
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={config.UI.CARD_COLOR} size="small" />
              ) : (
                <Text style={styles.loginButtonText}>Sign In</Text>
              )}
            </TouchableOpacity>

            {/* Demo Login Button */}
            <TouchableOpacity
              style={[styles.demoButton, isLoading && styles.demoButtonDisabled]}
              onPress={handleDemoLogin}
              disabled={isLoading}
            >
              <Text style={styles.demoButtonText}>Try Demo Account</Text>
            </TouchableOpacity>

            {/* Forgot Password */}
            <TouchableOpacity
              style={styles.forgotPassword}
              onPress={() => Alert.alert('Contact Support', 'Please contact support@bluecarbonmrv.com for password reset.')}
              disabled={isLoading}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              For NGO and Panchayat users only
            </Text>
            <Text style={styles.versionText}>
              Version {config.APP.VERSION}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: config.UI.BACKGROUND_COLOR,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 40,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: config.UI.PRIMARY_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  logoText: {
    fontSize: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: config.UI.TEXT_PRIMARY,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: config.UI.TEXT_SECONDARY,
    textAlign: 'center',
    lineHeight: 22,
  },
  formContainer: {
    backgroundColor: config.UI.CARD_COLOR,
    borderRadius: config.UI.BORDER_RADIUS,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: config.UI.SHADOW_OPACITY,
    shadowRadius: 8,
    elevation: 4,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: config.UI.TEXT_PRIMARY,
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 14,
    color: config.UI.TEXT_SECONDARY,
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: config.UI.TEXT_PRIMARY,
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: config.UI.BORDER_RADIUS,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: config.UI.TEXT_PRIMARY,
    backgroundColor: '#FAFAFA',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    padding: 4,
  },
  eyeIcon: {
    fontSize: 20,
  },
  loginButton: {
    backgroundColor: config.UI.PRIMARY_COLOR,
    borderRadius: config.UI.BORDER_RADIUS,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: config.UI.PRIMARY_COLOR,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: config.UI.CARD_COLOR,
    fontSize: 16,
    fontWeight: 'bold',
  },
  demoButton: {
    backgroundColor: config.UI.SECONDARY_COLOR,
    borderRadius: config.UI.BORDER_RADIUS,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  demoButtonDisabled: {
    opacity: 0.6,
  },
  demoButtonText: {
    color: config.UI.CARD_COLOR,
    fontSize: 14,
    fontWeight: '600',
  },
  forgotPassword: {
    alignItems: 'center',
  },
  forgotPasswordText: {
    color: config.UI.SECONDARY_COLOR,
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  footer: {
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 12,
    color: config.UI.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: 8,
  },
  versionText: {
    fontSize: 10,
    color: config.UI.TEXT_SECONDARY,
  },
});

export default LoginScreen;
