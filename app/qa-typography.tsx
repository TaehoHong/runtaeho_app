import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UI_QA_ENABLED } from '~/qa/config';
import { TextInput as AppTextInput, NativeTextInput as TextInput } from '~/shared/components/typography';

/** Local native-font regression probe; available only under the existing QA gate. */
export default function TypographyQa() {
  const { fontScale } = useWindowDimensions();
  const [value, setValue] = useState('QA draft');
  const [events, setEvents] = useState(0);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  if (!UI_QA_ENABLED) return <Redirect href="/auth/login" />;
  const inputStyle = { borderWidth: 1, borderColor: '#999', padding: 12, fontSize: 16, marginBottom: 16 };
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: 'white' }}>
      <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={() => router.back()}><Text style={{ fontSize: 16 }}>Back</Text></TouchableOpacity>
        <Text style={{ fontSize: 16 }}>System scale: {fontScale.toFixed(2)}</Text>
        <Text style={{ fontSize: 16 }}>Normal <Text style={{ fontWeight: '700' }}>nested bold</Text></Text>
        <Text allowFontScaling={false} style={{ fontSize: 16 }}>Fixed 16</Text>
        <Text maxFontSizeMultiplier={1.3} style={{ fontSize: 16 }}>Capped 1.3</Text>
        <View style={{ height: 16 }} />
        <Text>Controlled</Text>
        <Text>Changes: {events}; selection: {selection.start}:{selection.end}</Text>
        <TextInput accessibilityLabel="Controlled" value={value} onChangeText={text => {
          setValue(text);
          setEvents(count => count + 1);
        }} onSelectionChange={event => setSelection(event.nativeEvent.selection)} style={[inputStyle, { lineHeight: 24 }]} />
        <Text>Uncontrolled</Text>
        <TextInput accessibilityLabel="Uncontrolled" defaultValue="Uncontrolled draft" style={[inputStyle, { lineHeight: 24 }]} />
        <Text>Short placeholder</Text>
        <TextInput accessibilityLabel="Short placeholder" placeholder="Hint" style={inputStyle} />
        <Text>Placeholder</Text>
        <TextInput accessibilityLabel="Placeholder" placeholder="シューズのブランドを入力してください。" style={inputStyle} />
        <Text>Multiline</Text>
        <TextInput accessibilityLabel="Multiline" multiline defaultValue={'First line\nSecond line'} style={inputStyle} />
        <Text>Secure</Text>
        <TextInput accessibilityLabel="Secure" secureTextEntry defaultValue="qa-only" style={inputStyle} />
        <Text>Fixed input</Text>
        <TextInput accessibilityLabel="Fixed input" allowFontScaling={false} defaultValue="Fixed 16" style={[inputStyle, { lineHeight: 24 }]} />
        <Text>Capped input</Text>
        <TextInput accessibilityLabel="Capped input" maxFontSizeMultiplier={1.3} defaultValue="Capped 1.3" style={[inputStyle, { lineHeight: 24 }]} />
        <Text>Empty without placeholder</Text>
        <TextInput accessibilityLabel="Empty without placeholder" style={inputStyle} />
        <Text>Custom font and line height</Text>
        <AppTextInput accessibilityLabel="Custom font and line height" multiline defaultValue={'한글 첫 줄\n日本語 二行目'} style={[inputStyle, { lineHeight: 24 }]} />
      </ScrollView>
    </SafeAreaView>
  );
}
