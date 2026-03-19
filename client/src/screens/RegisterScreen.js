import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { registerUser } from '../api/axios';

const { width, height } = Dimensions.get('window');

const PARENT_COLOR = '#4F46E5';
const CHILD_COLOR = '#F97316';

const StarBadge = ({ emoji, label, active, onPress, color }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.9, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, tension: 200, friction: 5, useNativeDriver: true }),
    ]).start();
    onPress();
  };
  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.9} style={{ flex: 1 }}>
      <Animated.View style={[
        styles.badge,
        active && { borderColor: color, backgroundColor: color + '15' },
        { transform: [{ scale }] }
      ]}>
        <Text style={styles.badgeEmoji}>{emoji}</Text>
        <Text style={[styles.badgeLabel, active && { color }]}>{label}</Text>
        {active && <View style={[styles.badgeDot, { backgroundColor: color }]} />}
      </Animated.View>
    </TouchableOpacity>
  );
};

const RegisterScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('child');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);

  const slideAnim = useRef(new Animated.Value(60)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacityAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 50, friction: 9, useNativeDriver: true }),
    ]).start();
  }, []);

  const isChild = role === 'child';
  const accentColor = isChild ? CHILD_COLOR : PARENT_COLOR;

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert(isChild ? '😬 Oops!' : 'Missing Info', 'All fields are required');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Too Short', 'Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Not Matching', 'Passwords do not match');
      return;
    }
    try {
      setLoading(true);
      await registerUser({ name, email, password, role });
      Alert.alert(
        isChild ? '🎉 You\'re in!' : '✅ Account Created',
        isChild ? 'Welcome to FamGuard, adventurer!' : 'Your parent account is ready.',
        [{ text: isChild ? 'Let\'s go! 🚀' : 'Sign In', onPress: () => navigation.navigate('Login') }]
      );
    } catch (error) {
      Alert.alert('Registration Failed', error.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f8f8ff' }} contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" />

      {/* Header arc */}
      <View style={[styles.headerArc, { backgroundColor: accentColor }]}>
        {/* Decorative dots */}
        <View style={[styles.dot, { top: 30, left: 20, width: 12, height: 12, opacity: 0.3 }]} />
        <View style={[styles.dot, { top: 60, left: 60, width: 8, height: 8, opacity: 0.2 }]} />
        <View style={[styles.dot, { top: 20, right: 40, width: 20, height: 20, opacity: 0.15 }]} />
        <View style={[styles.dot, { top: 70, right: 80, width: 10, height: 10, opacity: 0.25 }]} />

        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <View style={[styles.headerIcon, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
            <Text style={{ fontSize: 36 }}>{isChild ? '🌟' : '🏠'}</Text>
          </View>
          <Text style={styles.headerTitle}>Join FamGuard</Text>
          <Text style={styles.headerSub}>{isChild ? 'Create your adventurer profile!' : 'Set up family protection'}</Text>
        </View>
      </View>

      <Animated.View style={[styles.body, { opacity: opacityAnim, transform: [{ translateY: slideAnim }] }]}>

        {/* Role selector */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>I am a...</Text>
          <View style={styles.badgeRow}>
            <StarBadge
              emoji="👨‍👩‍👧"
              label="Parent"
              active={role === 'parent'}
              color={PARENT_COLOR}
              onPress={() => setRole('parent')}
            />
            <View style={{ width: 12 }} />
            <StarBadge
              emoji="🧒"
              label="Child"
              active={role === 'child'}
              color={CHILD_COLOR}
              onPress={() => setRole('child')}
            />
          </View>
        </View>

        {/* Child fun banner */}
        {isChild && (
          <View style={styles.funBanner}>
            <Text style={styles.funBannerEmoji}>🎮 🗺️ 🚀 📍 ⭐</Text>
            <Text style={styles.funBannerText}>Your parents can see where you are. Stay safe, have fun!</Text>
          </View>
        )}

        {/* Form */}
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>{isChild ? '✏️ Your Details' : 'Account Info'}</Text>

          <InputField
            icon="👤"
            placeholder={isChild ? "Your cool nickname" : "Full Name"}
            value={name}
            onChangeText={setName}
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            accentColor={accentColor}
          />

          <InputField
            ref={emailRef}
            icon="✉️"
            placeholder="Email address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            accentColor={accentColor}
          />

          <PasswordField
            ref={passwordRef}
            placeholder="Create a password"
            value={password}
            onChangeText={setPassword}
            show={showPass}
            onToggle={() => setShowPass(!showPass)}
            returnKeyType="next"
            onSubmitEditing={() => confirmRef.current?.focus()}
            accentColor={accentColor}
          />

          {password.length > 0 && (
            <PasswordStrength password={password} accentColor={accentColor} />
          )}

          <PasswordField
            ref={confirmRef}
            placeholder="Confirm password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            show={showConfirmPass}
            onToggle={() => setShowConfirmPass(!showConfirmPass)}
            returnKeyType="done"
            onSubmitEditing={handleRegister}
            accentColor={accentColor}
            isMatch={confirmPassword.length > 0 ? password === confirmPassword : null}
          />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: accentColor, shadowColor: accentColor }, loading && { opacity: 0.6 }]}
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.85}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitText}>
              {isChild ? '🚀 Create My Profile!' : 'Create Account →'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.signinLink}>
          <Text style={styles.signinText}>
            Already have an account?{' '}
            <Text style={[styles.signinHighlight, { color: accentColor }]}>Sign In</Text>
          </Text>
        </TouchableOpacity>

        <View style={{ height: 30 }} />
      </Animated.View>
    </ScrollView>
  );
};

// Sub-components

const InputField = React.forwardRef(({ icon, accentColor, ...props }, ref) => (
  <View style={inputStyles.wrap}>
    <Text style={inputStyles.icon}>{icon}</Text>
    <TextInput
      ref={ref}
      style={inputStyles.input}
      placeholderTextColor="#bbb"
      {...props}
    />
  </View>
));

const PasswordField = React.forwardRef(({ placeholder, value, onChangeText, show, onToggle, accentColor, isMatch, ...props }, ref) => (
  <View style={[inputStyles.wrap, isMatch === false && inputStyles.wrapError, isMatch === true && inputStyles.wrapSuccess]}>
    <Text style={inputStyles.icon}>🔒</Text>
    <TextInput
      ref={ref}
      style={[inputStyles.input, { flex: 1 }]}
      placeholder={placeholder}
      placeholderTextColor="#bbb"
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={!show}
      {...props}
    />
    <TouchableOpacity onPress={onToggle}>
      <Text style={{ fontSize: 18 }}>{show ? '🙈' : '👁️'}</Text>
    </TouchableOpacity>
    {isMatch === true && <Text style={{ fontSize: 16, marginLeft: 6 }}>✅</Text>}
  </View>
));

const PasswordStrength = ({ password, accentColor }) => {
  const strength = password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const labels = ['Weak', 'Good', 'Strong'];
  const colors = ['#ef4444', '#f59e0b', '#22c55e'];
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingHorizontal: 4 }}>
      {[1, 2, 3].map(i => (
        <View key={i} style={{ flex: 1, height: 4, borderRadius: 4, backgroundColor: i <= strength ? colors[strength - 1] : '#e5e7eb', marginRight: i < 3 ? 4 : 0 }} />
      ))}
      <Text style={{ marginLeft: 8, fontSize: 11, color: colors[strength - 1], fontWeight: '700' }}>{labels[strength - 1]}</Text>
    </View>
  );
};

const inputStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f5f5fc',
    borderRadius: 14, paddingHorizontal: 14,
    marginBottom: 12,
    borderWidth: 1.5, borderColor: '#eeeef5',
  },
  wrapError: { borderColor: '#ef4444', backgroundColor: '#fff5f5' },
  wrapSuccess: { borderColor: '#22c55e', backgroundColor: '#f0fdf4' },
  icon: { fontSize: 18, marginRight: 10 },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: '#1a1a2e' },
});

const styles = StyleSheet.create({
  headerArc: {
    paddingTop: 50, paddingBottom: 50, paddingHorizontal: 24,
    borderBottomLeftRadius: 40, borderBottomRightRadius: 40,
    position: 'relative', overflow: 'hidden',
  },
  dot: { position: 'absolute', borderRadius: 100, backgroundColor: '#fff' },
  backBtn: { marginBottom: 20 },
  backText: { color: 'rgba(255,255,255,0.9)', fontSize: 15, fontWeight: '600' },
  headerContent: { alignItems: 'center' },
  headerIcon: {
    width: 80, height: 80, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  headerTitle: { fontSize: 26, fontWeight: '900', color: '#fff', marginBottom: 6 },
  headerSub: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },

  body: { paddingHorizontal: 20, paddingTop: 24 },

  section: { marginBottom: 16 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#666', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 },
  badgeRow: { flexDirection: 'row' },
  badge: {
    borderWidth: 2, borderColor: '#e5e7eb', borderRadius: 16,
    paddingVertical: 16, alignItems: 'center', backgroundColor: '#fff',
    position: 'relative',
  },
  badgeEmoji: { fontSize: 32, marginBottom: 6 },
  badgeLabel: { fontSize: 14, fontWeight: '700', color: '#666' },
  badgeDot: { position: 'absolute', top: 10, right: 10, width: 8, height: 8, borderRadius: 4 },

  funBanner: {
    backgroundColor: '#fff7ed',
    borderRadius: 16, padding: 14,
    borderWidth: 1.5, borderColor: '#fed7aa',
    marginBottom: 16, alignItems: 'center',
  },
  funBannerEmoji: { fontSize: 22, marginBottom: 6, letterSpacing: 4 },
  funBannerText: { fontSize: 13, color: '#92400e', textAlign: 'center', lineHeight: 18 },

  formCard: {
    backgroundColor: '#fff',
    borderRadius: 20, padding: 20,
    shadowColor: '#4F46E5', shadowOpacity: 0.06, shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 }, elevation: 4,
    marginBottom: 16,
  },
  formTitle: { fontSize: 16, fontWeight: '800', color: '#1a1a2e', marginBottom: 16 },


  submitBtn: {
    borderRadius: 16, paddingVertical: 18,
    alignItems: 'center', marginBottom: 16,
    shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },

  signinLink: { alignItems: 'center', paddingVertical: 4 },
  signinText: { fontSize: 14, color: '#888' },
  signinHighlight: { fontWeight: '700' },
});

export default RegisterScreen;