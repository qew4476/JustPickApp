import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { setLanguage, getWord } from './i18n';

// Demo: set app language (options: 'en', 'zh-TW', 'zh-CN', 'ja')
setLanguage('zh-TW');

export default function App() {
  return (
    <View style={styles.container}>
      <Text>{getWord('Hello')}</Text>
      <Text>{getWord('Confirm')}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
