import { Stack } from "expo-router";
import { StatusBar } from "react-native";
import {
  MD3LightTheme as DefaultTheme,
  PaperProvider,
} from "react-native-paper";

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: "#5DADE2",
    secondary: "lightgrey",
  },
};

export function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
    </Stack>
  );
}

export default function wrapper() {
  return (
    <PaperProvider theme={theme}>
      <StatusBar translucent={true} barStyle={"dark-content"} />
      <RootLayout />
    </PaperProvider>
  );
}
