import React, { useEffect } from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import NetInfo from 'react-native-netinfo';

// Import screens
import LoginScreen from './screens/LoginScreen';
import ProjectRegistrationScreen from './screens/ProjectRegistrationScreen';
import MRVUploadScreen from './screens/MRVUploadScreen';

// Import services
import apiService from './services/apiService';
import storageService from './services/storageService';

// Import config
import config from './config';

// Create navigators
const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Main Tab Navigator
const MainTabs = () => {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = focused ? '📊' : '📈';
          } else if (route.name === 'Projects') {
            iconName = focused ? '🌊' : '🌿';
          } else if (route.name === 'MRV') {
            iconName = focused ? '📋' : '📝';
          } else if (route.name === 'Credits') {
            iconName = focused ? '🪙' : '💰';
          } else if (route.name === 'Profile') {
            iconName = focused ? '👤' : '👤';
          }

          return <Text style={{ fontSize: size, color }}>{iconName}</Text>;
        },
        tabBarActiveTintColor: config.UI.PRIMARY_COLOR,
        tabBarInactiveTintColor: config.UI.TEXT_SECONDARY,
        tabBarStyle: {
          backgroundColor: config.UI.CARD_COLOR,
          borderTopWidth: 1,
          borderTopColor: '#E0E0E0',
          paddingBottom: 5,
          paddingTop: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
        headerStyle: {
          backgroundColor: config.UI.CARD_COLOR,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTitleStyle: {
          color: config.UI.TEXT_PRIMARY,
          fontWeight: 'bold',
        },
        headerTintColor: config.UI.SECONDARY_COLOR,
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={DashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Tab.Screen 
        name="Projects" 
        component={ProjectsScreen}
        options={{ title: 'Projects' }}
      />
      <Tab.Screen 
        name="MRV" 
        component={MRVScreen}
        options={{ title: 'MRV Data' }}
      />
      <Tab.Screen 
        name="Credits" 
        component={CreditsScreen}
        options={{ title: 'Credits' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'Profile' }}
      />
    </Tab.Navigator>
  );
};

// Placeholder screens for tabs
const DashboardScreen = ({ navigation }) => (
  <SafeAreaProvider>
    <View style={styles.screen}>
      <Text style={styles.screenTitle}>Dashboard</Text>
      <Text style={styles.screenSubtitle}>Welcome to Blue Carbon MRV</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('ProjectRegistration')}
      >
        <Text style={styles.buttonText}>Register New Project</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('MRVUpload')}
      >
        <Text style={styles.buttonText}>Upload MRV Data</Text>
      </TouchableOpacity>
    </View>
  </SafeAreaProvider>
);

const ProjectsScreen = ({ navigation }) => (
  <SafeAreaProvider>
    <View style={styles.screen}>
      <Text style={styles.screenTitle}>Projects</Text>
      <Text style={styles.screenSubtitle}>Manage your blue carbon projects</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('ProjectRegistration')}
      >
        <Text style={styles.buttonText}>Register New Project</Text>
      </TouchableOpacity>
    </View>
  </SafeAreaProvider>
);

const MRVScreen = ({ navigation }) => (
  <SafeAreaProvider>
    <View style={styles.screen}>
      <Text style={styles.screenTitle}>MRV Data</Text>
      <Text style={styles.screenSubtitle}>Upload and manage MRV data</Text>
      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('MRVUpload')}
      >
        <Text style={styles.buttonText}>Upload MRV Data</Text>
      </TouchableOpacity>
    </View>
  </SafeAreaProvider>
);

const CreditsScreen = ({ navigation }) => (
  <SafeAreaProvider>
    <View style={styles.screen}>
      <Text style={styles.screenTitle}>Carbon Credits</Text>
      <Text style={styles.screenSubtitle}>View and manage your carbon credits</Text>
    </View>
  </SafeAreaProvider>
);

const ProfileScreen = ({ navigation }) => (
  <SafeAreaProvider>
    <View style={styles.screen}>
      <Text style={styles.screenTitle}>Profile</Text>
      <Text style={styles.screenSubtitle}>Manage your account settings</Text>
      <TouchableOpacity
        style={[styles.button, styles.logoutButton]}
        onPress={handleLogout}
      >
        <Text style={styles.buttonText}>Logout</Text>
      </TouchableOpacity>
    </View>
  </SafeAreaProvider>
);

// Main App Component
const App = () => {
  useEffect(() => {
    // Initialize app
    initializeApp();
    
    // Set up network listener
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected && state.isInternetReachable) {
        // Process sync queue when back online
        apiService.processSyncQueue();
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const initializeApp = async () => {
    try {
      // Check for stored authentication
      const token = await storageService.getUserToken();
      
      if (token) {
        // Verify token with backend
        const isValid = await apiService.verifyToken();
        if (!isValid.success) {
          // Clear invalid token
          await storageService.clearAllData();
        }
      }
      
      // Process any pending sync queue
      await apiService.processSyncQueue();
      
      // Clean up old data
      await storageService.cleanupOldData();
      
    } catch (error) {
      console.error('App initialization error:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await apiService.logout();
      await storageService.clearAllData();
      
      Toast.show({
        type: 'success',
        text1: 'Logged Out',
        text2: 'You have been successfully logged out',
      });
      
      // Navigate to login screen
      // This will be handled by the navigation state
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <PaperProvider>
      <SafeAreaProvider>
        <StatusBar
          barStyle="dark-content"
          backgroundColor={config.UI.CARD_COLOR}
        />
        <NavigationContainer>
          <Stack.Navigator
            screenOptions={{
              headerShown: false,
            }}
          >
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen 
              name="ProjectRegistration" 
              component={ProjectRegistrationScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen 
              name="MRVUpload" 
              component={MRVUploadScreen}
              options={{
                headerShown: false,
              }}
            />
          </Stack.Navigator>
        </NavigationContainer>
        <Toast />
      </SafeAreaProvider>
    </PaperProvider>
  );
};

// Import React components for placeholder screens
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: config.UI.BACKGROUND_COLOR,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: config.UI.TEXT_PRIMARY,
    marginBottom: 8,
  },
  screenSubtitle: {
    fontSize: 16,
    color: config.UI.TEXT_SECONDARY,
    textAlign: 'center',
    marginBottom: 32,
  },
  button: {
    backgroundColor: config.UI.PRIMARY_COLOR,
    borderRadius: config.UI.BORDER_RADIUS,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginBottom: 16,
    minWidth: 200,
    alignItems: 'center',
  },
  logoutButton: {
    backgroundColor: config.UI.ERROR_COLOR,
  },
  buttonText: {
    color: config.UI.CARD_COLOR,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default App;
