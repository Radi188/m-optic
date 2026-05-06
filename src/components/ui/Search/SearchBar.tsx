import React from 'react';
import {  Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { BorderRadius, Colors } from '../../../theme';

const SearchTrigger = ({ onPress }: { onPress?: () => void }) => {
  return (
    <TouchableOpacity
      style={styles.container}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <Ionicons name="search-outline" size={16} color="#888" />

      <Text style={styles.placeholder}>Search glasses</Text>
    </TouchableOpacity>
  );
};

export default SearchTrigger;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    paddingHorizontal: 10,
    height: 36,
    marginHorizontal: 16,
    marginTop: 10,
    borderWidth: 0.5,
    borderColor: Colors.primary,
  },

  placeholder: {
    marginLeft: 6,
    fontSize: 13,
    color: '#888',
  },
});
