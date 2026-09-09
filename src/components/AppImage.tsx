import React from 'react';
import { StyleSheet } from 'react-native';
import type { ImageStyle, StyleProp } from 'react-native';
import FastImage from '@d11/react-native-fast-image';
import type { ResizeMode, Source } from '@d11/react-native-fast-image';

type AppImageProps = {
  /** A remote URI, or a local `require(...)` asset. */
  source: { uri?: string | null } | number;
  style?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  /**
   * `immutable` (the default) serves from disk without revalidating, which is
   * right for the product shots, logos and banners this app shows — they are
   * uploaded once under a hashed filename and never edited in place.
   * `web` respects cache-control headers; use it for anything the shop edits
   * behind a stable URL.
   */
  cache?: 'immutable' | 'web' | 'cacheOnly';
  /** Prioritise images that are on screen immediately. */
  priority?: 'low' | 'normal' | 'high';
  onLoad?: () => void;
  onError?: () => void;
  testID?: string;
};

const RESIZE: Record<string, ResizeMode> = {
  cover: FastImage.resizeMode.cover,
  contain: FastImage.resizeMode.contain,
  stretch: FastImage.resizeMode.stretch,
  center: FastImage.resizeMode.center,
};

const PRIORITY = {
  low: FastImage.priority.low,
  normal: FastImage.priority.normal,
  high: FastImage.priority.high,
};

const CACHE = {
  immutable: FastImage.cacheControl.immutable,
  web: FastImage.cacheControl.web,
  cacheOnly: FastImage.cacheControl.cacheOnly,
};

/**
 * The app's image element.
 *
 * Everything remote goes through FastImage so it is cached to disk and
 * survives a restart, instead of being refetched on every mount the way RN's
 * own Image does for a cold memory cache. Wrapping it in one component keeps
 * the swap in a single file if the underlying library changes again — and
 * gives every call site the same defaults rather than each screen inventing
 * its own caching policy.
 */
const AppImage: React.FC<AppImageProps> = ({
  source,
  style,
  resizeMode = 'cover',
  cache = 'immutable',
  priority = 'normal',
  onLoad,
  onError,
  testID,
}) => {
  // A local asset is a module id, and FastImage passes those straight through
  // — the cache options only apply to a remote URI.
  const resolved: Source | number =
    typeof source === 'number'
      ? source
      : {
          uri: source?.uri ?? undefined,
          priority: PRIORITY[priority],
          cache: CACHE[cache],
        };

  return (
    <FastImage
      testID={testID}
      source={resolved as Source}
      style={StyleSheet.flatten(style) as any}
      resizeMode={RESIZE[resizeMode]}
      onLoad={onLoad}
      onError={onError}
    />
  );
};

export default AppImage;

/** Warm the cache for images the user is about to see. */
export const preloadImages = (uris: Array<string | null | undefined>) => {
  const sources = uris
    .filter((uri): uri is string => !!uri)
    .map(uri => ({ uri, priority: FastImage.priority.low }));

  if (sources.length) FastImage.preload(sources);
};
