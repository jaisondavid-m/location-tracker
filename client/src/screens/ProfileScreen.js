import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../context/AuthContext';

const ORANGE      = '#F97316';
const ORANGE_SOFT = 'rgba(249,115,22,0.08)';
const ORANGE_MID  = 'rgba(249,115,22,0.18)';
const NAVY        = '#1A0F0A';
const BORDER      = '#F0EDE8';
const BG          = '#FFFAF7';
const TEXT_2      = '#7A5C48';
const TEXT_3      = '#BBA898';
const SUCCESS     = '#12B76A';

const getInitials = name => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase();
};

const InfoRow = ({ icon, label, value, last = false }) => (
  <View style={[styles.infoRow, last && styles.infoRowLast]}>
    <View style={styles.infoIcon}>
      <Icon name={icon} size={15} color={ORANGE} />
    </View>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
  </View>
);

const ProfileScreen = () => {
  const { user } = useAuth();

  const isParent  = user?.role === 'parent';
  const name      = user?.name  || (isParent ? 'Parent' : 'Child');
  const email     = user?.email || '—';
  const userId    = user?.user_id || '—';
  const roleLabel = isParent ? 'Parent Account' : 'Child Account';

  return (
    <SafeAreaView style={styles.safeArea}>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>

        {/* ── Hero card ── */}
        <View style={styles.heroCard}>
          <View style={styles.blobTR} />
          <View style={styles.blobBL} />

          {/* Avatar */}
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{getInitials(name)}</Text>
            </View>
            <View style={styles.onlineDot} />
          </View>

          <Text style={styles.heroName}>{name}</Text>
          <Text style={styles.heroEmail}>{email}</Text>

          {/* Role pill */}
          <View style={styles.rolePill}>
            <Icon
              name={isParent ? 'shield-check' : 'star-circle'}
              size={12}
              color="#C2570E"
            />
            <Text style={styles.rolePillText}>{roleLabel}</Text>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>#{userId}</Text>
              <Text style={styles.statLabel}>USER ID</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{isParent ? 'Parent' : 'Child'}</Text>
              <Text style={styles.statLabel}>ROLE</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.activeRow}>
                <View style={styles.activeDot} />
                <Text style={styles.statValue}>Active</Text>
              </View>
              <Text style={styles.statLabel}>STATUS</Text>
            </View>
          </View>
        </View>

        {/* ── Account info ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT INFO</Text>
          <View style={styles.sectionCard}>
            <InfoRow icon="account-outline"  label="Name"    value={name} />
            <InfoRow icon="email-outline"    label="Email"   value={email} />
            <InfoRow icon="identifier"       label="User ID" value={`#${userId}`} />
            <InfoRow icon="shield-account-outline" label="Role" value={roleLabel} last />
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

export default ProfileScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: BG },
  content:  { padding: 16, paddingBottom: 40 },

  // ── Hero ────────────────────────────────────────────────────────────────────
  heroCard: {
    backgroundColor: '#fff',
    borderRadius: 24,
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: BORDER,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: ORANGE,
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  blobTR: {
    position: 'absolute', top: -30, right: -30,
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: ORANGE_SOFT,
  },
  blobBL: {
    position: 'absolute', bottom: -40, left: -40,
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: 'rgba(249,115,22,0.04)',
  },

  avatarRing: {
    padding: 3,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: ORANGE_MID,
    borderStyle: 'dashed',
    marginBottom: 14,
    position: 'relative',
  },
  avatar: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: ORANGE_SOFT,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 28, fontWeight: '900', color: ORANGE, letterSpacing: 1 },
  onlineDot: {
    position: 'absolute', bottom: 4, right: 4,
    width: 14, height: 14, borderRadius: 7,
    backgroundColor: SUCCESS, borderWidth: 2, borderColor: '#fff',
  },

  heroName:  { fontSize: 20, fontWeight: '800', color: NAVY, marginBottom: 3 },
  heroEmail: { fontSize: 13, color: TEXT_2, marginBottom: 12 },

  rolePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: ORANGE_SOFT,
    borderWidth: 1, borderColor: ORANGE_MID,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6,
    marginBottom: 20,
  },
  rolePillText: { fontSize: 12, fontWeight: '700', color: '#C2570E' },

  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    width: '100%', backgroundColor: BG,
    borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: BORDER,
  },
  statItem:    { flex: 1, alignItems: 'center', gap: 4 },
  statDivider: { width: 1, height: 30, backgroundColor: BORDER },
  statValue:   { fontSize: 14, fontWeight: '800', color: NAVY },
  statLabel:   { fontSize: 9, color: TEXT_3, fontWeight: '700', letterSpacing: 0.8 },
  activeRow:   { flexDirection: 'row', alignItems: 'center', gap: 4 },
  activeDot:   { width: 7, height: 7, borderRadius: 4, backgroundColor: SUCCESS },

  // ── Section ─────────────────────────────────────────────────────────────────
  section:      { marginBottom: 14 },
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

  // ── Info row ─────────────────────────────────────────────────────────────────
  infoRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: BORDER,
    gap: 12,
  },
  infoRowLast: { borderBottomWidth: 0 },
  infoIcon: {
    width: 30, height: 30, borderRadius: 8,
    backgroundColor: ORANGE_SOFT,
    alignItems: 'center', justifyContent: 'center',
  },
  infoLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: NAVY },
  infoValue: { fontSize: 13, color: TEXT_2, maxWidth: 160 },
});