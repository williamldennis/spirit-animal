import React from 'react';
import { TextInput, TextInputProps, StyleSheet } from 'react-native';

export const SafeTextInput = (props: TextInputProps) => {
  return (
    <TextInput
      {...props}
      blurOnSubmit={false}
      autoCorrect={false}
      autoCapitalize="none"
      style={[styles.input, props.style]}
    />
  );
};

const styles = StyleSheet.create({
  input: {
    padding: 12,
    fontSize: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
}); 