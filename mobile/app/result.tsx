import { router, useLocalSearchParams } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";

interface IdentifyResult {
  species: string;
  common_name: string;
  confidence: "alta" | "media" | "baja";
  description: string;
}

const confidenceStyle: Record<IdentifyResult["confidence"], string> = {
  alta: "bg-green-500",
  media: "bg-yellow-500",
  baja: "bg-red-500",
};

const confidenceLabel: Record<IdentifyResult["confidence"], string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

export default function ResultScreen() {
  const { data } = useLocalSearchParams<{ data: string }>();

  if (!data) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <Text className="text-white text-base">Sin datos</Text>
      </View>
    );
  }

  const result = JSON.parse(data) as IdentifyResult;

  return (
    <ScrollView
      className="flex-1 bg-black"
      contentContainerClassName="px-6 pt-16 pb-12"
    >
      <Text className="text-gray-500 text-sm uppercase tracking-widest mb-2">
        Identificación
      </Text>

      <Text className="text-white text-4xl font-bold mb-1">
        {result.common_name}
      </Text>

      <Text className="text-gray-400 text-lg italic mb-6">{result.species}</Text>

      <View
        className={`self-start px-4 py-1.5 rounded-full mb-8 ${confidenceStyle[result.confidence]}`}
      >
        <Text className="text-white font-semibold text-sm">
          Confianza {confidenceLabel[result.confidence]}
        </Text>
      </View>

      <Text className="text-gray-200 text-base leading-7">
        {result.description}
      </Text>

      <Pressable
        onPress={() => router.replace("/")}
        className="mt-12 bg-gray-800 py-4 rounded-xl items-center active:opacity-70"
      >
        <Text className="text-white font-semibold text-base">Nueva foto</Text>
      </Pressable>
    </ScrollView>
  );
}
