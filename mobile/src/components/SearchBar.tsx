import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colors, radius, space } from '@/lib/theme';

/** Buscador con espera de 400 ms para no lanzar una consulta por tecla. */
export function SearchBar({ placeholder, onSearch }: { placeholder: string; onSearch: (text: string) => void }) {
  const [text, setText] = useState('');
  useEffect(() => {
    const t = setTimeout(() => onSearch(text), 400);
    return () => clearTimeout(t);
  }, [text, onSearch]);
  return (
    <View style={styles.wrap}>
      <Ionicons name="search" size={18} color={colors.inkMute} />
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor={colors.inkMute}
        style={styles.input}
        returnKeyType="search"
        autoCorrect={false}
        clearButtonMode="never"
      />
      {text ? (
        <Pressable onPress={() => setText('')} accessibilityLabel="Borrar búsqueda" hitSlop={10}>
          <Ionicons name="close-circle" size={18} color={colors.inkMute} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2),
    backgroundColor: colors.white,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: space(3),
    marginHorizontal: space(4),
    marginTop: space(3)
  },
  input: { flex: 1, paddingVertical: space(2.5), fontSize: 16, color: colors.ink }
});
