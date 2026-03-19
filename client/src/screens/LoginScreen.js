import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
  StatusBar,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';

const { width, height } = Dimensions.get('window');

// Floating bubble component
const Bubble = ({ style, size, delay }) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 3000 + delay, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 3000 + delay, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -18] });
  return (
    <Animated.View style={[styles.bubble, style, { width: size, height: size, borderRadius: size / 2, transform: [{ translateY }] }]} />
  );
};

const LoginScreen = ({ navigation }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [activeRole, setActiveRole] = useState('parent');
  const passwordRef = useRef(null);

  // Entrance animations
  const logoAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(40)).current;
  const formOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoAnim, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true }),
      Animated.timing(formOpacity, { toValue: 1, duration: 700, delay: 300, useNativeDriver: true }),
      Animated.timing(formAnim, { toValue: 0, duration: 700, delay: 300, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Oops!', 'Please enter your email and password');
      return;
    }
    try {
      setLoading(true);
      await login(email.trim(), password);
    } catch (error) {
      Alert.alert('Login Failed', error.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const isParent = activeRole === 'parent';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <StatusBar barStyle="light-content" />

      {/* Gradient BG via layered views */}
      <View style={[styles.bgTop, isParent ? styles.bgParent : styles.bgChild]} />
      <View style={styles.bgBottom} />

      {/* Floating bubbles */}
      <Bubble style={{ top: 60, left: 30, opacity: 0.15 }} size={80} delay={0} />
      <Bubble style={{ top: 120, right: 20, opacity: 0.1 }} size={50} delay={800} />
      <Bubble style={{ top: 200, left: width * 0.6, opacity: 0.12 }} size={35} delay={400} />
      <Bubble style={{ top: 30, right: 90, opacity: 0.08 }} size={100} delay={1200} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top section — logo & role selector */}
        <Animated.View style={[styles.topSection, { transform: [{ scale: logoAnim }] }]}>
          <View style={styles.iconWrap}>
            <Text style={styles.iconEmoji}>{isParent ? '🛡️' : '⭐'}</Text>
          </View>
          <Text style={styles.appName}>FamGuard</Text>
          <Text style={styles.tagline}>{isParent ? 'Keep your family safe' : 'Adventure awaits!'}</Text>

          {/* Role toggle */}
          <View style={styles.roleToggle}>
            <TouchableOpacity
              style={[styles.roleTab, activeRole === 'parent' && styles.roleTabActive]}
              onPress={() => setActiveRole('parent')}>
              <Text style={styles.roleTabEmoji}>👨‍👩‍👧</Text>
              <Text style={[styles.roleTabText, activeRole === 'parent' && styles.roleTabTextActive]}>Parent</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleTab, activeRole === 'child' && styles.roleTabActiveChild]}
              onPress={() => setActiveRole('child')}>
              <Text style={styles.roleTabEmoji}>🧒</Text>
              <Text style={[styles.roleTabText, activeRole === 'child' && styles.roleTabTextActiveChild]}>Child</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* Card form */}
        <Animated.View style={[styles.card, { opacity: formOpacity, transform: [{ translateY: formAnim }] }]}>
          <Text style={styles.cardTitle}>Welcome back!</Text>
          <Text style={styles.cardSub}>Sign in to continue</Text>

          <View style={styles.inputWrap}>
            <Text style={styles.inputIcon}>✉️</Text>
            <TextInput
              style={styles.input}
              placeholder="Email address"
              placeholderTextColor="#aab"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />
          </View>

          <View style={styles.inputWrap}>
            <Text style={styles.inputIcon}>🔑</Text>
            <TextInput
              ref={passwordRef}
              style={[styles.input, { flex: 1 }]}
              placeholder="Password"
              placeholderTextColor="#aab"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
              <Text style={styles.eyeText}>{showPass ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, isParent ? styles.loginBtnParent : styles.loginBtnChild, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.loginBtnText}>{isParent ? 'Sign In as Parent' : '🚀 Let\'s Go!'}</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.divLine} />
            <Text style={styles.divText}>or</Text>
            <View style={styles.divLine} />
          </View>

          <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.switchBtn}>
            <Text style={styles.switchText}>
              New here? <Text style={[styles.switchLink, isParent ? styles.switchLinkParent : styles.switchLinkChild]}>Create account →</Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const PARENT_COLOR = '#4F46E5';
const CHILD_COLOR = '#F97316';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  scrollContent: { flexGrow: 1 },

  bgTop: { position: 'absolute', top: 0, left: 0, right: 0, height: height * 0.52, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  bgParent: { backgroundColor: '#4F46E5' },
  bgChild: { backgroundColor: '#F97316' },
  bgBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, top: height * 0.4, backgroundColor: '#f8f8ff' },

  bubble: { position: 'absolute', backgroundColor: '#fff' },

  topSection: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 24 },
  iconWrap: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 },
  },
  iconEmoji: { fontSize: 40 },
  appName: { fontSize: 30, fontWeight: '900', color: '#fff', letterSpacing: 1, fontFamily: 'System' },
  tagline: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 4, marginBottom: 20 },

  roleToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 50,
    padding: 4,
    gap: 4,
  },
  roleTab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 20,
    borderRadius: 50,
  },
  roleTabActive: { backgroundColor: '#fff' },
  roleTabActiveChild: { backgroundColor: '#fff' },
  roleTabEmoji: { fontSize: 16 },
  roleTabText: { fontSize: 14, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },
  roleTabTextActive: { color: PARENT_COLOR },
  roleTabTextActiveChild: { color: CHILD_COLOR },

  card: {
    margin: 20,
    marginTop: 24,
    backgroundColor: '#fff',
    borderRadius: 28,
    padding: 28,
    shadowColor: '#4F46E5',
    shadowOpacity: 0.12,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  cardTitle: { fontSize: 22, fontWeight: '800', color: '#1a1a2e', marginBottom: 4 },
  cardSub: { fontSize: 13, color: '#888', marginBottom: 24 },

  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f5f5fc',
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#eeeef5',
  },
  inputIcon: { fontSize: 18, marginRight: 10 },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1a1a2e',
  },
  eyeBtn: { paddingLeft: 8 },
  eyeText: { fontSize: 18 },

  loginBtn: {
    borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 6,
    shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 },
  },
  loginBtnParent: { backgroundColor: PARENT_COLOR, shadowColor: PARENT_COLOR },
  loginBtnChild: { backgroundColor: CHILD_COLOR, shadowColor: CHILD_COLOR },
  loginBtnDisabled: { opacity: 0.6 },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  divLine: { flex: 1, height: 1, backgroundColor: '#eee' },
  divText: { marginHorizontal: 12, color: '#bbb', fontSize: 13 },

  switchBtn: { alignItems: 'center' },
  switchText: { fontSize: 14, color: '#888' },
  switchLink: { fontWeight: '700' },
  switchLinkParent: { color: PARENT_COLOR },
  switchLinkChild: { color: CHILD_COLOR },
});

export default LoginScreen;