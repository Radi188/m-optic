import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  Linking,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { useIsFocused } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { BorderRadius, Colors, FontSize, MaxWidth, Spacing } from '../../../theme';
import type { AnnouncementItem } from '../../../types/home';
import { buildFileUrl } from '../../../utils/fileUrlHelper';
import AppText from '../../AppText';
import AppImage from '../../AppImage';

/**
 * The home-screen pop-up. Its content is the latest announcement from the
 * backend — nothing in it is written into the app. It shows once per app
 * launch: moving around the app or sending it to the background does not bring
 * it back, but killing the app and opening it again does.
 */

// Lives as long as the JS runtime, i.e. until the app is killed. Module state
// rather than component state, so leaving and re-entering Home does not reset it.
let shownThisLaunch = false;
// Let the home screen settle before the pop-up lands on top of it.
const SHOW_DELAY_MS = 700;
// Until the real image size is known, assume a portrait poster.
const FALLBACK_RATIO = 4 / 5;

const resolveImage = (value?: string | null): string | null => {
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) return value;
  return buildFileUrl(value);
};

/** The announcement body is HTML; the pop-up only needs a short plain excerpt. */
const toPlainText = (html: string) =>
  html
    .replace(/<\/(p|div|li)>|<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

/** When an announcement went live: its scheduled time if set, else creation. */
const publishedAt = (a: AnnouncementItem) =>
  Date.parse(a.scheduled_at || a.created_at) || 0;

/**
 * The newest announcement. Picked by date rather than trusting the API's
 * order; the higher id breaks a tie, since ids grow with each new one.
 */
export const latestAnnouncement = (
  announcements?: AnnouncementItem[],
): AnnouncementItem | null =>
  (announcements ?? []).reduce<AnnouncementItem | null>((latest, a) => {
    if (!latest) return a;
    const diff = publishedAt(a) - publishedAt(latest);
    return diff > 0 || (diff === 0 && a.id > latest.id) ? a : latest;
  }, null);

/** Shows the latest announcement once per app launch, while Home is focused. */
export function useAnnouncementPopup(announcements?: AnnouncementItem[]) {
  const [popup, setPopup] = useState<AnnouncementItem | null>(null);
  const isFocused = useIsFocused();
  const latest = latestAnnouncement(announcements);
  const latestId = latest?.id ?? null;

  useEffect(() => {
    // Nothing to show yet (still loading, or no announcements), already shown
    // since the app was opened, or Home is not on screen. Tabs stay mounted, so
    // without the focus check a timer started on Home would present the native
    // modal while another tab is showing; leaving Home cancels it instead, and
    // coming back starts it again.
    if (!latest || shownThisLaunch || !isFocused) return;

    const timer = setTimeout(() => {
      shownThisLaunch = true;
      setPopup(latest);
    }, SHOW_DELAY_MS);

    return () => clearTimeout(timer);
    // Re-run only when the latest announcement changes (e.g. once it loads)
    // or Home gains or loses focus.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestId, isFocused]);

  return { popup, closePopup: () => setPopup(null) };
}

type AnnouncementPopupProps = {
  announcement: AnnouncementItem | null;
  onClose: () => void;
};

const AnnouncementPopup: React.FC<AnnouncementPopupProps> = ({
  announcement,
  onClose,
}) => {
  const { t } = useTranslation();
  const { height: windowHeight } = useWindowDimensions();
  const scale = useRef(new Animated.Value(0.9)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const [ratio, setRatio] = useState(FALLBACK_RATIO);

  const imageUrl = resolveImage(announcement?.banner_image);
  const excerpt = announcement ? toPlainText(announcement.content) : '';
  const linkUrl = announcement?.link_url;

  useEffect(() => {
    if (!announcement) return;
    scale.setValue(0.9);
    fade.setValue(0);
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        tension: 60,
        friction: 9,
        useNativeDriver: true,
      }),
      Animated.timing(fade, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [announcement, fade, scale]);

  // Show the whole poster at its own shape instead of cropping it.
  useEffect(() => {
    if (!imageUrl) return;
    Image.getSize(
      imageUrl,
      (w, h) => w > 0 && h > 0 && setRatio(w / h),
      () => {},
    );
  }, [imageUrl]);

  const close = () => {
    Animated.timing(fade, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(onClose);
  };

  const openLink = () => {
    if (linkUrl) Linking.openURL(linkUrl).catch(() => {});
    close();
  };

  if (!announcement) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <Animated.View style={[styles.backdrop, { opacity: fade }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={close}
        />

        <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
          {imageUrl ? (
            <AppImage
              source={{ uri: imageUrl }}
              style={[
                styles.image,
                { aspectRatio: ratio, maxHeight: windowHeight * 0.5 },
              ]}
              resizeMode="cover"
            />
          ) : null}

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={close}
            hitSlop={8}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={18} color={Colors.white} />
          </TouchableOpacity>

          <View style={styles.body}>
            <AppText style={styles.title} numberOfLines={2}>
              {announcement.title}
            </AppText>
            {!!excerpt && (
              <AppText style={styles.excerpt} numberOfLines={4}>
                {excerpt}
              </AppText>
            )}

            {linkUrl ? (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={openLink}
                activeOpacity={0.85}
              >
                <AppText style={styles.primaryText}>
                  {announcement.link_text || t('LearnMore')}
                </AppText>
                <Ionicons name="arrow-forward" size={16} color={Colors.white} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.primaryBtn}
                onPress={close}
                activeOpacity={0.85}
              >
                <AppText style={styles.primaryText}>{t('GotIt')}</AppText>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

export default AnnouncementPopup;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 12, 8, 0.62)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: MaxWidth.dialog,
    borderRadius: 28,
    overflow: 'hidden',
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.28,
    shadowRadius: 40,
    elevation: 20,
  },
  image: {
    width: '100%',
    backgroundColor: Colors.gray100,
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.black,
  },
  excerpt: {
    fontSize: FontSize.sm,
    lineHeight: 21,
    color: Colors.gray600,
  },
  primaryBtn: {
    marginTop: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
  },
  primaryText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.white,
  },
});
