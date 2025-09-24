import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { setLanguage } from './i18n';
import HomeScreen from './screens/HomeScreen';
import TemplatesScreen from './screens/TemplatesScreen';

setLanguage('en');

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Tab.Navigator>
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Templates" component={TemplatesScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
