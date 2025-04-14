import { Stack } from "expo-router";
import { StatusBar } from "react-native";
import {
  MD3LightTheme as DefaultTheme,
  PaperProvider,
} from "react-native-paper";

import { GestureHandlerRootView } from "react-native-gesture-handler";

export function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function wrapper() {
  const theme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      primary: "#5DADE2",
      secondary: "lightgrey",
    },
  };
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={theme}>
        <StatusBar translucent={true} barStyle={"dark-content"} />
        <RootLayout />
      </PaperProvider>
    </GestureHandlerRootView>
  );
}
