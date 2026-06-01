import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useNavigation } from '@react-navigation/native';
import { Colors, FontSize, Spacing } from '../theme';

const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const EditProfileScreen = () => {
  const navigation = useNavigation();

  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
  const [fullName, setFullName] = useState('Ich Sokheng');
  const [phone, setPhone] = useState('+855 12 345 678');
  const [email, setEmail] = useState('ichsokheng@example.com');
  const [gender, setGender] = useState('Male');

  const [birthdayDate, setBirthdayDate] = useState(new Date(1998, 0, 12));
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);

  const birthday = formatDate(birthdayDate);

  const handleSave = () => {
    if (!fullName.trim()) {
      Alert.alert('Missing Name', 'Please enter your full name.');
      return;
    }

    if (!phone.trim()) {
      Alert.alert('Missing Phone', 'Please enter your phone number.');
      return;
    }

    // Call API update profile here
    // await profileService.updateProfile({
    //   fullName,
    //   phone,
    //   email,
    //   gender,
    //   birthday: birthdayDate.toISOString(),
    // });

    Alert.alert(
      'Profile Updated',
      'Your profile has been updated successfully.',
    );
    navigation.goBack();
  };

  const handleChangePhoto = () => {
    console.log('Change profile photo');
  };

  const handleBirthdayChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowBirthdayPicker(false);
    }

    if (selectedDate) {
      setBirthdayDate(selectedDate);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.appHeader}>
          <TouchableOpacity
            style={styles.headerButton}
            activeOpacity={0.85}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={23} color={Colors.black} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Edit Profile</Text>
            <Text style={styles.headerSubtitle}>Update your information</Text>
          </View>

          <View style={styles.headerPlaceholder} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrap}>
              {avatarUrl ? (
                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
              ) : (
                <Ionicons
                  name="person-outline"
                  size={44}
                  color={Colors.primary}
                />
              )}
            </View>

            <TouchableOpacity
              style={styles.changePhotoButton}
              activeOpacity={0.85}
              onPress={handleChangePhoto}
            >
              <Ionicons
                name="camera-outline"
                size={16}
                color={Colors.primary}
              />
              <Text style={styles.changePhotoText}>Change Photo</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <ProfileInput
              label="Full Name"
              value={fullName}
              onChangeText={setFullName}
              icon="person-outline"
              placeholder="Enter full name"
            />

            <ProfileInput
              label="Phone Number"
              value={phone}
              onChangeText={setPhone}
              icon="call-outline"
              placeholder="Enter phone number"
              keyboardType="phone-pad"
            />

            <ProfileInput
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              icon="mail-outline"
              placeholder="Enter email address"
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <ProfileInput
              label="Gender"
              value={gender}
              onChangeText={setGender}
              icon="male-female-outline"
              placeholder="Enter gender"
            />

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Birthday</Text>

              <TouchableOpacity
                style={styles.inputBox}
                activeOpacity={0.85}
                onPress={() => setShowBirthdayPicker(true)}
              >
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={Colors.gray500}
                />

                <Text style={styles.dateText}>{birthday}</Text>

                <Ionicons
                  name="chevron-down-outline"
                  size={18}
                  color={Colors.gray500}
                />
              </TouchableOpacity>
            </View>

            {showBirthdayPicker ? (
              <DateTimePicker
                value={birthdayDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                onChange={handleBirthdayChange}
              />
            ) : null}

            {Platform.OS === 'ios' && showBirthdayPicker ? (
              <TouchableOpacity
                style={styles.doneDateButton}
                activeOpacity={0.85}
                onPress={() => setShowBirthdayPicker(false)}
              >
                <Text style={styles.doneDateText}>Done</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </ScrollView>

        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={styles.saveButton}
            activeOpacity={0.88}
            onPress={handleSave}
          >
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

type ProfileInputProps = {
  label: string;
  value: string;
  icon: string;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  onChangeText: (text: string) => void;
};

const ProfileInput: React.FC<ProfileInputProps> = ({
  label,
  value,
  icon,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  onChangeText,
}) => {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>

      <View style={styles.inputBox}>
        <Ionicons name={icon as any} size={20} color={Colors.gray500} />

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.gray500}
          style={styles.input}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
        />
      </View>
    </View>
  );
};

export default EditProfileScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FAF7F5',
  },
  container: {
    flex: 1,
    backgroundColor: '#FAF7F5',
  },

  appHeader: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    backgroundColor: '#FAF7F5',
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EFE5E0',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: '900',
    color: Colors.black,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.gray500,
  },
  headerPlaceholder: {
    width: 42,
    height: 42,
  },

  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 120,
  },

  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  avatarWrap: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#F7EFEA',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EFE5E0',
    overflow: 'hidden',
  },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
  },
  changePhotoButton: {
    marginTop: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#EFE5E0',
  },
  changePhotoText: {
    marginLeft: 6,
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.primary,
  },

  card: {
    backgroundColor: Colors.white,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#EFE5E0',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },

  inputGroup: {
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.black,
    marginBottom: 8,
  },
  inputBox: {
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: '#FAF7F5',
    borderWidth: 1,
    borderColor: '#F0E7E3',
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.black,
    paddingVertical: 0,
  },
  dateText: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.black,
  },
  doneDateButton: {
    height: 46,
    borderRadius: 16,
    backgroundColor: '#F7EFEA',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -Spacing.sm,
    marginBottom: Spacing.md,
  },
  doneDateText: {
    fontSize: FontSize.sm,
    fontWeight: '900',
    color: Colors.primary,
  },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Platform.OS === 'ios' ? Spacing.xl : Spacing.lg,
    backgroundColor: '#FAF7F5',
    borderTopWidth: 1,
    borderTopColor: '#EFE5E0',
  },
  saveButton: {
    height: 56,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: FontSize.md,
    fontWeight: '900',
    color: Colors.white,
  },
});
