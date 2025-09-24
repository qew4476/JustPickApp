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
      <Tab.Navigator
        screenOptions={{
          tabBarShowLabel: true,
          tabBarIconStyle: { display: 'none' },
          headerShown: false,
          tabBarLabelStyle: {
            fontSize: 16,
            fontWeight: 'bold',
          },
        }}
      >
        <Tab.Screen 
          name="Home" 
          component={HomeScreen}
          options={{
            tabBarLabel: 'Home',
          }}
        />
        <Tab.Screen 
          name="Templates" 
          component={TemplatesScreen}
          options={{
            tabBarLabel: 'Templates',
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
