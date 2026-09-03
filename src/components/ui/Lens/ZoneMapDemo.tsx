import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Colors, FontSize, Spacing, BorderRadius } from '../../../theme';
import AppText from '../../AppText';

export type ZoneId = 'far' | 'mid' | 'near';

type Props = {
  /** Top to bottom, as the zones sit in the lens. */
  zones: ZoneId[];
  titleKey: string;
};

const ZONE = {
  far: { labelKey: 'ZoneFar', bodyKey: 'ZoneFarBody' },
  mid: { labelKey: 'ZoneMid', bodyKey: 'ZoneMidBody' },
  near: { labelKey: 'ZoneNear', bodyKey: 'ZoneNearBody' },
} as const;

/** One lens of the pair, with its zones stacked top to bottom. */
const Lens: React.FC<{
  zones: ZoneId[];
  active: ZoneId;
  onSelect: (z: ZoneId) => void;
}> = ({ zones, active, onSelect }) => {
  const { t } = useTranslation();

  return (
    <View style={styles.lens}>
      {zones.map((zone, i) => (
        <TouchableOpacity
          key={zone}
          style={[
            styles.zone,
            i > 0 && styles.zoneDivided,
            zone === active && styles.zoneActive,
          ]}
          activeOpacity={0.8}
          onPress={() => onSelect(zone)}
        >
          <AppText
            style={[
              styles.zoneLabel,
              zone === active && styles.zoneLabelActive,
            ]}
          >
            {t(ZONE[zone].labelKey)}
          </AppText>
        </TouchableOpacity>
      ))}
    </View>
  );
};

/**
 * Bifocal / progressive zone mapping.
 *
 * The web version reveals each zone on hover; a phone has no hover, so the
 * segments are tappable and the explanation is shown below the frame rather
 * than in a tooltip that would have nothing to attach to.
 */
const ZoneMapDemo: React.FC<Props> = ({ zones, titleKey }) => {
  const { t } = useTranslation();
  const [active, setActive] = useState<ZoneId>(zones[0]);

  return (
    <View style={styles.card}>
      <AppText style={styles.kicker}>{t('LensDemoKicker')}</AppText>
      <AppText style={styles.heading}>{t(titleKey)}</AppText>

      <View style={styles.frame}>
        <Lens zones={zones} active={active} onSelect={setActive} />
        <View style={styles.bridge} />
        <Lens zones={zones} active={active} onSelect={setActive} />
      </View>

      <AppText style={styles.hint}>{t('ZoneTapHint')}</AppText>

      <View style={styles.detail}>
        <AppText style={styles.detailTitle}>
          {t(ZONE[active].labelKey)}
        </AppText>
        <AppText style={styles.detailBody}>{t(ZONE[active].bodyKey)}</AppText>
      </View>
    </View>
  );
};

export default ZoneMapDemo;

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.gray50,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderColor: Colors.gray200,
    padding: Spacing.md,
  },
  kicker: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.gray400,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  heading: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.black,
    marginTop: 2,
    marginBottom: Spacing.lg,
  },

  frame: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bridge: {
    width: 22,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#4A2E22',
  },
  lens: {
    width: 118,
    height: 116,
    borderRadius: 26,
    borderWidth: 4,
    borderColor: '#4A2E22',
    backgroundColor: Colors.white,
    overflow: 'hidden',
  },
  zone: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F4F5',
  },
  zoneDivided: {
    borderTopWidth: 1,
    borderTopColor: '#E4E4E7',
  },
  zoneActive: { backgroundColor: Colors.primaryLight },
  zoneLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.gray500,
    letterSpacing: 0.5,
  },
  zoneLabelActive: { color: Colors.primary },

  hint: {
    fontSize: FontSize.xs,
    color: Colors.gray400,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: Spacing.md,
  },

  detail: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.gray200,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  detailTitle: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: Colors.black,
    marginBottom: 2,
  },
  detailBody: {
    fontSize: FontSize.sm,
    color: Colors.gray600,
    lineHeight: 19,
  },
});
