import React, { useRef, useState } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';

import { Colors, FontSize, BorderRadius } from '../../../theme';
import AppText from '../../AppText';

interface Props {
  value: string;
  onChangeText: (v: string) => void;
  length?: number;
  /** Mask the digits — used for the PIN, not the SMS code. */
  secure?: boolean;
  autoFocus?: boolean;
  onFilled?: (v: string) => void;
}

/**
 * A row of digit cells backed by one hidden TextInput, so the OS keeps its
 * SMS autofill and paste behaviour instead of fighting per-cell focus.
 */
const CodeInput: React.FC<Props> = ({
  value,
  onChangeText,
  length = 6,
  secure = false,
  autoFocus = false,
  onFilled,
}) => {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  const handleChange = (raw: string) => {
    const digits = raw.replace(/[^\d]/g, '').slice(0, length);
    onChangeText(digits);
    if (digits.length === length) onFilled?.(digits);
  };

  const cells = Array.from({ length }, (_, i) => i);
  const activeIndex = Math.min(value.length, length - 1);

  return (
    <Pressable style={styles.row} onPress={() => inputRef.current?.focus()}>
      {cells.map(i => {
        const char = value[i];
        const isActive = focused && i === activeIndex;

        return (
          <View
            key={i}
            style={[
              styles.cell,
              char !== undefined && styles.cellFilled,
              isActive && styles.cellActive,
            ]}
          >
            {char !== undefined && (
              <AppText style={styles.cellText}>{secure ? '•' : char}</AppText>
            )}
          </View>
        );
      })}

      <TextInput
        ref={inputRef}
        style={styles.hidden}
        value={value}
        onChangeText={handleChange}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        textContentType={secure ? 'password' : 'oneTimeCode'}
        autoComplete={
          secure ? 'off' : Platform.OS === 'android' ? 'sms-otp' : 'off'
        }
        caretHidden
      />
    </Pressable>
  );
};

export default CodeInput;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  cell: {
    flex: 1,
    aspectRatio: 0.86,
    maxWidth: 56,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    borderColor: Colors.gray200,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellFilled: {
    borderColor: Colors.gray300,
  },
  cellActive: {
    borderColor: Colors.primary,
  },
  cellText: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.black,
  },
  hidden: {
    position: 'absolute',
    opacity: 0,
    width: '100%',
    height: '100%',
  },
});
