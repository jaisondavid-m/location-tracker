import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, SafeAreaView, Clipboard, ScrollView,
  AppState, Platform,
} from 'react-native';
import { request, check, PERMISSIONS, RESULTS, openSettings } from 'react-native-permissions';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Geolocation from '@react-native-community/geolocation';
import { useAuth } from '../context/AuthContext';
import { generatePairingCode, getMyParent, updateLocation } from '../api/axios';

const THEME = {
  primary: '#FF8C42', primaryLight: '#FFE5CC', primaryDark: '#E67E3A',
  background: '#FFFFFF', surface: '#F8F8F8', text: '#1a1a2e',
  textMuted: '#888888', border: '#E0E0E0', success: '#4CAF50',
};

const LOCATION_INTERVAL_MS = 30_000;
const COARSE_TIMEOUT_MS = 15_000;
const FINE_TIMEOUT_MS = 30_000;
const CACHED_LOCATION_MAX_AGE_MS = 5 * 60 * 1000;
const TIMEOUT_RETRY_MS = 8_000;

const LOCATION_PERMISSION = Platform.select({
  android: PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION,
  ios:     PERMISSIONS.IOS.LOCATION_WHEN_IN_USE,
});

const requestLocationPermission = async () => {
  const current = await check(LOCATION_PERMISSION);
  if (current === RESULTS.GRANTED) return 'granted';
  if (current === RESULTS.BLOCKED) return 'blocked';
  const result = await request(LOCATION_PERMISSION);
  if (result === RESULTS.GRANTED) return 'granted';
  if (result === RESULTS.BLOCKED) return 'blocked';
  return 'denied';
};

const ChildHome = ({ navigation }) => {
  const { user } = useAuth();

  const [pairingCode, setPairingCode]     = useState(null);
  const [expiresAt, setExpiresAt]         = useState(null);
  const [linkedParent, setLinkedParent]   = useState(null);
  const [generating, setGenerating]       = useState(false);
  const [loadingParent, setLoadingParent] = useState(false);
  const [secondsLeft, setSecondsLeft]     = useState(0);
  const [tracking, setTracking]           = useState(false);
  const [lastFix, setLastFix]             = useState(null);
  const [locationError, setLocationError] = useState(null);
  const [gpsStatus, setGpsStatus]         = useState('idle'); // idle | acquiring | sending | ok | error
  const [permStatus, setPermStatus]       = useState(null);

  const intervalRef = useRef(null);
  const retryRef = useRef(null);
  const trackingRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);

  const clearRetry = useCallback(() => {
    if (retryRef.current) {
      clearTimeout(retryRef.current);
      retryRef.current = null;
    }
  }, []);

  const fetchParent = useCallback(async () => {
    try {
      setLoadingParent(true);
      const res = await getMyParent(user.user_id);
      setLinkedParent(res);
    } catch { setLinkedParent(null); }
    finally { setLoadingParent(false); }
  }, [user.user_id]);

  useEffect(() => { fetchParent(); }, [fetchParent]);

  useEffect(() => {
    check(LOCATION_PERMISSION).then(result => {
      setPermStatus(result === RESULTS.GRANTED ? 'granted' : result === RESULTS.BLOCKED ? 'blocked' : 'denied');
    });
  }, []);

  useEffect(() => {
    if (!expiresAt) return;
    const interval = setInterval(() => {
      const left = Math.max(0, Math.floor((new Date(expiresAt) - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) { setPairingCode(null); setExpiresAt(null); clearInterval(interval); }
    }, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  // ── FIX: Two-stage GPS — low accuracy first (fast), then high accuracy ────
  const pushLocation = useCallback(() => {
    setGpsStatus('acquiring');
    setLocationError(null);
    clearRetry();

    const sendPosition = ({ latitude, longitude, accuracy, speed }) => {
      setGpsStatus('sending');
      return updateLocation(user.user_id, latitude, longitude, accuracy ?? 0, speed ?? 0)
        .then(() => {
          setLastFix({ lat: latitude, lon: longitude, accuracy, ts: new Date() });
          setGpsStatus('ok');
        })
        .catch(err => {
          console.warn('Location push failed:', err.message);
          setLocationError(`Server error: ${err.message}`);
          setGpsStatus('error');
        });
    };

    // Stage 1: fast coarse fix (network/cell, responds in ~1s)
    Geolocation.getCurrentPosition(
      (coarsePosition) => {
        const { latitude, longitude, accuracy, speed } = coarsePosition.coords;

        // Send coarse fix immediately so backend gets something
        sendPosition({ latitude, longitude, accuracy, speed });

        // Stage 2: refine with GPS (runs in background, updates if better)
        Geolocation.getCurrentPosition(
          (finePosition) => {
            const f = finePosition.coords;
            // Only update if meaningfully more accurate
            if (f.accuracy < accuracy - 10) {
              updateLocation(user.user_id, f.latitude, f.longitude, f.accuracy ?? 0, f.speed ?? 0)
                .then(() => {
                  setLastFix({ lat: f.latitude, lon: f.longitude, accuracy: f.accuracy, ts: new Date() });
                })
                .catch(() => {}); // fine fix failure is non-critical
            }
          },
          () => {}, // fine fix timeout is fine — we already sent coarse
          { enableHighAccuracy: true, timeout: FINE_TIMEOUT_MS, maximumAge: 0 },
        );
      },
      (err) => {
        // Coarse fix failed — try high accuracy as the only attempt
        console.warn('Coarse GPS failed, trying high accuracy:', err.code, err.message);

        // Quick attempt to use any recent cached location before expensive GPS query.
        Geolocation.getCurrentPosition(
          (cachedPosition) => {
            const c = cachedPosition.coords;
            sendPosition({ latitude: c.latitude, longitude: c.longitude, accuracy: c.accuracy, speed: c.speed });
          },
          () => {
            // Ignore and continue to high-accuracy live fix.
          },
          { enableHighAccuracy: false, timeout: 2000, maximumAge: CACHED_LOCATION_MAX_AGE_MS },
        );

        Geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude, accuracy, speed } = position.coords;
            sendPosition({ latitude, longitude, accuracy, speed });
          },
          (err2) => {
            const msgs = {
              1: 'Location permission denied.',
              2: 'GPS unavailable. Move to an open area.',
              3: `GPS timed out. Retrying in ${TIMEOUT_RETRY_MS / 1000}s.`,
            };
            setLocationError(msgs[err2.code] ?? 'Location error. Will retry.');
            setGpsStatus('error');
            if (err2.code === 3) {
              clearRetry();
              if (trackingRef.current) {
                retryRef.current = setTimeout(() => {
                  if (trackingRef.current) pushLocation();
                }, TIMEOUT_RETRY_MS);
              }
            }
            if (err2.code === 1) setPermStatus('blocked');
          },
          { enableHighAccuracy: true, timeout: FINE_TIMEOUT_MS, maximumAge: 10_000 },
        );
      },
      // FIX: Low accuracy = fast network/WiFi fix, no GPS warm-up needed
      { enableHighAccuracy: false, timeout: COARSE_TIMEOUT_MS, maximumAge: 30_000 },
    );
  }, [clearRetry, user.user_id]);

  const startTracking = useCallback(async () => {
    if (intervalRef.current) return;
    const perm = await requestLocationPermission();
    setPermStatus(perm);
    if (perm === 'blocked') {
      Alert.alert('Location Permission Required',
        'Location access was denied. Please enable it in Settings.',
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Open Settings', onPress: () => openSettings() }]);
      return;
    }
    if (perm === 'denied') {
      Alert.alert('Permission Needed', 'Location permission is required to share your location.');
      return;
    }
    trackingRef.current = true;
    setTracking(true);
    setLocationError(null);
    pushLocation();
    intervalRef.current = setInterval(pushLocation, LOCATION_INTERVAL_MS);
  }, [pushLocation]);

  const stopTracking = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    clearRetry();
    trackingRef.current = false;
    setTracking(false);
    setGpsStatus('idle');
  }, [clearRetry]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;
      if (prev.match(/inactive|background/) && nextState === 'active') {
        if (trackingRef.current && !intervalRef.current) {
          pushLocation();
          intervalRef.current = setInterval(pushLocation, LOCATION_INTERVAL_MS);
        }
      } else if (nextState.match(/inactive|background/)) {
        if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
      }
    });
    return () => sub.remove();
  }, [pushLocation]);

  useEffect(() => () => stopTracking(), [stopTracking]);

  const handleGenerate = async () => {
    try {
      setGenerating(true);
      const res = await generatePairingCode(user.user_id);
      setPairingCode(res.code); setExpiresAt(res.expires_at); setSecondsLeft(600);
    } catch (err) { Alert.alert('Error', err.message); }
    finally { setGenerating(false); }
  };

  const handleCopy = () => {
    Clipboard.setString(pairingCode);
    Alert.alert('✅ Copied!', 'Pairing code copied to clipboard.');
  };

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
  const ss = String(secondsLeft % 60).padStart(2, '0');

  // GPS status indicator
  const statusConfig = {
    idle:      { color: THEME.textMuted, icon: 'map-marker-outline',   label: '' },
    acquiring: { color: '#F59E0B',       icon: 'crosshairs-question',   label: 'Getting location…' },
    sending:   { color: '#3B82F6',       icon: 'upload',                label: 'Sending to server…' },
    ok:        { color: THEME.success,   icon: 'crosshairs-gps',        label: 'Location sent ✓' },
    error:     { color: '#EF4444',       icon: 'crosshairs-off',        label: locationError ?? 'Error' },
  };
  const status = statusConfig[gpsStatus];

  const PermissionBanner = () => {
    if (permStatus !== 'blocked') return null;
    return (
      <TouchableOpacity style={styles.permBanner} onPress={() => openSettings()} activeOpacity={0.8}>
        <Icon name="shield-alert" size={18} color="#fff" />
        <View style={{ flex: 1 }}>
          <Text style={styles.permBannerTitle}>Location access blocked</Text>
          <Text style={styles.permBannerSub}>Tap to open Settings and enable location</Text>
        </View>
        <Icon name="chevron-right" size={18} color="#fff" />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <PermissionBanner />

        {/* Location card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="map-marker-radius" size={20} color={THEME.primary} />
            <Text style={styles.cardTitle}>Location Sharing</Text>
          </View>
          <Text style={styles.cardSub}>Share your location with your parent in real time.</Text>

          {/* GPS status row */}
          {tracking && (
            <View style={[styles.statusRow, { backgroundColor: status.color + '18' }]}>
              {gpsStatus === 'acquiring' || gpsStatus === 'sending'
                ? <ActivityIndicator size="small" color={status.color} />
                : <Icon name={status.icon} size={16} color={status.color} />}
              <Text style={[styles.statusLabel, { color: status.color }]}>{status.label}</Text>
            </View>
          )}

          {/* Last fix */}
          {lastFix && (
            <View style={styles.fixRow}>
              <Icon name="crosshairs-gps" size={14} color={THEME.success} />
              <Text style={styles.fixText}>{lastFix.lat.toFixed(5)}, {lastFix.lon.toFixed(5)}</Text>
              {lastFix.accuracy != null && (
                <Text style={styles.fixAccuracy}>±{Math.round(lastFix.accuracy)}m</Text>
              )}
              <Text style={styles.fixTime}>
                {lastFix.ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </Text>
            </View>
          )}

          {gpsStatus === 'error' && locationError && (
            <View style={styles.errorRow}>
              <Icon name="alert-circle" size={14} color="#EF4444" />
              <Text style={styles.errorText}>{locationError}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.trackBtn,
              tracking ? styles.trackBtnStop : styles.trackBtnStart,
              permStatus === 'blocked' && styles.trackBtnBlocked,
            ]}
            onPress={tracking ? stopTracking : startTracking}
            activeOpacity={0.85}>
            <Icon
              name={permStatus === 'blocked' ? 'shield-off' : tracking ? 'map-marker-off' : 'map-marker-check'}
              size={18} color="#fff"
            />
            <Text style={styles.trackBtnText}>
              {permStatus === 'blocked' ? 'Permission Denied — Tap to Fix'
                : tracking ? 'Stop Sharing' : 'Start Sharing'}
            </Text>
          </TouchableOpacity>

          {tracking && gpsStatus === 'ok' && (
            <Text style={styles.intervalNote}>Updating every {LOCATION_INTERVAL_MS / 1000}s</Text>
          )}
        </View>

        {/* Linked parent card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="account" size={20} color={THEME.primary} />
            <Text style={styles.cardTitle}>Linked Parent</Text>
          </View>
          {loadingParent ? <ActivityIndicator color={THEME.primary} size="large" /> :
            linkedParent ? (
              <View style={styles.linkedContainer}>
                <View style={styles.statusBadge}>
                  <Icon name="check-circle" size={20} color={THEME.success} />
                  <Text style={styles.statusText}>Connected</Text>
                </View>
                <Text style={styles.linkedText}>Parent ID: {linkedParent.parent_id}</Text>
                <Text style={styles.linkedSub}>Since {new Date(linkedParent.linked_at).toLocaleDateString()}</Text>
              </View>
            ) : (
              <View style={styles.notLinkedContainer}>
                <Icon name="alert-circle-outline" size={32} color={THEME.primaryLight} />
                <Text style={styles.notLinked}>Not linked to a parent yet</Text>
                <Text style={styles.notLinkedSub}>Generate a code below to start</Text>
              </View>
            )}
        </View>

        {/* Pairing card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Icon name="link-variant" size={20} color={THEME.primary} />
            <Text style={styles.cardTitle}>Pair with Parent</Text>
          </View>
          <Text style={styles.cardSub}>Generate a code and share it with your parent to link accounts.</Text>
          {pairingCode ? (
            <>
              <TouchableOpacity style={styles.codeBox} onPress={handleCopy} activeOpacity={0.7}>
                <Text style={styles.codeText}>{pairingCode}</Text>
                <View style={styles.copyIconContainer}>
                  <Icon name="content-copy" size={16} color={THEME.primary} />
                </View>
              </TouchableOpacity>
              <View style={styles.timerContainer}>
                <Icon name={secondsLeft > 0 ? 'clock-outline' : 'clock-remove-outline'} size={16}
                  color={secondsLeft > 0 ? THEME.primary : '#FF6B6B'} />
                <Text style={[styles.timer, { color: secondsLeft > 0 ? THEME.text : '#FF6B6B' }]}>
                  {secondsLeft > 0 ? `Expires in ${mm}:${ss}` : 'Code expired'}
                </Text>
              </View>
              <TouchableOpacity style={[styles.regenerateBtn, generating && styles.btnDisabled]}
                onPress={handleGenerate} disabled={generating}>
                <Icon name="refresh" size={16} color={THEME.primary} />
                <Text style={styles.regenerateText}>Generate New Code</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity style={[styles.generateBtn, generating && styles.btnDisabled]}
              onPress={handleGenerate} disabled={generating}>
              {generating ? <ActivityIndicator color="#fff" size="small" />
                : <><Icon name="plus-circle" size={18} color="#fff" /><Text style={styles.generateBtnText}>Generate Code</Text></>}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container:     { flex: 1, backgroundColor: THEME.background },
  scrollContent: { padding: 16, paddingBottom: 40 },

  permBanner:      { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#EF4444', borderRadius: 14, padding: 14, marginBottom: 14 },
  permBannerTitle: { fontSize: 13, fontWeight: '800', color: '#fff' },
  permBannerSub:   { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 2 },

  card:       { backgroundColor: THEME.background, borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1.5, borderColor: THEME.primaryLight, shadowColor: THEME.primary, shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 5 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  cardTitle:  { fontSize: 16, fontWeight: '800', color: THEME.text },
  cardSub:    { fontSize: 13, color: THEME.textMuted, marginBottom: 16, lineHeight: 18 },

  statusRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 10, marginBottom: 10 },
  statusLabel: { fontSize: 12, fontWeight: '600', flex: 1 },

  fixRow:       { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  fixText:      { fontSize: 12, color: THEME.text, fontVariant: ['tabular-nums'], flex: 1 },
  fixAccuracy:  { fontSize: 10, color: THEME.textMuted },
  fixTime:      { fontSize: 11, color: THEME.textMuted },

  errorRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, backgroundColor: '#FEF2F2', borderRadius: 10, padding: 10 },
  errorText: { fontSize: 12, color: '#EF4444', flex: 1 },

  trackBtn:        { borderRadius: 12, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  trackBtnStart:   { backgroundColor: THEME.success, shadowColor: THEME.success },
  trackBtnStop:    { backgroundColor: '#EF4444', shadowColor: '#EF4444' },
  trackBtnBlocked: { backgroundColor: '#6B7280', shadowColor: '#6B7280' },
  trackBtnText:    { color: '#fff', fontWeight: '800', fontSize: 15 },
  intervalNote:    { fontSize: 11, color: THEME.textMuted, textAlign: 'center', marginTop: 8 },

  linkedContainer:    { alignItems: 'center', paddingVertical: 12 },
  statusBadge:        { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12, backgroundColor: '#F0F9F0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  statusText:         { fontSize: 13, fontWeight: '700', color: THEME.success },
  linkedText:         { fontSize: 15, fontWeight: '700', color: THEME.text },
  linkedSub:          { fontSize: 12, color: THEME.textMuted, marginTop: 4 },
  notLinkedContainer: { alignItems: 'center', paddingVertical: 20 },
  notLinked:          { fontSize: 15, fontWeight: '700', color: THEME.text, marginTop: 12 },
  notLinkedSub:       { fontSize: 12, color: THEME.textMuted, marginTop: 6 },

  codeBox:           { backgroundColor: THEME.primaryLight, borderRadius: 14, borderWidth: 2, borderColor: THEME.primary, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', paddingVertical: 24, paddingHorizontal: 16, marginBottom: 12, position: 'relative' },
  codeText:          { fontSize: 40, fontWeight: '900', color: THEME.primary, letterSpacing: 8, fontVariant: ['tabular-nums'] },
  copyIconContainer: { position: 'absolute', top: 10, right: 10, backgroundColor: THEME.primary, borderRadius: 20, padding: 6 },
  timerContainer:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12, paddingVertical: 8 },
  timer:             { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  generateBtn:       { backgroundColor: THEME.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8, shadowColor: THEME.primary, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  generateBtnText:   { color: '#fff', fontWeight: '800', fontSize: 16 },
  regenerateBtn:     { borderWidth: 1.5, borderColor: THEME.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6, backgroundColor: 'transparent', marginTop: 10 },
  regenerateText:    { color: THEME.primary, fontWeight: '700', fontSize: 14 },
  btnDisabled:       { opacity: 0.6 },
});

export default ChildHome;