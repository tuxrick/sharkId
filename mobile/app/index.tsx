import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { identify } from "../services/api";

export default function CameraScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  if (!permission) {
    return <View className="flex-1 bg-black" />;
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 bg-black items-center justify-center px-8">
        <Text className="text-white text-2xl font-bold mb-3">SharkID</Text>
        <Text className="text-gray-400 text-base text-center mb-8">
          Necesitamos acceso a la cámara para identificar tiburones
        </Text>
        <Pressable
          onPress={requestPermission}
          className="bg-blue-500 px-8 py-3 rounded-full"
        >
          <Text className="text-white font-semibold text-base">
            Permitir cámara
          </Text>
        </Pressable>
      </View>
    );
  }

  async function capture() {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: false });
      if (!photo) throw new Error("No se pudo capturar la foto");
      const result = await identify(photo.uri);
      router.push({
        pathname: "/result",
        params: { data: JSON.stringify(result) },
      });
    } catch (err) {
      Alert.alert("Error", "No se pudo identificar el tiburón. Intenta de nuevo.");
      console.error("Capture error:", err);
    } finally {
      setCapturing(false);
    }
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView ref={cameraRef} className="flex-1" facing="back" />

      {/* Overlay label */}
      <View className="absolute top-14 w-full items-center">
        <Text className="text-white text-lg font-semibold tracking-widest opacity-80">
          SHARKID
        </Text>
      </View>

      {/* Capture button */}
      <View className="absolute bottom-14 w-full items-center">
        {capturing ? (
          <View className="w-20 h-20 items-center justify-center">
            <ActivityIndicator size="large" color="white" />
          </View>
        ) : (
          <Pressable
            onPress={capture}
            className="w-20 h-20 rounded-full bg-white border-4 border-gray-400 active:opacity-70"
          />
        )}
      </View>
    </View>
  );
}
