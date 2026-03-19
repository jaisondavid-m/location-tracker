import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../context/AuthContext';

const ORANGE      = '#F97316';
const ORANGE_SOFT = 'rgba(249,115,22,0.08)';
const ORANGE_MID  = 'rgba(249,115,22,0.18)';
const BORDER      = '#F0EDE8';

const Header = ({ role }) => {
  const { logout, user } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await logout();
            } catch (error) {
              Alert.alert('Logout Failed', error.message || 'Failed to sign out');
            }
          },
        },
      ],
    );
  };

  const roleLabel = role ?? user?.role ?? '';
  const portalLabel = roleLabel
    ? roleLabel.charAt(0).toUpperCase() + roleLabel.slice(1) + ' Portal'
    : 'Digital Rewards';

  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>

        {/* ── Left: Logo + wordmark ── */}
        <View style={styles.brand}>
          <View style={styles.logoBox}>
            <Icon name="hexagon-outline" size={22} color={ORANGE} style={styles.hexBg} />
            <Icon name="hexagon"         size={13} color={ORANGE} style={styles.hexFg} />
          </View>

          <View style={styles.wordmark}>
            <View style={styles.wordmarkRow}>
              <Text style={styles.appName}>FamGuard</Text>
            </View>
            <Text style={styles.subName}>{portalLabel}</Text>
          </View>
        </View>

        {/* ── Right: Logout ── */}
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.7}>
          <Icon name="logout-variant" size={16} color={ORANGE} />
        </TouchableOpacity>

      </View>

      {/* Orange bottom accent line */}
      <View style={styles.accentLine} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#F97316',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  container: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  logoBox: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: ORANGE_SOFT,
    borderWidth: 1,
    borderColor: ORANGE_MID,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hexBg: { position: 'absolute' },
  hexFg: { position: 'absolute' },
  wordmark:    { gap: 1 },
  wordmarkRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  appName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1A0F0A',
    letterSpacing: 3,
  },
  badge: {
    backgroundColor: ORANGE,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 1,
  },
  subName: {
    fontSize: 10,
    fontWeight: '600',
    color: '#B08060',
    letterSpacing: 0.4,
  },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: ORANGE_SOFT,
    borderWidth: 1,
    borderColor: ORANGE_MID,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accentLine: {
    height: 2,
    backgroundColor: ORANGE,
    opacity: 0.85,
  },
});

export default Header;