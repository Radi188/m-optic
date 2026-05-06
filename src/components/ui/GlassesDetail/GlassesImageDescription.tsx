import React from 'react';
import { View, Image, StyleSheet, Dimensions } from 'react-native';

const GlassesImageDescription = () => {
  // Default image URLs
  const images = [
    'https://static5.lenskart.com/media/catalog/product/pro/1/thumbnail/1080x1080/9df78eab33525d08d6e5fb8d27136e95//l/i/lenskart-air-la-e17273-c2-eyeglasses__dsc7892_03_04_2025.jpg',
    'https://static5.lenskart.com/media/catalog/product/pro/1/thumbnail/1080x1080/9df78eab33525d08d6e5fb8d27136e95//l/i/lenskart-air-la-e17273-c2-eyeglasses__dsc7891_03_04_2025.jpg',
  ];

  return (
    <View style={styles.container}>
      {images.map((image, index) => (
        <Image key={index} source={{ uri: image }} style={styles.image} />
      ))}
    </View>
  );
};

const { width } = Dimensions.get('window'); // Get the screen width for full-width images

const styles = StyleSheet.create({
  container: {},
  image: {
    width: width, // Full width of the screen
    height: 300, // Adjust height as per your requirement
    resizeMode: 'cover', // Ensure images cover the area properly
  },
});

export default GlassesImageDescription;
