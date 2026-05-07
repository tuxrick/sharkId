import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

interface IdentifyResult {
  species: string;
  common_name: string;
  confidence: "alta" | "media" | "baja";
  description: string;
}

const CONFIDENCE_COLOR: Record<IdentifyResult["confidence"], string> = {
  alta: "#22c55e",
  media: "#eab308",
  baja: "#ef4444",
};

const CONFIDENCE_LABEL: Record<IdentifyResult["confidence"], string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

export default function ResultScreen() {
  const { data } = useLocalSearchParams<{ data: string }>();

  if (!data) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Sin datos</Text>
      </View>
    );
  }

  const result = JSON.parse(data) as IdentifyResult;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
      <Text style={styles.eyebrow}>Identificación</Text>
      <Text style={styles.commonName}>{result.common_name}</Text>
      <Text style={styles.species}>{result.species}</Text>
      <View
        style={[
          styles.badge,
          { backgroundColor: CONFIDENCE_COLOR[result.confidence] },
        ]}
      >
        <Text style={styles.badgeText}>
          Confianza {CONFIDENCE_LABEL[result.confidence]}
        </Text>
      </View>
      <Text style={styles.description}>{result.description}</Text>
      <Pressable style={styles.backButton} onPress={() => router.replace("/")}>
        <Text style={styles.backButtonText}>Nueva foto</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: "#000",
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 64,
    paddingBottom: 48,
  },
  errorContainer: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    color: "#fff",
    fontSize: 16,
  },
  eyebrow: {
    color: "#6b7280",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 4,
    marginBottom: 8,
  },
  commonName: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "bold",
    marginBottom: 4,
  },
  species: {
    color: "#9ca3af",
    fontSize: 18,
    fontStyle: "italic",
    marginBottom: 24,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 32,
  },
  badgeText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  description: {
    color: "#e5e7eb",
    fontSize: 16,
    lineHeight: 28,
  },
  backButton: {
    marginTop: 48,
    backgroundColor: "#1f2937",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  backButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
});
