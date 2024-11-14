import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../types/navigation';
import { useAuthStore } from '../stores/authStore';
import { logger } from '../../../utils/logger';

type Props = NativeStackScreenProps<RootStackParamList, 'SignUp'>;

export default function SignUpScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const { signUp, loading, error } = useAuthStore();

  const validateForm = () => {
    logger.debug('SignUpScreen.validateForm', 'Starting form validation');
    setValidationError(null);

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const error = 'Please enter a valid email address';
      logger.warn('SignUpScreen.validateForm', 'Email validation failed', { email });
      setValidationError(error);
      return false;
    }

    // Password validation
    if (password.length < 6) {
      const error = 'Password must be at least 6 characters long';
      logger.warn('SignUpScreen.validateForm', 'Password validation failed', { passwordLength: password.length });
      setValidationError(error);
      return false;
    }

    // Password match validation
    if (password !== confirmPassword) {
      const error = 'Passwords do not match';
      logger.warn('SignUpScreen.validateForm', 'Password match validation failed');
      setValidationError(error);
      return false;
    }

    logger.debug('SignUpScreen.validateForm', 'Form validation successful');
    return true;
  };

  const handleSignUp = async () => {
    logger.info('SignUpScreen.handleSignUp', 'Starting sign up process');
    if (!validateForm()) {
      logger.warn('SignUpScreen.handleSignUp', 'Form validation failed');
      return;
    }

    try {
      await signUp(email, password);
      logger.info('SignUpScreen.handleSignUp', 'Sign up successful');
      // Navigation will happen automatically due to auth state change
    } catch (err) {
      logger.error('SignUpScreen.handleSignUp', 'Sign up error', { error: err });
      // Error is handled by the store and displayed through the error prop
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {/* Logo/Brand */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>P</Text>
          </View>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Sign up to get started</Text>
        </View>

        {/* Sign Up Form */}
        <View style={styles.form}>
          {(error || validationError) && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                {validationError || error}
              </Text>
            </View>
          )}
          <TextInput
            style={[
              styles.input,
              (error || validationError) ? styles.inputError : undefined
            ]}
            placeholder="Email"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              setValidationError(null);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            editable={!loading}
          />
          <TextInput
            style={[
              styles.input,
              (error || validationError) ? styles.inputError : undefined
            ]}
            placeholder="Password"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              setValidationError(null);
            }}
            secureTextEntry
            editable={!loading}
            autoComplete="off"
            textContentType="oneTimeCode"
          />
          <TextInput
            style={[
              styles.input,
              (error || validationError) ? styles.inputError : undefined
            ]}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={(text) => {
              setConfirmPassword(text);
              setValidationError(null);
            }}
            secureTextEntry
            editable={!loading}
            autoComplete="off"
            textContentType="oneTimeCode"
          />
          <TouchableOpacity 
            style={[styles.signUpButton, loading && styles.signUpButtonDisabled]}
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.signUpButtonText}>Create Account</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.signInButton}
          onPress={() => navigation.navigate('SignIn')}
          disabled={loading}
        >
          <Text style={styles.signInButtonText}>
            Already have an account? Sign in
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 64,
    height: 64,
    backgroundColor: '#EBF5FF',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    fontSize: 16,
  },
  signUpButton: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  signUpButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  signInButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  signInButtonText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: '#FEE2E2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    lineHeight: 20,
  },
  inputError: {
    borderColor: '#DC2626',
  },
  signUpButtonDisabled: {
    opacity: 0.7,
  },
}); 