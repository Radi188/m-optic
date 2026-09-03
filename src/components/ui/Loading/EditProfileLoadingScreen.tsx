import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Colors, Spacing, BorderRadius } from '../../../theme';
import { SkeletonBlock, SkeletonCircle } from './Skeleton';

/** Edit-profile placeholder: the avatar, then the form fields. */
const EditProfileSkeleton: React.FC<{ fields?: number }> = ({ fields = 5 }) => (
  <View style={styles.root}>
    <View style={styles.avatarBlock}>
      <SkeletonCircle size={96} />
      <SkeletonBlock width={120} height={14} style={styles.avatarLabel} />
    </View>

    {Array.from({ length: fields }).map((_, i) => (
      <View key={i} style={styles.field}>
        <SkeletonBlock width={90} height={12} />
        <SkeletonBlock height={48} radius={BorderRadius.md} style={styles.input} />
      </View>
    ))}

    <SkeletonBlock height={52} radius={BorderRadius.full} style={styles.submit} />
  </View>
);

export default EditProfileSkeleton;

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    backgroundColor: Colors.background,
    flex: 1,
  },
  avatarBlock: { alignItems: 'center', marginBottom: Spacing.xl },
  avatarLabel: { marginTop: Spacing.md },
  field: { marginBottom: Spacing.md },
  input: { marginTop: Spacing.sm },
  submit: { marginTop: Spacing.lg },
});
