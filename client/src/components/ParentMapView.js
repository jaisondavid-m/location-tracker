import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet,
    ActivityIndicator, SafeAreaView, ScrollView,
    Animated, StatusBar,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAuth } from '../context/AuthContext';
import { getMyChildren, getLatestLocation, getLocationHistory } from '../api/axios';

const T = {
    primary: '#FF8C42',
    primaryLight: '#FFF0E0',
    primaryDark: '#D4722E',
    bg: '#FFFFFF',
    surface: '#F7F7F9',
    surfaceAlt: '#EFEFEF',
    text: '#16161D',
    textSub: '#5C5C6E',
    textMuted: '#9999AA',
    border: '#E8E8EE',
    success: '#3DBE7A',
    warning: '#F5A623',
    danger: '#E05252',
    overlay: 'rgba(22,22,29,0.55)',
    radius: {
        sm: 8, md: 14, lg: 20, xl: 28,
    },
};

const CHILD_COLORS = [
    '#FF8C42', '#6C63FF', '#22C55E', '#EF4444',
    '#3B82F6', '#EC4899', '#F59E0B', '#14B8A6',
];

const POLL_INTERVAL_MS = 15_000;
const PANEL_HEIGHT = 280;

const OFFLINE_THRESHOLD_S = 120;

const getAgeLabel = (ts, nowMs = Date.now()) => {
    const age = Math.floor((nowMs - new Date(ts)) / 1000);
    if (age < 60) return `${age}s ago`;
    if (age < 3600) return `${Math.floor(age / 60)}m ago`;
    return `${Math.floor(age / 3600)}h ago`;
};

const getStatusFromLocation = (loc, nowMs = Date.now()) => {
    if (!loc) return 'unknown';
    const ageS = (nowMs - new Date(loc.recorded_at)) / 1000;
    return ageS <= OFFLINE_THRESHOLD_S ? 'online' : 'offline';
};

// ── Leaflet HTML (injected into WebView) ──────────────────────────────────────
const buildLeafletHTML = () => `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    html, body, #map { width:100%; height:100%; }
    .child-marker {
      display:flex; flex-direction:column; align-items:center;
    }
    .child-pin {
      width:36px; height:36px; border-radius:18px;
      display:flex; align-items:center; justify-content:center;
      color:#fff; font-size:18px; font-weight:bold;
      box-shadow:0 3px 8px rgba(0,0,0,0.35);
      border:2.5px solid rgba(255,255,255,0.8);
    }
    .child-tail {
      width:0; height:0;
      border-left:6px solid transparent;
      border-right:6px solid transparent;
      margin-top:-2px;
    }
    .child-label {
      margin-top:3px; border-radius:8px;
      padding:2px 7px; font-size:11px; font-weight:700;
      color:#fff; white-space:nowrap;
      box-shadow:0 1px 4px rgba(0,0,0,0.2);
    }
    .pulse-wrap { position:relative; }
    .pulse-ring {
      position:absolute; top:-6px; left:-6px;
      width:48px; height:48px; border-radius:24px;
      border:2px solid; opacity:0.4;
      animation: pulse 1.4s ease-in-out infinite;
    }
    @keyframes pulse {
      0%,100%{ transform:scale(1); opacity:0.4; }
      50%{ transform:scale(1.3); opacity:0.15; }
    }
    .leaflet-control-attribution { font-size:9px !important; }
  </style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var map = L.map('map', { zoomControl:true, attributionControl:true }).setView([11.0168, 76.9558], 13);

  L.tileLayer('https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=3ej9Ts9biVYYTRE5TrcI', {
    attribution: '&copy; OpenStreetMap contributors &copy; MapTiler',
    maxZoom: 19,
  }).addTo(map);

  var markers     = {};
  var circles     = {};
  var polylines   = {};
  var showTrail   = true;

  function createIcon(color, name, isSelected) {
    var pulseHtml = isSelected
      ? '<div class="pulse-ring" style="border-color:' + color + '"></div>'
      : '';
    var html = '<div class="child-marker">'
      + '<div class="pulse-wrap">'
      + pulseHtml
      + '<div class="child-pin" style="background:' + color + '">' + name.charAt(0).toUpperCase() + '</div>'
      + '</div>'
      + '<div class="child-tail" style="border-top:8px solid ' + color + '"></div>'
      + '<div class="child-label" style="background:' + color + '">' + name + '</div>'
      + '</div>';
    return L.divIcon({ html:html, className:'', iconSize:[60,70], iconAnchor:[30,68] });
  }

  window.updateChildren = function(data) {
    var children  = data.children;
    var locations = data.locations;
    var histories = data.histories;
    var selected  = data.selectedChild;
    showTrail     = data.showTrail;

    children.forEach(function(child, idx) {
      var id    = child.child_id;
      var loc   = locations[id];
      var color = data.colors[idx % data.colors.length];
      var name  = child.child_name || ('Child ' + id);
      var trail = histories[id] || [];
      var isSel = selected === id;

      if (!loc) return;

      var latlng = [loc.latitude, loc.longitude];

      if (markers[id]) {
        markers[id].setLatLng(latlng);
        markers[id].setIcon(createIcon(color, name, isSel));
      } else {
        markers[id] = L.marker(latlng, { icon: createIcon(color, name, isSel) })
          .addTo(map)
          .on('click', function() {
            window.ReactNativeWebView.postMessage(JSON.stringify({ type:'markerPress', childId: id }));
          });
      }

      if (circles[id]) map.removeLayer(circles[id]);
      if (loc.accuracy > 0) {
        circles[id] = L.circle(latlng, {
          radius: loc.accuracy,
          color: color, fillColor: color,
          fillOpacity: 0.08, weight: 1, opacity: 0.4,
        }).addTo(map);
      }

      if (polylines[id]) map.removeLayer(polylines[id]);
      if (showTrail && trail.length > 1) {
        var coords = trail.map(function(t) { return [t.latitude, t.longitude]; });
        polylines[id] = L.polyline(coords, {
          color: color, weight: 3, opacity: 0.65, dashArray: '6 5',
        }).addTo(map);
      }
    });
  };

  window.focusChild = function(lat, lng) {
    map.flyTo([lat, lng], 16, { duration: 0.6 });
  };

  window.fitAll = function(coords) {
    if (coords.length === 0) return;
    if (coords.length === 1) {
      map.flyTo(coords[0], 15, { duration: 0.6 });
    } else {
      map.fitBounds(coords, { padding: [60, 60], maxZoom: 16 });
    }
  };
</script>
</body>
</html>
`;

// ── Child pill component ──────────────────────────────────────────────────────
const ChildPill = React.memo(({ child, location, color, isSelected, onPress, nowMs }) => {
    const status = getStatusFromLocation(location, nowMs);
    return (
        <TouchableOpacity
            style={[styles.childPill, isSelected && { borderColor: color, backgroundColor: color + '12' }]}
            onPress={onPress}
            activeOpacity={0.8}
            accessibilityLabel={`View ${child.child_name || 'child'} on map`}
            accessibilityRole="button">
            <View style={styles.pillAvatarWrap}>
                <View style={[styles.pillAvatar, { backgroundColor: color + '20' }]}>
                    <Text style={[styles.pillAvatarText, { color }]}>
                        {(child.child_name || `C${child.child_id}`).split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </Text>
                </View>
                <View style={[styles.pillDot, { backgroundColor: status === 'online' ? T.success : T.textMuted }]} />
            </View>
            <View style={styles.pillInfo}>
                <View style={styles.pillNameRow}>
                    <Text style={[styles.pillName, isSelected && { color }]} numberOfLines={1}>
                        {child.child_name || `Child ${child.child_id}`}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: status === 'online' ? '#E9FFF3' : T.surface }]}>
                        <Text style={[styles.statusBadgeText, { color: status === 'online' ? T.success : T.textMuted }]}>
                            {status === 'online' ? 'Online' : 'Offline'}
                        </Text>
                    </View>
                </View>
                {location ? (
                    <Text style={styles.pillCoords} numberOfLines={1}>
                        {Number(location.latitude).toFixed(5)}, {Number(location.longitude).toFixed(5)}
                    </Text>
                ) : (
                    <Text style={styles.pillNoLoc}>Location unavailable</Text>
                )}
                <Text style={styles.pillAge}>
                    {location ? getAgeLabel(location.recorded_at, nowMs) : '—'}
                </Text>
            </View>
            <Icon name={isSelected ? 'map-marker-radius' : 'chevron-right'} size={18} color={isSelected ? color : T.textMuted} />
        </TouchableOpacity>
    );
});

// ── Main screen ───────────────────────────────────────────────────────────────
const ParentMapView = ({ navigation, route }) => {
    const { user } = useAuth();
    const webViewRef = useRef(null);
    const pollRef = useRef(null);
    const panelAnim = useRef(new Animated.Value(0)).current;

    const [children, setChildren] = useState([]);
    const [locationMap, setLocationMap] = useState({});
    const [historyMap, setHistoryMap] = useState({});
    const [selectedChild, setSelectedChild] = useState(null);
    const [loadingInit, setLoadingInit] = useState(true);
    const [mapReady, setMapReady] = useState(false);
    const [showTrail, setShowTrail] = useState(true);
    const [lastPollAt, setLastPollAt] = useState(null);
    const [nowMs, setNowMs] = useState(Date.now());

    const requestedChildId = route?.params?.childId ?? null;

    const syncMap = useCallback((kids, locMap, histMap, selected, trail) => {
        if (!webViewRef.current) return;
        const payload = {
            children: kids,
            locations: locMap,
            histories: histMap,
            selectedChild: selected,
            showTrail: trail,
            colors: CHILD_COLORS,
        };
        webViewRef.current.injectJavaScript(
            `window.updateChildren(${JSON.stringify(payload)}); true;`
        );
    }, []);

    const fetchAll = useCallback(async (kids) => {
        if (!kids || kids.length === 0) return;
        const [locResults, histResults] = await Promise.all([
            Promise.allSettled(kids.map(c => getLatestLocation(c.child_id))),
            Promise.allSettled(kids.map(c => getLocationHistory(c.child_id, 10))),
        ]);

        const newLocMap = {};
        const newHistMap = {};
        kids.forEach((c, i) => {
            if (locResults[i].status === 'fulfilled') newLocMap[c.child_id] = locResults[i].value;
            if (histResults[i].status === 'fulfilled') newHistMap[c.child_id] = histResults[i].value.locations || [];
        });

        setLocationMap(newLocMap);
        setHistoryMap(newHistMap);
        setLastPollAt(new Date());
        return { newLocMap, newHistMap };
    }, []);

    useEffect(() => {
        (async () => {
            try {
                const res = await getMyChildren(user.user_id);
                const kids = res.children || [];
                setChildren(kids);
                if (kids.length > 0) {
                    const hasRequested = requestedChildId && kids.some(k => k.child_id === requestedChildId);
                    setSelectedChild(hasRequested ? requestedChildId : kids[0].child_id);
                }
                await fetchAll(kids);
            } catch (e) {
                console.warn('Init error:', e.message);
            } finally {
                setLoadingInit(false);
            }
        })();
    }, [fetchAll, requestedChildId, user.user_id]);

    useEffect(() => {
        if (children.length === 0) return;
        pollRef.current = setInterval(() => fetchAll(children), POLL_INTERVAL_MS);
        return () => clearInterval(pollRef.current);
    }, [children, fetchAll]);

    useEffect(() => {
        const id = setInterval(() => setNowMs(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    useEffect(() => {
        if (mapReady) syncMap(children, locationMap, historyMap, selectedChild, showTrail);
    }, [mapReady, children, locationMap, historyMap, selectedChild, showTrail]);

    useEffect(() => {
        Animated.spring(panelAnim, {
            toValue: children.length > 0 ? 1 : 0,
            tension: 60, friction: 10, useNativeDriver: true,
        }).start();
    }, [children.length]);

    const focusChild = useCallback((childId) => {
        setSelectedChild(childId);
        const loc = locationMap[childId];
        if (loc && webViewRef.current) {
            webViewRef.current.injectJavaScript(
                `window.focusChild(${loc.latitude}, ${loc.longitude}); true;`
            );
        }
    }, [locationMap]);

    const fitAll = useCallback(() => {
        setSelectedChild(null);
        const coords = Object.values(locationMap).map(l => [l.latitude, l.longitude]);
        if (coords.length > 0 && webViewRef.current) {
            webViewRef.current.injectJavaScript(
                `window.fitAll(${JSON.stringify(coords)}); true;`
            );
        }
    }, [locationMap]);

    const onWebViewMessage = useCallback((event) => {
        try {
            const msg = JSON.parse(event.nativeEvent.data);
            if (msg.type === 'markerPress') focusChild(msg.childId);
        } catch { }
    }, [focusChild]);

    const panelTranslate = panelAnim.interpolate({ inputRange: [0, 1], outputRange: [PANEL_HEIGHT + 40, 0] });

    const childrenCount = children.length;
    const hasLocations = Object.keys(locationMap).length > 0;

    if (loadingInit) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingScreen}>
                    <ActivityIndicator size="large" color={T.primary} />
                    <Text style={styles.loadingText}>Loading family map…</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" />

            <WebView
                ref={webViewRef}
                style={styles.map}
                source={{ html: buildLeafletHTML() }}
                originWhitelist={['*']}
                javaScriptEnabled
                domStorageEnabled
                onLoadEnd={() => setMapReady(true)}
                onMessage={onWebViewMessage}
                scrollEnabled={false}
                accessibilityLabel="Interactive map showing child locations"
            />

            <SafeAreaView style={styles.topBarWrap} pointerEvents="box-none">
                <View style={styles.topBar}>
                    <TouchableOpacity
                        style={styles.topBarBtn}
                        onPress={() => navigation?.goBack()}
                        accessibilityLabel="Go back"
                        accessibilityRole="button">
                        <Icon name="arrow-left" size={20} color={T.text} />
                    </TouchableOpacity>

                    <View style={styles.topBarCenter}>
                        <Text style={styles.topBarTitle}>Family Map</Text>
                        {lastPollAt && (
                            <Text style={styles.topBarSub}>Updated {getAgeLabel(lastPollAt, nowMs)}</Text>
                        )}
                    </View>

                    <View style={styles.topBarActions}>
                        <TouchableOpacity
                            style={[styles.topBarBtn, showTrail && styles.topBarBtnActive]}
                            onPress={() => setShowTrail(v => !v)}
                            accessibilityLabel={`${showTrail ? 'Hide' : 'Show'} movement trails`}
                            accessibilityRole="button">
                            <Icon name="map-marker-path" size={18} color={showTrail ? T.primary : T.textMuted} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.topBarBtn}
                            onPress={fitAll}
                            accessibilityLabel="Fit all children in view"
                            accessibilityRole="button">
                            <Icon name="fit-to-page-outline" size={18} color={T.text} />
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>

            {childrenCount > 0 && (
                <Animated.View
                    style={[styles.panel, { transform: [{ translateY: panelTranslate }] }]}
                    pointerEvents="box-none">
                    <View style={styles.panelHandle} />
                    <View style={styles.panelHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.panelTitle}>
                                {childrenCount} {childrenCount === 1 ? 'Child' : 'Children'}
                            </Text>
                            {hasLocations && (
                                <Text style={styles.panelSubtitle}>Tap to focus on map</Text>
                            )}
                        </View>
                        <View style={styles.liveBadge}>
                            <View style={styles.liveDot} />
                            <Text style={styles.liveBadgeText}>Live · {POLL_INTERVAL_MS / 1000}s</Text>
                        </View>
                    </View>
                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        style={styles.pillScroll}
                        contentContainerStyle={styles.pillScrollContent}
                        nestedScrollEnabled>
                        {children.length === 0 ? (
                            <View style={styles.noPillsBox}>
                                <Icon name="map-marker-off" size={32} color={T.primaryLight} />
                                <Text style={styles.noPillsText}>No children linked yet</Text>
                            </View>
                        ) : (
                            children.map((child, idx) => (
                                <ChildPill
                                    key={child.child_id}
                                    child={child}
                                    location={locationMap[child.child_id]}
                                    color={CHILD_COLORS[idx % CHILD_COLORS.length]}
                                    isSelected={selectedChild === child.child_id}
                                    nowMs={nowMs}
                                    onPress={() => focusChild(child.child_id)}
                                />
                            ))
                        )}
                    </ScrollView>
                </Animated.View>
            )}

            {childrenCount === 0 && !loadingInit && (
                <View style={styles.emptyOverlay}>
                    <Icon name="map-marker-off" size={48} color={T.primaryLight} />
                    <Text style={styles.emptyOverlayText}>No children to display</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },

    loadingScreen: {
        flex: 1, alignItems: 'center', justifyContent: 'center',
        backgroundColor: T.bg, gap: 16,
    },
    loadingText: { fontSize: 14, color: T.textMuted, fontWeight: '500' },

    map: { ...StyleSheet.absoluteFillObject },

    // ── Top bar ────────────────────────────────────────────────────────────────
    topBarWrap: { position: 'absolute', top: 0, left: 0, right: 0 },
    topBar: {
        flexDirection: 'row', alignItems: 'center',
        marginHorizontal: 14, marginTop: 8,
        backgroundColor: T.bg, borderRadius: T.radius.lg,
        paddingVertical: 8, paddingHorizontal: 8,
        shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 14,
        shadowOffset: { width: 0, height: 4 }, elevation: 10, gap: 6,
    },
    topBarBtn: {
        width: 40, height: 40, borderRadius: T.radius.md,
        backgroundColor: T.surface, alignItems: 'center', justifyContent: 'center',
    },
    topBarBtnActive: { backgroundColor: T.primaryLight },
    topBarCenter: { flex: 1, alignItems: 'center' },
    topBarTitle: { fontSize: 15, fontWeight: '800', color: T.text, letterSpacing: -0.3 },
    topBarSub: { fontSize: 10, color: T.textMuted, marginTop: 2 },
    topBarActions: { flexDirection: 'row', gap: 6 },

    // ── Panel ──────────────────────────────────────────────────────────────────
    panel: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: PANEL_HEIGHT,
        backgroundColor: T.bg, borderTopLeftRadius: T.radius.xl, borderTopRightRadius: T.radius.xl,
        paddingTop: 8, paddingHorizontal: 18,
        shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 24,
        shadowOffset: { width: 0, height: -6 }, elevation: 20,
    },
    panelHandle: {
        alignSelf: 'center', width: 40, height: 4,
        backgroundColor: T.border, borderRadius: 2, marginBottom: 10,
    },
    panelHeader: {
        flexDirection: 'row', alignItems: 'center',
        marginBottom: 12,
    },
    panelTitle: { fontSize: 16, fontWeight: '800', color: T.text, letterSpacing: -0.3 },
    panelSubtitle: { fontSize: 11, color: T.textMuted, marginTop: 1 },
    liveBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#E9FFF3', borderRadius: T.radius.xl,
        paddingHorizontal: 10, paddingVertical: 4,
    },
    liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: T.success },
    liveBadgeText: { fontSize: 10, color: T.success, fontWeight: '700' },

    pillScroll: { flex: 1 },
    pillScrollContent: { paddingBottom: 20, gap: 8 },

    // ── Child pill ─────────────────────────────────────────────────────────────
    childPill: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: T.surface, borderRadius: T.radius.md,
        padding: 12, borderWidth: 1.5, borderColor: T.border,
        gap: 10,
        shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4,
        shadowOffset: { width: 0, height: 1 }, elevation: 1,
    },
    pillAvatarWrap: { position: 'relative' },
    pillAvatar: {
        width: 46, height: 46, borderRadius: 23,
        alignItems: 'center', justifyContent: 'center',
    },
    pillAvatarText: { fontSize: 15, fontWeight: '800' },
    pillDot: {
        position: 'absolute', bottom: 1, right: 1,
        width: 11, height: 11, borderRadius: 6,
        borderWidth: 2, borderColor: T.bg,
    },
    pillInfo: { flex: 1, gap: 3 },
    pillNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    pillName: { fontSize: 14, fontWeight: '700', color: T.text, flex: 1 },
    statusBadge: { borderRadius: T.radius.xl, paddingHorizontal: 8, paddingVertical: 2 },
    statusBadgeText: { fontSize: 10, fontWeight: '700' },
    pillCoords: { fontSize: 11, color: T.textSub, fontVariant: ['tabular-nums'] },
    pillAge: { fontSize: 10, color: T.textMuted },
    pillNoLoc: { fontSize: 11, color: T.textMuted, fontStyle: 'italic' },

    // ── Empty states ───────────────────────────────────────────────────────────
    noPillsBox: { alignItems: 'center', paddingVertical: 28, gap: 6 },
    noPillsText: { fontSize: 13, color: T.textMuted, fontWeight: '500' },

    emptyOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center', justifyContent: 'center',
        gap: 12,
    },
    emptyOverlayText: { fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
});

export default ParentMapView;