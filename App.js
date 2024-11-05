import React, { useState, useEffect } from 'react';
import { Button, Text, View, StyleSheet, TouchableOpacity, Image, TextInput } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri, useAuthRequest } from 'expo-auth-session';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CLIENT_ID, CLIENT_SECRET } from '@env';
import { MaterialCommunityIcons } from '@expo/vector-icons';

WebBrowser.maybeCompleteAuthSession();
const DEFAULT_AVATAR_URL = 'https://ia800305.us.archive.org/31/items/discordprofilepictures/discordblue.png'; 
const discovery = {
  authorizationEndpoint: 'https://discord.com/api/oauth2/authorize',
  tokenEndpoint: 'https://discord.com/api/oauth2/token',
};

export default function App() {
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const redirectUri = makeRedirectUri({
    scheme: 'authleiber',
    useProxy: true,
  });

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: CLIENT_ID,
      scopes: ['identify'],
      redirectUri,
      usePKCE: true,
    },
    discovery
  );

  const exchangeCodeForToken = async (code, codeVerifier) => {
    try {
      const response = await fetch(discovery.tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
          code_verifier: codeVerifier,
        }).toString(),
      });

      const data = await response.json();
      
      if (data.access_token) {
        await fetchUserInfo(data.access_token);
        await AsyncStorage.setItem('access_token', data.access_token);
      } else {
        console.error("Error al obtener token de acceso:", data);
      }
    } catch (error) {
      console.error("Error al intercambiar el código:", error);
    }
  };

  const fetchUserInfo = async (token) => {
    try {
      const res = await fetch('https://discord.com/api/users/@me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setUser(data);
      await AsyncStorage.setItem('user', JSON.stringify(data));
    } catch (error) {
      console.error("Error al obtener información del usuario:", error);
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('access_token');
    await AsyncStorage.removeItem('user');
    setUser(null);
  };

  useEffect(() => {
    const getStoredUser = async () => {
      const storedUser = await AsyncStorage.getItem('user');
      const token = await AsyncStorage.getItem('access_token');

      if (storedUser && token) {
        setUser(JSON.parse(storedUser));
      }
    };
    getStoredUser();
  }, []);

  useEffect(() => {
    if (response?.type === 'success') {
      const { code } = response.params;
      exchangeCodeForToken(code, request.codeVerifier);
    }
  }, [response]);

  return (
    <View style={styles.container}>
      {user ? (
        <>
          <TouchableOpacity onPress={logout} style={styles.logoutIcon}>
            <MaterialCommunityIcons name="logout" size={24} color="#5865F2" />
          </TouchableOpacity>
          <Image
            source={{
              uri: user.avatar
                ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
                : DEFAULT_AVATAR_URL,
            }}
            style={styles.avatar}
          />
          <Text style={styles.profileName}>{user.username}</Text>
        </>
      ) : (
        <>
          <TextInput
            style={styles.input}
            placeholder="Usuario"
            placeholderTextColor="#000"
            value={username}
            onChangeText={setUsername}
          />
          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            placeholderTextColor="#000"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
          <TouchableOpacity style={styles.loginButton} onPress={() => promptAsync()} disabled={!request}>
            <MaterialCommunityIcons name="discord" size={24} color="white" style={styles.icon} />
            <Text style={styles.loginButtonText}>Continuar con Discord</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  input: {
    width: '100%',
    padding: 10,
    marginVertical: 10,
    borderColor: '#5865F2',
    borderWidth: 2,
    borderRadius: 5,
    backgroundColor: '#ffffff',
    color: '#000',
  },
  loginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5865F2',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    marginTop: 20,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 10,
    fontWeight: 'bold',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 20,
    position: 'absolute',
    top: 50,
    left: 20,
  },
  profileName: {
    color: '#5865F2',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 0,
    position: 'absolute',
    top: 160,
    left: 20,
  },
  logoutIcon: {
    position: 'absolute',
    top: 60,
    right: 20,
  },
});
