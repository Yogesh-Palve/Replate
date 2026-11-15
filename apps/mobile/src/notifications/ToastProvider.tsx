import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Animated, Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { Lucide, type LucideIconName } from "@react-native-vector-icons/lucide";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { semantic, theme, typography } from "../theme";
import { createToastNotification, createToastTimer, isSameToast, type ToastNotification, type ToastOptions, type ToastType } from "./toastModel";

type Notify = (type: ToastType, message: string, options?: ToastOptions) => void;
const ToastContext = createContext<Notify | null>(null);

const presentation = {
  success: { icon: "circle-check", ...semantic.success },
  error: { icon: "circle-alert", ...semantic.error },
  warning: { icon: "triangle-alert", ...semantic.warning },
  info: { icon: "info", ...semantic.info },
} satisfies Record<ToastType, { icon: LucideIconName; foreground: string; background: string; border: string }>;

export function useToast(): Notify {
  const notify = useContext(ToastContext);
  if (!notify) throw new Error("useToast must be used within ToastProvider");
  return notify;
}

export function ToastProvider({ children }: React.PropsWithChildren) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [notification, setNotification] = useState<ToastNotification | null>(null);
  const current = useRef<ToastNotification | null>(null);
  const nextId = useRef(0);
  const translateY = useRef(new Animated.Value(-110)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef(createToastTimer()).current;

  const dismiss = useCallback((expectedId?: number) => {
    const active = current.current;
    if (!active || (expectedId !== undefined && active.id !== expectedId)) return;
    timer.clear();
    translateY.stopAnimation();
    opacity.stopAnimation();
    Animated.parallel([
      Animated.timing(translateY, { toValue: -110, duration: 210, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished && current.current?.id === active.id) {
        current.current = null;
        setNotification(null);
      }
    });
  }, [opacity, timer, translateY]);

  const notify = useCallback<Notify>((type, message, options) => {
    const cleanMessage = message.trim();
    if (!cleanMessage) return;

    const next = createToastNotification(++nextId.current, type, cleanMessage, options);
    const active = current.current;
    if (isSameToast(active, next)) {
      const refreshed = { ...next, id: active!.id };
      current.current = refreshed;
      setNotification(refreshed);
      timer.schedule(refreshed.duration, () => dismiss(refreshed.id));
      return;
    }

    timer.clear();
    const replacing = active !== null;
    current.current = next;
    translateY.stopAnimation();
    opacity.stopAnimation();
    if (!replacing) {
      translateY.setValue(-110);
      opacity.setValue(0);
    }
    setNotification(next);
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, damping: 19, stiffness: 190, mass: 0.8, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    timer.schedule(next.duration, () => dismiss(next.id));
  }, [dismiss, opacity, timer, translateY]);

  useEffect(() => () => {
    timer.clear();
    translateY.stopAnimation();
    opacity.stopAnimation();
  }, [opacity, timer, translateY]);

  const view = notification ? presentation[notification.type] : null;
  return <ToastContext.Provider value={notify}>
    {children}
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {notification && view ? <Animated.View
        pointerEvents="box-none"
        accessibilityLiveRegion="polite"
        style={[styles.position, { top: insets.top + 8, width: Math.min(width - 32, 560), opacity, transform: [{ translateY }] }]}
      >
        <View style={[styles.banner, { backgroundColor: view.background, borderLeftColor: view.border }]}>
          <Lucide name={view.icon} size={23} color={view.foreground} accessibilityElementsHidden importantForAccessibility="no" />
          <Text
            style={styles.message}
            accessibilityRole={notification.type === "error" || notification.type === "warning" ? "alert" : "text"}
            accessibilityLiveRegion={notification.type === "error" || notification.type === "warning" ? "assertive" : "polite"}
          >{notification.message}</Text>
          <Pressable
            onPress={() => dismiss(notification.id)}
            accessibilityRole="button"
            accessibilityLabel="Dismiss notification"
            hitSlop={8}
            style={styles.closeButton}
          >
            <Lucide name="x" size={19} color={view.foreground} accessibilityElementsHidden importantForAccessibility="no" />
          </Pressable>
        </View>
      </Animated.View> : null}
    </View>
  </ToastContext.Provider>;
}

const styles = StyleSheet.create({
  position: { position: "absolute", alignSelf: "center", zIndex: 10000, elevation: 10000 },
  banner: { minHeight: 60, flexDirection: "row", alignItems: "center", borderRadius: 15, borderLeftWidth: 4, paddingLeft: 14, paddingRight: 8, paddingVertical: 10, shadowColor: "#000", shadowOpacity: 0.16, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 9 },
  message: { flex: 1, flexShrink: 1, color: theme.dark, fontSize: typography.size.small, fontWeight: typography.weight.semibold, lineHeight: typography.line.small, marginHorizontal: 10 },
  closeButton: { width: 36, height: 36, alignItems: "center", justifyContent: "center", borderRadius: 18 },
});
