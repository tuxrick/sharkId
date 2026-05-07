import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { identify } from "../services/api";

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  async function processAndNavigate(uri: string) {
    try {
      const result = await identify(uri);
      router.push({
        pathname: "/result",
        params: { data: JSON.stringify(result) },
      });
    } catch (err) {
      Alert.alert("Error", "No se pudo identificar el tiburón. Intenta de nuevo.");
      console.error("Identify error:", err);
    }
  }

  async function capture() {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: false });
      if (!photo) throw new Error("No se pudo capturar la foto");
      await processAndNavigate(photo.uri);
    } finally {
      setCapturing(false);
    }
  }

  async function pickFromLibrary() {
    if (capturing) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permiso requerido", "Necesitamos acceso a tu galería para seleccionar fotos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });
    if (result.canceled || !result.assets[0]) return;
    setCapturing(true);
    try {
      await processAndNavigate(result.assets[0].uri);
    } finally {
      setCapturing(false);
    }
  }

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.title}>SharkID</Text>
        <Text style={styles.subtitle}>
          Necesitamos acceso a la cámara para identificar tiburones
        </Text>
        <Pressable style={styles.button} onPress={requestPermission}>
          <Text style={styles.buttonText}>Permitir cámara</Text>
        </Pressable>
        <Pressable style={[styles.button, styles.buttonSecondary]} onPress={pickFromLibrary}>
          <Text style={styles.buttonText}>Usar galería</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={styles.camera} facing="back" />

      <View style={styles.labelContainer}>
        <Text style={styles.label}>SHARKID</Text>
      </View>

      <View style={styles.controlsContainer}>
        {capturing ? (
          <View style={styles.spinnerContainer}>
            <ActivityIndicator size="large" color="white" />
          </View>
        ) : (
          <View style={styles.buttonRow}>
            {/* Galería */}
            <Pressable style={styles.galleryButton} onPress={pickFromLibrary}>
              <Text style={styles.galleryIcon}>⬛</Text>
              <Text style={styles.galleryLabel}>Galería</Text>
            </Pressable>

            {/* Captura */}
            <Pressable style={styles.captureButton} onPress={capture} />

            {/* Spacer para centrar el botón de captura */}
            <View style={styles.spacer} />
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    color: "#9ca3af",
    fontSize: 16,
    textAlign: "center",
    marginBottom: 20,
  },
  button: {
    backgroundColor: "#3b82f6",
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 999,
    width: "100%",
    alignItems: "center",
  },
  buttonSecondary: {
    backgroundColor: "#1f2937",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  camera: {
    flex: 1,
  },
  labelContainer: {
    position: "absolute",
    top: 56,
    width: "100%",
    alignItems: "center",
  },
  label: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 6,
    opacity: 0.8,
  },
  controlsContainer: {
    position: "absolute",
    bottom: 48,
    width: "100%",
    alignItems: "center",
  },
  spinnerContainer: {
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingHorizontal: 40,
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#fff",
    borderWidth: 4,
    borderColor: "#9ca3af",
  },
  galleryButton: {
    width: 80,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  galleryIcon: {
    fontSize: 28,
  },
  galleryLabel: {
    color: "#fff",
    fontSize: 12,
    opacity: 0.8,
  },
  spacer: {
    width: 80,
  },
});
