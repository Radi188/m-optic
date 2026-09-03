import React, { useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import EditProfileSkeleton from '../components/ui/Loading/EditProfileLoadingScreen';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useNavigation } from '@react-navigation/native';
import { Colors, FontSize, Spacing } from '../theme';
import ChangePhotoModal, {
  SelectedProfileImage,
} from '../components/ui/Modal/ChangePhotoModal';
import { useUserProfile } from '../hook/useUserProfile';
import AppText from '../components/AppText';

const EditProfileScreen = () => {
  const navigation = useNavigation<any>();

  const {
    profile,
    refetch,
    uploadAvatar,
    isUploadingAvatar,
    isLoading,
    error,
    isRefreshing,
  } = useUserProfile();

  const [localAvatarUrl, setLocalAvatarUrl] = useState<string | undefined>();
  const [photoModalVisible, setPhotoModalVisible] = useState(false);

  const handleImageSelected = async (image: SelectedProfileImage) => {
    try {
      setLocalAvatarUrl(image.uri);
      await uploadAvatar(image);
    } catch {
      Alert.alert('Upload Error', 'Unable to update profile photo.');
    }
  };

  const displayAvatar = localAvatarUrl || profile?.avatar_url || undefined;

  const tierName = profile?.tier?.name ?? 'Silver';

  const isPremium = useMemo(() => {
    const tier = tierName.toLowerCase();
    return tier === 'gold' || tier === 'platinum' || tier === 'premium';
  }, [tierName]);

  const formatValue = (value?: string | number | null) => {
    if (value === null || value === undefined || value === '') {
      return 'Not provided';
    }

    return String(value);
  };

  const formatAge = (age?: number | null) => {
    if (!age) {
      return 'Not provided';
    }

    return `${age} years old`;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <EditProfileSkeleton />
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.centerState}>
          <View style={styles.errorIconBox}>
            <Ionicons name="alert-circle-outline" size={30} color="#D92D20" />
          </View>

          <AppText style={styles.errorTitle}>Unable to load profile</AppText>

          <AppText style={styles.errorText}>
            {error || 'Something went wrong. Please try again.'}
          </AppText>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.retryButton}
            onPress={refetch}
          >
            <AppText style={styles.retryButtonText}>Try Again</AppText>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
            <AppText style={styles.headerTitle}>Profile Details</AppText>
            <AppText style={styles.headerSubtitle}>Photo update only</AppText>
          </View>

          <View style={styles.headerPlaceholder} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={refetch} />
          }
        >
          <View style={styles.heroCard}>
            <View style={styles.heroGlow} />

            <TouchableOpacity
              style={styles.avatarOuterRing}
              activeOpacity={0.88}
              onPress={() => setPhotoModalVisible(true)}
              disabled={isUploadingAvatar}
            >
              <View style={styles.avatarWrap}>
                {displayAvatar ? (
                  <Image
                    source={{ uri: displayAvatar }}
                    style={styles.avatar}
                  />
                ) : (
                  <Ionicons
                    name="person-outline"
                    size={46}
                    color={Colors.primary}
                  />
                )}

                {isUploadingAvatar && (
                  <View style={styles.avatarLoadingOverlay}>
                    <ActivityIndicator size="small" color={Colors.white} />
                  </View>
                )}
              </View>

              <View style={styles.avatarCameraBadge}>
                <Ionicons name="camera" size={15} color={Colors.white} />
              </View>
            </TouchableOpacity>

            <AppText style={styles.heroName}>
              {formatValue(profile.customer_name)}
            </AppText>

            {isPremium ? (
              <View style={styles.premiumBadge}>
                <Ionicons name="diamond" size={13} color="#9B6A3D" />
                <AppText style={styles.premiumBadgeText}>
                  {tierName} Member
                </AppText>
              </View>
            ) : (
              <AppText style={styles.heroMeta}>{tierName} Member</AppText>
            )}
          </View>

          <View style={styles.sectionHeader}>
            <AppText style={styles.sectionTitle}>Personal Information</AppText>

            <View style={styles.lockPill}>
              <Ionicons
                name="lock-closed-outline"
                size={13}
                color={Colors.gray500}
              />
              <AppText style={styles.lockPillText}>Locked</AppText>
            </View>
          </View>

          <View style={styles.card}>
            <ReadonlyProfileItem
              label="Name"
              value={formatValue(profile.customer_name)}
              icon="person-outline"
            />

            <ReadonlyProfileItem
              label="Age"
              value={formatAge(profile.age)}
              icon="calendar-outline"
            />

            <ReadonlyProfileItem
              label="Member Status"
              value={profile.is_member ? 'Member' : 'Non Member'}
              icon="diamond-outline"
            />

            <ReadonlyProfileItem
              label="Tier"
              value={tierName}
              icon="ribbon-outline"
            />

            <ReadonlyProfileItem
              label="Gender"
              value={formatValue(profile.gender)}
              icon="male-female-outline"
            />

            <ReadonlyProfileItem
              label="Phone Number"
              value={formatValue(profile.phone_number)}
              icon="call-outline"
            />

            <ReadonlyProfileItem
              label="Email"
              value={formatValue(profile.email)}
              icon="mail-outline"
              isLast
            />
          </View>

          <View style={styles.noticeBox}>
            <View style={styles.noticeIcon}>
              <Ionicons
                name="shield-checkmark-outline"
                size={20}
                color={Colors.primary}
              />
            </View>

            <View style={styles.noticeContent}>
              <AppText style={styles.noticeTitle}>
                Protected profile details
              </AppText>
              <AppText style={styles.noticeText}>
                Your account information is locked for security. You can update
                only your profile photo.
              </AppText>
            </View>
          </View>
        </ScrollView>

        <ChangePhotoModal
          visible={photoModalVisible}
          onClose={() => setPhotoModalVisible(false)}
          onImageSelected={handleImageSelected}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

type ReadonlyProfileItemProps = {
  label: string;
  value: string;
  icon: string;
  isLast?: boolean;
};

const ReadonlyProfileItem: React.FC<ReadonlyProfileItemProps> = ({
  label,
  value,
  icon,
  isLast = false,
}) => {
  return (
    <View style={[styles.profileItem, isLast && styles.profileItemLast]}>
      <View style={styles.profileIconBox}>
        <Ionicons name={icon as any} size={20} color={Colors.primary} />
      </View>

      <View style={styles.profileInfo}>
        <AppText style={styles.profileLabel}>{label}</AppText>
        <AppText style={styles.profileValue}>{value}</AppText>
      </View>

      <View style={styles.readOnlyBadge}>
        <Ionicons name="lock-closed-outline" size={14} color={Colors.gray500} />
      </View>
    </View>
  );
};

export default EditProfileScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F4F1',
  },
  container: {
    flex: 1,
    backgroundColor: '#F8F4F1',
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  centerStateText: {
    marginTop: 14,
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.gray500,
  },
  errorIconBox: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#FEE4E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  errorTitle: {
    fontSize: FontSize.lg,
    fontWeight: '900',
    color: Colors.black,
  },
  errorText: {
    marginTop: 8,
    fontSize: FontSize.sm,
    lineHeight: 20,
    textAlign: 'center',
    color: Colors.gray500,
  },
  retryButton: {
    marginTop: 18,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: {
    fontSize: FontSize.sm,
    fontWeight: '900',
    color: Colors.white,
  },
  appHeader: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    backgroundColor: '#F8F4F1',
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EDE1DA',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: '900',
    color: Colors.black,
  },
  headerSubtitle: {
    marginTop: 3,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.gray500,
  },
  headerPlaceholder: {
    width: 44,
    height: 44,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 40,
  },
  heroCard: {
    position: 'relative',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 34,
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: '#EFE5E0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 14,
    },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 6,
  },
  heroGlow: {
    position: 'absolute',
    top: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#F7E8DF',
    opacity: 0.85,
  },
  avatarOuterRing: {
    width: 122,
    height: 122,
    borderRadius: 61,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EADBD3',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 6,
  },
  avatarWrap: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: '#F7EFEA',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: 108,
    height: 108,
    borderRadius: 54,
  },
  avatarLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCameraBadge: {
    position: 'absolute',
    right: 6,
    bottom: 8,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.white,
  },
  heroName: {
    marginTop: Spacing.md,
    fontSize: 22,
    fontWeight: '900',
    color: Colors.black,
    letterSpacing: -0.6,
  },
  heroMeta: {
    marginTop: 8,
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.gray500,
  },
  premiumBadge: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF6E8',
    borderRadius: 999,
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: '#F1D7A8',
  },
  premiumBadgeText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: '900',
    color: '#9B6A3D',
    letterSpacing: -0.1,
  },
  sectionHeader: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '900',
    color: Colors.black,
    letterSpacing: -0.2,
  },
  lockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#EFE5E0',
  },
  lockPillText: {
    marginLeft: 5,
    fontSize: 11,
    fontWeight: '900',
    color: Colors.gray500,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#EFE5E0',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
  },
  profileItem: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F1E8E3',
  },
  profileItemLast: {
    borderBottomWidth: 0,
  },
  profileIconBox: {
    width: 46,
    height: 46,
    borderRadius: 17,
    backgroundColor: '#F8F1EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  profileInfo: {
    flex: 1,
  },
  profileLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.gray500,
    marginBottom: 5,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  profileValue: {
    fontSize: FontSize.md,
    fontWeight: '900',
    color: Colors.black,
    letterSpacing: -0.2,
  },
  readOnlyBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FAF7F5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F0E7E3',
  },
  noticeBox: {
    marginTop: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFDFC',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#EFE5E0',
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 2,
  },
  noticeIcon: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: '#F8F1EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  noticeContent: {
    flex: 1,
  },
  noticeTitle: {
    fontSize: FontSize.sm,
    fontWeight: '900',
    color: Colors.black,
    marginBottom: 4,
  },
  noticeText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.gray500,
    lineHeight: 20,
  },
});
