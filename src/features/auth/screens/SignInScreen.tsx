import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../../types/navigation';
import { useAuthStore } from '../stores/authStore';
import { logger } from '../../../utils/logger';

type Props = NativeStackScreenProps<RootStackParamList, 'SignIn'>;

export default function SignInScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const { signIn, loading, error } = useAuthStore();

  const validateForm = () => {
    logger.debug('SignInScreen.validateForm', 'Starting form validation');
    setValidationError(null);

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const error = 'Please enter a valid email address';
      logger.warn('SignInScreen.validateForm', 'Email validation failed', { email });
      setValidationError(error);
      return false;
    }

    // Password validation
    if (!password) {
      const error = 'Password is required';
      logger.warn('SignInScreen.validateForm', 'Password validation failed');
      setValidationError(error);
      return false;
    }

    logger.debug('SignInScreen.validateForm', 'Form validation successful');
    return true;
  };

  const handleSignIn = async () => {
    logger.info('SignInScreen.handleSignIn', 'Starting sign in process');
    if (!validateForm()) {
      logger.warn('SignInScreen.handleSignIn', 'Form validation failed');
      return;
    }

    try {
      await signIn(email, password);
      logger.info('SignInScreen.handleSignIn', 'Sign in successful');
      // Navigation will happen automatically due to auth state change
    } catch (err) {
      logger.error('SignInScreen.handleSignIn', 'Sign in error', { error: err });
      // Error is handled by the store and displayed through the error prop
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo/Brand */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Text style={styles.logoText}>P</Text>
          </View>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>
        </View>

        {/* Google Sign In */}
        <TouchableOpacity style={styles.googleButton}>
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or continue with email</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Email/Password Form */}
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
          <TouchableOpacity 
            style={[styles.signInButton, loading && styles.signInButtonDisabled]}
            onPress={handleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.signInButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          style={styles.signUpButton}
          onPress={() => {
            logger.debug('SignInScreen', 'Navigating to SignUp');
            navigation.navigate('SignUp');
          }}
          disabled={loading}
        >
          <Text style={styles.signUpButtonText}>
            Need an account? Sign up
          </Text>
        </TouchableOpacity>
      </View>
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
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#6B7280',
    fontSize: 14,
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
  signInButton: {
    backgroundColor: '#2563EB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  signInButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  signUpButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  signUpButtonText: {
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
  signInButtonDisabled: {
    opacity: 0.7,
  },
}); 