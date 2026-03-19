/**
 * ParentHome.jsx  –  Classic production UI
 *
 * Design language: warm cream palette, DM Serif Display greeting,
 * refined card borders, bottom sheet with character preview dots,
 * subtle status indicators, and a restrained orange accent system.
 */

import React, {
  useState, useEffect, useCallback, useRef, useMemo, memo,
} from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Alert, ActivityIndicator, SafeAreaView,
  Modal, Animated, Pressable, KeyboardAvoidingView,
  Platform, RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../context/AuthContext';
import { pairWithChild, getMyChildren, getLatestLocation } from '../api/axios';

// ─── Design tokens ────────────────────────────────────────────────────────────
const T = {
  // Core
  bg:        '#faf9f6',
  surface:   '#f3f1ec',
  surfaceAlt:'#eceae3',
  white:     '#ffffff',
  border:    '#e4e2db',
  borderMid: '#d4d1c8',

  // Text
  text:      '#1a1a18',
  textSub:   '#4a4a44',
  textMuted: '#8a8a82',

  // Brand
  primary:      '#d4622a',
  primaryLight: '#fdf0e8',
  primaryMid:   '#f5c4a0',
  primaryDark:  '#a84e22',

  // Semantic
  success:      '#2d7a4a',
  successLight: '#eaf3ee',
  warning:      '#b56b0e',
  warningLight: '#fef4e4',
  danger:       '#a32d2d',
  dangerLight:  '#fdf0f0',

  overlay: 'rgba(20,20,18,0.52)',

  radius: { sm: 6, md: 10, lg: 14, xl: 20, pill: 50 },
};

const POLL_INTERVAL_MS   = 15_000;
const OFFLINE_THRESHOLD_S = 120;

// ─── Hooks ────────────────────────────────────────────────────────────────────
function usePollLocations(children) {
  const [locationMap, setLocationMap]     = useState({});
  const [lastRefreshed, setLastRefreshed] = useState(null);
  const timerRef = useRef(null);

  const poll = useCallback(async (list) => {
    if (!list?.length) return;
    const results = await Promise.allSettled(
      list.map(c => getLatestLocation(c.child_id))
    );
    setLocationMap(prev => {
      const next = { ...prev };
      list.forEach((c, i) => {
        if (results[i].status === 'fulfilled') next[c.child_id] = results[i].value;
      });
      return next;
    });
    setLastRefreshed(new Date());
  }, []);

  useEffect(() => {
    if (!children.length) return;
    poll(children);
    timerRef.current = setInterval(() => poll(children), POLL_INTERVAL_MS);
    return () => clearInterval(timerRef.current);
  }, [children, poll]);

  return { locationMap, lastRefreshed, refresh: useCallback(() => poll(children), [children, poll]) };
}

function useAddChild(userId, onSuccess) {
  const [code, setCode]       = useState('');
  const [pairing, setPairing] = useState(false);

  const submit = useCallback(async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      Alert.alert('Missing Code', "Enter the 6-character code from your child's device.");
      return;
    }
    try {
      setPairing(true);
      const res = await pairWithChild(userId, trimmed);
      setCode('');
      onSuccess(res.child_id);
    } catch (err) {
      Alert.alert('Pairing Failed', err.message || 'Please check the code and try again.');
    } finally {
      setPairing(false);
    }
  }, [code, userId, onSuccess]);

  return { code, setCode, pairing, submit };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getStatus(loc, nowMs = Date.now()) {
  if (!loc) return 'unknown';
  return (nowMs - new Date(loc.recorded_at)) / 1000 <= OFFLINE_THRESHOLD_S
    ? 'online' : 'offline';
}

function formatAge(ts, nowMs = Date.now()) {
  const s = Math.floor((nowMs - new Date(ts)) / 1000);
  if (s < 60)   return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ago`;
}

function initials(name, fallbackId) {
  return (name || `C${fallbackId}`)
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// ─── StatusDot ────────────────────────────────────────────────────────────────
const StatusDot = memo(({ status }) => (
  <View style={[
    styles.statusDot,
    { backgroundColor: status === 'online' ? T.success : T.textMuted },
  ]} />
));

// ─── LocationRow ──────────────────────────────────────────────────────────────
const LocationRow = memo(({ loc, nowMs }) => {
  if (!loc) return (
    <Text style={styles.locUnknown}>Location unavailable</Text>
  );
  return (
    <View style={styles.locRow}>
      <Icon name="crosshairs-gps" size={11} color={T.success} />
      <Text style={styles.locCoords} numberOfLines={1}>
        {Number(loc.latitude).toFixed(5)}, {Number(loc.longitude).toFixed(5)}
      </Text>
      <Text style={styles.locAge}>{formatAge(loc.recorded_at, nowMs)}</Text>
    </View>
  );
});

// ─── ChildCard ────────────────────────────────────────────────────────────────
// Two avatar accent colors cycling between children
const AVATAR_SCHEMES = [
  { bg: T.primaryLight, text: T.primary,  border: T.primaryMid },
  { bg: '#eff4fe',      text: '#2563b0',  border: '#bfcff7'    },
  { bg: '#eaf3ee',      text: T.success,  border: '#9fd4b8'    },
  { bg: '#fef4e4',      text: T.warning,  border: '#f0c87a'    },
];

const ChildCard = memo(({ item, loc, colorIdx, isSelected, onPress, nowMs }) => {
  const status = getStatus(loc, nowMs);
  const scheme = AVATAR_SCHEMES[colorIdx % AVATAR_SCHEMES.length];
  const init   = initials(item.child_name, item.child_id);

  return (
    <TouchableOpacity
      style={[
        styles.childCard,
        isSelected && styles.childCardSelected,
      ]}
      activeOpacity={0.8}
      onPress={onPress}
      accessibilityLabel={`View map for ${item.child_name || 'child'}`}
      accessibilityRole="button"
    >
      {/* Avatar */}
      <View style={styles.avatarWrap}>
        <View style={[styles.avatar, {
          backgroundColor: scheme.bg,
          borderColor: scheme.border,
        }]}>
          <Text style={[styles.avatarText, { color: scheme.text }]}>{init}</Text>
        </View>
        <StatusDot status={status} />
      </View>

      {/* Info */}
      <View style={styles.cardInfo}>
        <View style={styles.nameRow}>
          <Text style={styles.childName} numberOfLines={1}>
            {item.child_name || `Child ${item.child_id}`}
          </Text>
          <View style={[
            styles.statusPill,
            { backgroundColor: status === 'online' ? T.successLight : T.surface },
          ]}>
            <Text style={[
              styles.statusPillText,
              { color: status === 'online' ? T.success : T.textMuted },
            ]}>
              {status === 'online' ? 'Online' : status === 'offline' ? 'Offline' : 'No data'}
            </Text>
          </View>
        </View>

        <LocationRow loc={loc} nowMs={nowMs} />

        <Text style={styles.linkedAt}>
          Linked{' '}
          {new Date(item.linked_at).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
          })}
        </Text>
      </View>

      <Icon
        name={isSelected ? 'map-marker-radius' : 'chevron-right'}
        size={18}
        color={isSelected ? T.primary : T.textMuted}
      />
    </TouchableOpacity>
  );
});

// ─── Live badge ───────────────────────────────────────────────────────────────
const LiveBadge = memo(({ lastRefreshed, nowMs }) => {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(pulse, { toValue: 1.6, duration: 280, useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 1,   duration: 280, useNativeDriver: true }),
    ]).start();
  }, [lastRefreshed]);

  const timeStr = lastRefreshed ? formatAge(lastRefreshed, nowMs) : '—';

  return (
    <View style={styles.liveBadge}>
      <Animated.View style={[styles.liveDot, { transform: [{ scale: pulse }] }]} />
      <Text style={styles.liveBadgeText}>Live · {timeStr}</Text>
    </View>
  );
});

// ─── Character dots preview ───────────────────────────────────────────────────
const CodeDots = memo(({ code }) => (
  <View style={styles.codeDots}>
    {Array.from({ length: 6 }).map((_, i) => (
      <View
        key={i}
        style={[styles.codeDot, code[i] ? styles.codeDotFilled : null]}
      >
        {code[i] ? (
          <Text style={styles.codeDotChar}>{code[i]}</Text>
        ) : null}
      </View>
    ))}
  </View>
));

// ─── Add Child Sheet ──────────────────────────────────────────────────────────
const AddChildSheet = memo(({ visible, onClose, onPaired }) => {
  const { user } = useAuth();
  const slideY  = useRef(new Animated.Value(500)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const inputRef = useRef(null);

  const { code, setCode, pairing, submit } = useAddChild(user.user_id, (childId) => {
    Alert.alert('Child Added', `Successfully linked child ID: ${childId}`);
    onPaired();
    onClose();
  });

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(slideY,  { toValue: 0, tension: 70, friction: 12, useNativeDriver: true }),
      ]).start();
      setTimeout(() => inputRef.current?.focus(), 350);
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 160, useNativeDriver: true }),
        Animated.timing(slideY,  { toValue: 500, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View style={[styles.overlay, { opacity }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      </Animated.View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.sheetOuter}
        pointerEvents="box-none"
      >
        <Animated.View style={[styles.sheet, { transform: [{ translateY: slideY }] }]}>
          {/* Handle */}
          <View style={styles.sheetHandle} />

          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.sheetIconBox}>
              <Icon name="account-plus" size={20} color={T.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetTitle}>Add a Child</Text>
              <Text style={styles.sheetSubtitle}>Enter the 6-character code from their device</Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              accessibilityLabel="Close"
              accessibilityRole="button"
            >
              <Icon name="close" size={16} color={T.textSub} />
            </TouchableOpacity>
          </View>

          {/* Character dot preview */}
          <CodeDots code={code} />

          {/* Text input (hidden visually, drives dots) */}
          <View style={styles.codeInputWrap}>
            <Icon name="key-variant" size={15} color={T.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              ref={inputRef}
              style={styles.codeInput}
              placeholder="a3f9c1"
              placeholderTextColor={T.textMuted}
              value={code}
              onChangeText={t => setCode(t.toLowerCase().replace(/[^a-z0-9]/g, ''))}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={6}
              onSubmitEditing={submit}
              returnKeyType="done"
              accessibilityLabel="Pairing code input"
            />
            <Text style={styles.codeCounter}>{code.length}/6</Text>
          </View>

          {/* Instruction */}
          <View style={styles.instructionBox}>
            <Icon name="information-outline" size={13} color={T.primary} style={{ marginTop: 1 }} />
            <Text style={styles.instructionText}>
              Open the child app → tap <Text style={styles.instructionBold}>Show My Code</Text> → enter it here.
            </Text>
          </View>

          {/* CTA */}
          <TouchableOpacity
            style={[
              styles.submitBtn,
              (pairing || code.length < 6) && styles.submitBtnDisabled,
            ]}
            onPress={submit}
            disabled={pairing || code.length < 6}
            activeOpacity={0.85}
            accessibilityLabel="Pair child"
            accessibilityRole="button"
          >
            {pairing
              ? <ActivityIndicator color="#fff" size="small" />
              : (
                <>
                  <Icon name="link-variant" size={17} color="#fff" />
                  <Text style={styles.submitBtnText}>Pair Child</Text>
                </>
              )}
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
});

// ─── Empty state ──────────────────────────────────────────────────────────────
const EmptyState = memo(({ onAdd }) => (
  <View style={styles.emptyState}>
    <View style={styles.emptyIconBox}>
      <Icon name="account-child-circle" size={46} color={T.primary} />
    </View>
    <Text style={styles.emptyTitle}>No children linked yet</Text>
    <Text style={styles.emptyBody}>
      Add your child's device using the pairing code shown on their app.
    </Text>
    <TouchableOpacity
      style={styles.emptyAddBtn}
      onPress={onAdd}
      accessibilityLabel="Add first child"
      accessibilityRole="button"
    >
      <Icon name="plus" size={17} color="#fff" />
      <Text style={styles.emptyAddBtnText}>Add First Child</Text>
    </TouchableOpacity>
  </View>
));

// ─── Screen ───────────────────────────────────────────────────────────────────
const ParentHome = ({ navigation }) => {
  const { user } = useAuth();

  const [children, setChildren]      = useState([]);
  const [loadingList, setLoadingList] = useState(false);
  const [refreshing, setRefreshing]  = useState(false);
  const [sheetOpen, setSheetOpen]    = useState(false);
  const [selectedId, setSelectedId]  = useState(null);
  const [nowMs, setNowMs]            = useState(Date.now());

  const { locationMap, lastRefreshed, refresh: pollNow } = usePollLocations(children);

  const openFamilyMap = useCallback((childId = null) => {
    navigation.navigate('FamilyMap', childId ? { childId } : undefined);
  }, [navigation]);

  const fetchChildren = useCallback(async (opts = {}) => {
    try {
      if (!opts.silent) setLoadingList(true);
      const res = await getMyChildren(user.user_id);
      setChildren(res.children || []);
    } catch (err) {
      Alert.alert('Error', err.message);
    } finally {
      setLoadingList(false);
      setRefreshing(false);
    }
  }, [user.user_id]);

  useEffect(() => { fetchChildren(); }, [fetchChildren]);

  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchChildren({ silent: true });
    pollNow();
  }, [fetchChildren, pollNow]);

  // ── List header ─────────────────────────────────────────────────────────────
  const ListHeader = useMemo(() => (
    <View style={styles.listHeader}>
      {/* Greeting */}
      <View style={styles.greetRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greetSub}>Welcome back</Text>
          <Text style={styles.greetName}>
            {user.name || 'Parent'} 
          </Text>
        </View>
        {children.length > 0 && (
          <TouchableOpacity
            style={styles.familyMapBtn}
            onPress={() => openFamilyMap()}
            accessibilityLabel="Open family map"
            accessibilityRole="button"
          >
            <Icon name="map-search" size={15} color={T.primary} />
            <Text style={styles.familyMapBtnText}>Family Map</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Section title row */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>
          {children.length
            ? `${children.length} ${children.length === 1 ? 'Child' : 'Children'}`
            : 'Children'}
        </Text>
        {children.length > 0 && <LiveBadge lastRefreshed={lastRefreshed} nowMs={nowMs} />}
      </View>

      {loadingList && !refreshing && (
        <ActivityIndicator color={T.primary} style={{ marginVertical: 10 }} />
      )}
    </View>
  ), [children.length, user.name, lastRefreshed, nowMs, loadingList, refreshing, openFamilyMap]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={children}
        keyExtractor={(item, i) => String(item.child_id ?? i)}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={T.primary}
            colors={[T.primary]}
          />
        }
        ListHeaderComponent={ListHeader}
        renderItem={({ item, index }) => (
          <ChildCard
            item={item}
            loc={locationMap[item.child_id]}
            colorIdx={index}
            isSelected={selectedId === item.child_id}
            nowMs={nowMs}
            onPress={() => {
              setSelectedId(item.child_id);
              openFamilyMap(item.child_id);
            }}
          />
        )}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        ListEmptyComponent={
          !loadingList
            ? <EmptyState onAdd={() => setSheetOpen(true)} />
            : null
        }
      />

      {/* FAB */}
      {children.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => setSheetOpen(true)}
          activeOpacity={0.85}
          accessibilityLabel="Add child"
          accessibilityRole="button"
        >
          <Icon name="plus" size={22} color="#fff" />
        </TouchableOpacity>
      )}

      {/* Bottom sheet */}
      <AddChildSheet
        visible={sheetOpen}
        onClose={() => setSheetOpen(false)}
        onPaired={() => fetchChildren({ silent: true })}
      />
    </SafeAreaView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: T.bg },
  listContent: { padding: 20, paddingBottom: 110 },

  // ── Header ──────────────────────────────────────────────────────────────────
  listHeader:  { marginBottom: 18 },

  greetRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 22 },
  greetSub:    { fontSize: 12, color: T.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 3 },
  greetName:   { fontSize: 26, fontWeight: '700', color: T.text, letterSpacing: -0.5 },

  familyMapBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: T.primary, borderRadius: T.radius.pill,
    paddingHorizontal: 14, paddingVertical: 8,
    backgroundColor: T.primaryLight,
  },
  familyMapBtnText: { fontSize: 12, fontWeight: '700', color: T.primary },

  sectionRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: T.textSub, letterSpacing: 0.6, textTransform: 'uppercase' },

  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: T.successLight, borderRadius: T.radius.pill,
    paddingHorizontal: 10, paddingVertical: 4,
  },
  liveDot:       { width: 6, height: 6, borderRadius: 3, backgroundColor: T.success },
  liveBadgeText: { fontSize: 11, color: T.success, fontWeight: '700' },

  // ── Child card ───────────────────────────────────────────────────────────────
  childCard: {
    backgroundColor: T.white,
    borderRadius: T.radius.lg,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  childCardSelected: {
    borderColor: T.primary,
    borderWidth: 1.5,
    backgroundColor: '#fffdfb',
  },

  avatarWrap: { position: 'relative', marginRight: 14 },
  avatar: {
    width: 50, height: 50, borderRadius: 25,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5,
  },
  avatarText: { fontSize: 15, fontWeight: '700' },
  statusDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 12, height: 12, borderRadius: 6,
    borderWidth: 2.5, borderColor: T.white,
  },

  cardInfo:    { flex: 1, gap: 3 },
  nameRow:     { flexDirection: 'row', alignItems: 'center', gap: 8 },
  childName:   { fontSize: 15, fontWeight: '600', color: T.text, flex: 1 },
  statusPill:  { borderRadius: T.radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  statusPillText: { fontSize: 10, fontWeight: '700' },

  locRow:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locCoords: { fontSize: 11, color: T.textSub, flex: 1, fontVariant: ['tabular-nums'] },
  locAge:    { fontSize: 10, color: T.textMuted },
  locUnknown:{ fontSize: 11, color: T.textMuted, fontStyle: 'italic' },
  linkedAt:  { fontSize: 10, color: T.textMuted },

  // ── Empty state ──────────────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center', paddingTop: 64, paddingHorizontal: 36,
  },
  emptyIconBox: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: T.primaryLight,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1.5, borderColor: T.primaryMid,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: T.text, textAlign: 'center', marginBottom: 8 },
  emptyBody:  { fontSize: 13, color: T.textMuted, textAlign: 'center', lineHeight: 19, marginBottom: 28 },
  emptyAddBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: T.primary, borderRadius: T.radius.pill,
    paddingHorizontal: 24, paddingVertical: 13,
    shadowColor: T.primary, shadowOpacity: 0.28, shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  emptyAddBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // ── FAB ──────────────────────────────────────────────────────────────────────
  fab: {
    position: 'absolute', bottom: 32, right: 22,
    width: 54, height: 54, borderRadius: 27,
    backgroundColor: T.primary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: T.primary, shadowOpacity: 0.35, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 7,
  },

  // ── Bottom sheet ─────────────────────────────────────────────────────────────
  overlay:    { ...StyleSheet.absoluteFillObject, backgroundColor: T.overlay },
  sheetOuter: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: T.white,
    borderTopLeftRadius: T.radius.xl,
    borderTopRightRadius: T.radius.xl,
    paddingHorizontal: 22,
    paddingBottom: Platform.OS === 'ios' ? 44 : 30,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: T.border,
  },
  sheetHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: T.borderMid,
    alignSelf: 'center', marginBottom: 20,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: 12, marginBottom: 22,
  },
  sheetIconBox: {
    width: 42, height: 42, borderRadius: T.radius.md,
    backgroundColor: T.primaryLight,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: T.primaryMid,
  },
  sheetTitle:    { fontSize: 16, fontWeight: '700', color: T.text },
  sheetSubtitle: { fontSize: 12, color: T.textMuted, marginTop: 2 },
  closeBtn: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: T.surface,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: T.border,
  },

  // ── Code dots ────────────────────────────────────────────────────────────────
  codeDots: {
    flexDirection: 'row', gap: 8,
    marginBottom: 16, justifyContent: 'center',
  },
  codeDot: {
    width: 40, height: 44, borderRadius: T.radius.md,
    backgroundColor: T.surface,
    borderWidth: 1.5, borderColor: T.border,
    justifyContent: 'center', alignItems: 'center',
  },
  codeDotFilled: {
    backgroundColor: T.primaryLight,
    borderColor: T.primary,
  },
  codeDotChar: { fontSize: 18, fontWeight: '700', color: T.primary, letterSpacing: 0 },

  // ── Code text input ──────────────────────────────────────────────────────────
  codeInputWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.surface,
    borderRadius: T.radius.md,
    paddingHorizontal: 14, paddingVertical: 11,
    borderWidth: 1.5, borderColor: T.border,
    marginBottom: 6,
  },
  codeInput: {
    flex: 1, fontSize: 17, fontWeight: '700',
    color: T.text, letterSpacing: 5, padding: 0,
  },
  codeCounter: { fontSize: 11, color: T.textMuted, minWidth: 26, textAlign: 'right' },

  // ── Instruction box ──────────────────────────────────────────────────────────
  instructionBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: T.primaryLight,
    borderRadius: T.radius.md,
    padding: 12, marginBottom: 22,
    borderWidth: 1, borderColor: T.primaryMid,
  },
  instructionText: { flex: 1, fontSize: 12, color: T.textSub, lineHeight: 17 },
  instructionBold: { fontWeight: '700', color: T.text },

  // ── Submit button ────────────────────────────────────────────────────────────
  submitBtn: {
    backgroundColor: T.primary,
    borderRadius: T.radius.md,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    shadowColor: T.primary,
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  submitBtnDisabled: { opacity: 0.42, shadowOpacity: 0 },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});

export default ParentHome;