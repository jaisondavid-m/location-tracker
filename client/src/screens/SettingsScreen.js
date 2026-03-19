import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../context/AuthContext';

// ── Design tokens ─────────────────────────────────────────────────────────────
const ORANGE      = '#F97316';
const ORANGE_SOFT = 'rgba(249,115,22,0.08)';
const ORANGE_MID  = 'rgba(249,115,22,0.18)';
const NAVY        = '#1A0F0A';
const BG          = '#FFFAF7';
const BORDER      = '#F0EDE8';
const TEXT_1      = '#1A0F0A';
const TEXT_2      = '#7A5C48';
const TEXT_3      = '#BBA898';
const DANGER      = '#F04438';

const SettingsScreen = () => {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [locationEnabled, setLocationEnabled] = useState(true);
  const [loading, setLoading] = useState(false);

  const isParent = user?.role === 'parent';

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
              setLoading(true);
              await logout();
            } catch (error) {
              Alert.alert('Logout Failed', error.message || 'Failed to sign out');
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  // ── Sub-components ──────────────────────────────────────────────────────────
  const Section = ({ title, children }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionCard}>{children}</View>
    </View>
  );

  const SettingRow = ({ icon, label, onPress, rightComponent, danger = false, last = false }) => (
    <TouchableOpacity
      style={[styles.row, last && styles.rowLast]}
      onPress={onPress}
      activeOpacity={onPress ? 0.6 : 1}
      disabled={!onPress && !rightComponent}>
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
        <Icon name={icon} size={16} color={danger ? DANGER : ORANGE} />
      </View>
      <Text style={[styles.rowLabel, danger && styles.rowLabelDanger]}>{label}</Text>
      {rightComponent
        ? rightComponent
        : onPress
          ? <Icon name="chevron-right" size={18} color={TEXT_3} />
          : null}
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <View style={styles.accountCard}>

        <View style={styles.avatarRing}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name
                ? user.name.trim().split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
                : isParent ? 'PA' : 'CH'}
            </Text>
          </View>
        </View>

        <Text style={styles.accountName}>{user?.name || (isParent ? 'Parent' : 'Child')}</Text>
        <Text style={styles.accountEmail}>{user?.email || '—'}</Text>

        <View style={styles.rolePill}>
          <Icon name={isParent ? 'shield-check' : 'star-circle'} size={11} color={ORANGE} />
          <Text style={styles.rolePillText}>{isParent ? 'Parent Account' : 'Child Account'}</Text>
        </View>
      </View>

      {/* ── Preferences ── */}
      <Section title="PREFERENCES">
        <SettingRow
          icon="bell-outline"
          label="Notifications"
          rightComponent={
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: '#E8DED5', true: ORANGE }}
              thumbColor="#fff"
              ios_backgroundColor="#E8DED5"
            />
          }
        />
        <SettingRow
          icon="map-marker-outline"
          label="Location Tracking"
          last
          rightComponent={
            <Switch
              value={locationEnabled}
              onValueChange={setLocationEnabled}
              trackColor={{ false: '#E8DED5', true: ORANGE }}
              thumbColor="#fff"
              ios_backgroundColor="#E8DED5"
            />
          }
        />
      </Section>

      {/* ── App ── */}
      <Section title="APP">
        <SettingRow
          icon="information-outline"
          label="About"
          onPress={() => Alert.alert('About', 'FamGuard v1.0.0')}
        />
        <SettingRow
          icon="file-document-outline"
          label="Terms & Conditions"
          onPress={() => Alert.alert('Terms', 'Terms & Conditions coming soon')}
        />
        <SettingRow
          icon="shield-outline"
          label="Privacy Policy"
          onPress={() => Alert.alert('Privacy', 'Privacy Policy coming soon')}
        />
        <SettingRow
          icon="help-circle-outline"
          label="Help & Support"
          onPress={() => Alert.alert('Support', 'Contact: jaison7373@gmail.com')}
          last
        />
      </Section>

      <Section title="ACCOUNT ACTIONS">
        <SettingRow
          icon="logout-variant"
          label={loading ? 'Signing Out...' : 'Sign Out'}
          onPress={handleLogout}
          danger
          last
          rightComponent={
            loading
              ? <ActivityIndicator color={DANGER} size="small" />
              : <Icon name="chevron-right" size={18} color={DANGER} />
          }
        />
      </Section>

      <Text style={styles.version}>FamGuard · v1.0.0</Text>
      <View style={{ height: 30 }} />
    </ScrollView>
  );
};

export default SettingsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  content:   { paddingBottom: 20 },
  accountCard: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 24,
    alignItems: 'center',
    paddingTop: 36,
    paddingBottom: 22,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    shadowColor: ORANGE,
    shadowOpacity: 0.08,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  avatarRing: {
    padding: 3,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: ORANGE_MID,
    borderStyle: 'dashed',
    marginBottom: 12,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 22,
    backgroundColor: ORANGE_SOFT,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText:    { fontSize: 24, fontWeight: '900', color: ORANGE, letterSpacing: 1 },
  accountName:   { fontSize: 18, fontWeight: '800', color: NAVY, marginBottom: 3 },
  accountEmail:  { fontSize: 13, color: TEXT_2, marginBottom: 12 },
  rolePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: ORANGE_SOFT,
    borderWidth: 1, borderColor: ORANGE_MID,
    borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5,
  },
  rolePillText: { fontSize: 12, fontWeight: '700', color: '#C2570E' },
  section:      { marginHorizontal: 16, marginBottom: 14 },
  sectionTitle: {
    fontSize: 10, fontWeight: '800', color: TEXT_3,
    letterSpacing: 1.4, marginBottom: 8, marginLeft: 4,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    shadowColor: ORANGE,
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: BORDER,
    gap: 12,
  },
  rowLast:        { borderBottomWidth: 0 },
  rowIcon: {
    width: 32, height: 32, borderRadius: 9,
    backgroundColor: ORANGE_SOFT,
    alignItems: 'center', justifyContent: 'center',
  },
  rowIconDanger:  { backgroundColor: 'rgba(240,68,56,0.08)' },
  rowLabel:       { flex: 1, fontSize: 14, fontWeight: '600', color: TEXT_1 },
  rowLabelDanger: { color: DANGER },
  version: {
    textAlign: 'center',
    fontSize: 11, fontWeight: '700',
    color: TEXT_3, letterSpacing: 1.5,
    marginTop: 4,
  },
});