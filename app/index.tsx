import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  Alert,
  SafeAreaView,
  TouchableOpacity, // Can add onPress to the View wrapping LinearGradient if needed
} from "react-native";
import {
  Modal,
  Portal,
  useTheme,
  Text,
  Button,
  TextInput,
  IconButton,
  Appbar,
  SegmentedButtons,
} from "react-native-paper";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { format } from "date-fns"; // For formatting the creation date

// Keep splash screen visible while fonts load or data loads
SplashScreen.preventAutoHideAsync();

// --- Counter Interface (Revised) ---
interface Counter {
  id: string;
  name: string;
  createdAt: number; // Timestamp (milliseconds since epoch) when created
  isArchived: boolean; // For Current/Past tabs
  hasNotification?: boolean; // Optional: for the bell icon
}

// --- AsyncStorage Key ---
const STORAGE_KEY = "@days_since_app_data_v2"; // Use versioned key

// --- Main App Component ---
// Remember to wrap your root App component with <PaperProvider>
export default function Index() {
  const theme = useTheme(); // Access theme colors
  const [counters, setCounters] = useState<Counter[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [newCounterName, setNewCounterName] = useState("");
  const [isDataLoaded, setIsDataLoaded] = useState(false); // Track initial data load
  const [currentView, setCurrentView] = useState<"current" | "past">("current"); // State for tabs
  const [tick, setTick] = useState(0); // State to force updates for elapsed time

  // --- Font Loading ---
  // TODO: Replace with actual paths to fonts that match the target UI
  const [loaded, error] = useFonts({
    "Roboto-Regular": require("@/assets/fonts/roboto.ttf"),
    "Roboto-Bold": require("@/assets/fonts/roboto.ttf"),
    // Example: "Target-Bold-Font": require("@/assets/fonts/YourTargetBoldFont.otf"),
    // Example: "Target-Regular-Font": require("@/assets/fonts/YourTargetRegularFont.ttf"),
  });

  // --- Load Counters from Storage ---
  useEffect(() => {
    const loadCounters = async () => {
      try {
        const storedCounters = await AsyncStorage.getItem(STORAGE_KEY);
        if (storedCounters !== null) {
          const parsedCounters: Partial<Counter>[] = JSON.parse(storedCounters);
          const correctedCounters: Counter[] = parsedCounters.map(
            (c, index) => ({
              id: c.id || `${Date.now()}-${index}`, // Fallback ID
              name: c.name || "Unnamed Counter", // Fallback name
              createdAt: c.createdAt || Date.now(), // Default createdAt if missing
              isArchived: c.isArchived || false, // Default archive status
              hasNotification: c.hasNotification || false, // Default notification status
            })
          );
          setCounters(correctedCounters);
        }
      } catch (e) {
        console.error("Failed to load counters.", e);
        Alert.alert("Error", "Could not load saved counters.");
      } finally {
        setIsDataLoaded(true); // Mark data loading as complete (or failed)
      }
    };
    loadCounters();
  }, []); // Empty dependency array: runs only once on mount

  // --- Hide Splash Screen ---
  useEffect(() => {
    // Hide splash screen only when BOTH fonts are loaded AND initial data is loaded
    if ((loaded || error) && isDataLoaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error, isDataLoaded]); // Depend on font and data loading status

  // --- Save Counters to Storage ---
  useEffect(() => {
    // Don't save until initial data is loaded to prevent overwriting
    if (!isDataLoaded) {
      return;
    }
    const saveCounters = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(counters));
      } catch (e) {
        console.error("Failed to save counters.", e);
      }
    };
    saveCounters();
  }, [counters, isDataLoaded]); // Depend on counters and data loaded flag

  // --- Global Timer for Live Elapsed Time Updates ---
  useEffect(() => {
    // No timer needed if there are no counters
    if (counters.length === 0) return;

    // Interval to trigger re-renders every second
    const intervalId = setInterval(() => {
      setTick((prev) => prev + 1); // Force component update
    }, 1000); // Update every second

    // Cleanup function to clear interval when component unmounts
    // or when the number of counters becomes 0
    return () => clearInterval(intervalId);
  }, [counters.length]); // Re-run effect if the number of counters changes

  // --- Filtered Counters for Display ---
  // useMemo ensures this filtering only runs when necessary
  const displayedCounters = useMemo(() => {
    return counters.filter((c) =>
      currentView === "current" ? !c.isArchived : c.isArchived
    );
    // Relies on 'tick' indirectly via component re-render triggering useMemo check
  }, [counters, currentView]);

  // --- Action Handlers ---
  const handleAddCounter = () => {
    if (newCounterName.trim() === "") {
      Alert.alert("Missing Name", "Please enter a name for the counter.");
      return;
    }
    const newCounter: Counter = {
      id: Date.now().toString(),
      name: newCounterName.trim(),
      createdAt: Date.now(), // Set creation timestamp
      isArchived: false, // New counters are 'current'
      hasNotification: false, // Default notification state
    };
    // Add the new counter to the beginning of the list for visibility
    setCounters((prevCounters) => [newCounter, ...prevCounters]);
    setNewCounterName(""); // Clear input
    setIsModalVisible(false); // Close modal
  };

  const handleDeleteCounter = (id: string) => {
    const counterToDelete = counters.find((c) => c.id === id);
    Alert.alert(
      "Delete Counter",
      `Are you sure you want to delete "${
        counterToDelete?.name || "this counter"
      }"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setCounters((prevCounters) =>
              prevCounters.filter((counter) => counter.id !== id)
            );
          },
        },
      ]
    );
  };

  // Placeholder/Example for archiving - Implement with better UI later
  const handleArchiveToggle = (id: string) => {
    const targetCounter = counters.find((c) => c.id === id); // Find before updating state
    setCounters((prevCounters) =>
      prevCounters.map((counter) =>
        counter.id === id
          ? { ...counter, isArchived: !counter.isArchived }
          : counter
      )
    );
    // Provide feedback - maybe use a Snackbar from react-native-paper
    Alert.alert(
      !targetCounter?.isArchived ? "Archived" : "Unarchived", // Check original status for message
      `"${targetCounter?.name}" moved to ${
        !targetCounter?.isArchived ? "Past" : "Current"
      }.`
    );
  };

  // --- Render Item for FlatList ---
  // useCallback helps optimize FlatList rendering if props don't change
  const renderCounterItem = useCallback(
    ({ item }: { item: Counter }) => {
      const now = Date.now(); // Get current time for calculation
      const elapsedMs = Math.max(0, now - item.createdAt); // Ensure non-negative elapsed time in ms

      // Calculate different time units
      const totalSeconds = Math.floor(elapsedMs / 1000);
      const totalMinutes = Math.floor(totalSeconds / 60);
      const totalHours = Math.floor(totalMinutes / 60);
      const totalDays = Math.floor(totalHours / 24); // Same as 'daysSince'

      // Determine the value and label to display based on the rules
      let displayValue: string | number;
      let displayLabel: string;
      let isDaysView = false; // Flag to control layout slightly if needed

      if (totalDays > 0) {
        displayValue = totalDays;
        displayLabel = "DAYS SINCE";
        isDaysView = true;
      } else if (totalHours >= 1) {
        displayValue = totalHours;
        displayLabel = totalHours === 1 ? "HOUR AGO" : "HOURS AGO"; // Handle singular/plural
      } else if (totalMinutes >= 1) {
        displayValue = totalMinutes;
        displayLabel = totalMinutes === 1 ? "MINUTE AGO" : "MINUTES AGO"; // Handle singular/plural
      } else {
        displayValue = totalSeconds;
        displayLabel = totalSeconds === 1 ? "SECOND AGO" : "SECONDS AGO"; // Handle singular/plural
      }

      // Format the creation date (remains the same)
      const formattedDate = format(new Date(item.createdAt), "MMM dd, yyyy"); // Format like: Apr 13, 2025

      // Decide on font size for the main value dynamically (optional but recommended)
      const valueFontSize = isDaysView
        ? styles.daysNumber.fontSize
        : styles.hoursMinutesSecondsNumber.fontSize;
      const valueLineHeight = isDaysView
        ? styles.daysNumber.lineHeight
        : styles.hoursMinutesSecondsNumber.lineHeight;

      return (
        // <TouchableOpacity onPress={() => Alert.alert("Item Pressed", item.name)}>
        <View style={styles.cardContainer}>
          <LinearGradient
            // TODO: Fine-tune these gradient colors
            colors={["#FEC9CE", "#FEC9CE", "#FF96A3"]} // Example: Lighter pink to slightly darker pink/coral
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradient}
          >
            <View style={styles.cardContent}>
              {/* Left Side: Displays Days OR H/M/S */}
              <View style={styles.leftColumn}>
                {/* Apply dynamic font size and line height */}
                <Text
                  style={[
                    styles.daysNumber,
                    { fontSize: valueFontSize, lineHeight: valueLineHeight },
                  ]}
                >
                  {displayValue}
                </Text>
                {/* Use the dynamic label */}
                <Text style={styles.daysLabel}>{displayLabel}</Text>
              </View>

              {/* Right Side: Date and Name */}
              <View style={styles.rightColumn}>
                <Text style={styles.dateText}>{formattedDate}</Text>
                <Text
                  style={styles.nameText}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {item.name}
                </Text>
              </View>

              {/* Optional: Notification Bell Icon */}
              {item.hasNotification && (
                <IconButton
                  icon="bell-outline"
                  size={18}
                  style={styles.notificationIcon}
                  iconColor={"rgba(0, 0, 0, 0.6)"} // Adjust color
                  // onPress={() => Alert.alert("Notification", "Handle notification tap")}
                />
              )}
            </View>

            {/* --- Placeholder Buttons - REMOVE/REPLACE LATER --- */}
            <View style={styles.tempActionRow}>
              <Button
                mode="text"
                compact
                onPress={() => handleArchiveToggle(item.id)}
                labelStyle={styles.tempButtonLabel}
              >
                {item.isArchived ? "Unarchive" : "Archive"}
              </Button>
              <Button
                mode="text"
                compact
                onPress={() => handleDeleteCounter(item.id)}
                labelStyle={styles.tempButtonLabel}
                textColor={theme.colors.error}
              >
                Delete
              </Button>
            </View>
            {/* --- End Placeholder Buttons --- */}
          </LinearGradient>
        </View>
        // </TouchableOpacity>
      );
      // Include dependencies used within the callback
    },
    [theme.colors.error]
  ); // theme.colors.error used in temp delete button

  // --- Main Render ---
  // Show nothing until fonts and data are loaded (splash screen covers this)
  if (!loaded || !isDataLoaded) {
    return null;
  }
  // Handle font loading error gracefully
  if (error) {
    console.error("Font loading error:", error);
    // Provide basic UI indicating the error
    return (
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: theme?.colors?.background || "#fff" },
        ]}
      >
        <View style={styles.centered}>
          <Text
            style={{ color: theme?.colors?.error || "red", marginBottom: 10 }}
          >
            Error loading application assets.
          </Text>
          <Text style={{ color: theme?.colors?.onSurface || "#000" }}>
            Please try restarting the app.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Custom Header */}
      <Appbar.Header
        mode="center-aligned" // Or "small", "medium", "large"
        elevated={false} // No shadow below header
        style={{ backgroundColor: theme.colors.background }}
      >
        <Appbar.Action
          icon="menu"
          onPress={() =>
            Alert.alert("Menu Action", "Implement navigation or settings.")
          }
        />
        <Appbar.Content title="" /> {/* Intentionally empty title */}
        <Appbar.Action
          icon="plus"
          size={28}
          onPress={() => setIsModalVisible(true)}
        />
      </Appbar.Header>

      {/* Current/Past Tabs */}
      <View style={styles.segmentContainer}>
        <SegmentedButtons
          value={currentView}
          onValueChange={(value) => setCurrentView(value as "current" | "past")}
          style={styles.segmentButtons}
          density="medium" // Adjust density for spacing
          buttons={[
            // Apply custom styling to buttons/labels if needed via theme or style prop
            {
              value: "current",
              label: "Current",
              style:
                currentView === "current"
                  ? styles.segmentSelected
                  : styles.segmentUnselected,
            },
            {
              value: "past",
              label: "Past",
              style:
                currentView === "past"
                  ? styles.segmentSelected
                  : styles.segmentUnselected,
            },
          ]}
        />
      </View>

      {/* List of Counters */}
      <FlatList
        data={displayedCounters} // Use the filtered list
        renderItem={renderCounterItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          // Show message when list is empty
          <View style={styles.centered}>
            <Text style={styles.emptyText}>
              No counters {currentView === "past" ? "archived" : "yet"}.
            </Text>
            {currentView === "current" && (
              <Text style={styles.emptyText}>Press '+' to add one!</Text>
            )}
          </View>
        }
        contentContainerStyle={styles.listContent} // Padding for the list itself
      />

      {/* Add New Counter Modal */}
      <Portal>
        <Modal
          visible={isModalVisible}
          onDismiss={() => setIsModalVisible(false)} // Close when tapping outside
          contentContainerStyle={[
            styles.modalContainer,
            { backgroundColor: theme.colors.elevation.level2 },
          ]} // Modal styling
        >
          <Text variant="headlineSmall" style={styles.modalTitle}>
            Add New Counter
          </Text>
          <TextInput
            label="Counter Name"
            value={newCounterName}
            onChangeText={setNewCounterName}
            mode="outlined" // Or "flat"
            style={styles.modalInput}
            autoFocus // Automatically focus the input
          />
          <View style={styles.modalButtonRow}>
            <Button
              mode="outlined" // Secondary action style
              onPress={() => setIsModalVisible(false)}
              style={styles.modalButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained" // Primary action style
              onPress={handleAddCounter}
              style={styles.modalButton}
              disabled={!newCounterName.trim()} // Disable if name is empty
            >
              Add
            </Button>
          </View>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
}

// --- Styles ---
// TODO: Adjust fonts, colors, spacing meticulously to match the target image
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 50, // Offset from tabs
  },
  segmentContainer: {
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: "15%", // Use percentage for responsive width
    borderBottomWidth: 1, // Optional separator line
    borderBottomColor: "#eee", // Optional separator line color
  },
  segmentButtons: {
    // The buttons prop handles individual styling now
  },
  segmentSelected: {
    // Style for the selected segment button (e.g., background, border)
    // backgroundColor: '#e0e0e0', // Example
  },
  segmentUnselected: {
    // Style for unselected segment button
  },
  listContent: {
    paddingHorizontal: 15, // Side padding for list items
    paddingBottom: 30, // Bottom padding
    paddingTop: 10, // Padding below tabs
  },
  cardContainer: {
    marginVertical: 8,
    borderRadius: 18, // Increased roundness
    elevation: 4, // Slightly more shadow (Android)
    shadowColor: "#000", // iOS shadow
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  gradient: {
    borderRadius: 18, // Match container
    // Padding applied via cardContent
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18, // Vertical padding inside card
    paddingHorizontal: 15, // Horizontal padding inside card
  },
  leftColumn: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 85, // Ensure space for large number
    paddingRight: 15, // Space between columns
    borderRightWidth: 1, // Optional faint separator line
    borderRightColor: "rgba(0, 0, 0, 0.1)", // Light separator
  },
  rightColumn: {
    flex: 1, // Take remaining space
    justifyContent: "center",
    paddingLeft: 15, // Space after the separator line
  },
  // Style for the main number display (Days)
  daysNumber: {
    fontSize: 46,
    // fontFamily: 'Target-Bold-Font', // Use your specific bold font
    fontWeight: "bold", // Fallback
    color: "#111",
    lineHeight: 50, // Adjust line height based on font
  },
  // Style for the main number display (Hours, Minutes, Seconds)
  hoursMinutesSecondsNumber: {
    fontSize: 38, // Slightly smaller font size for H/M/S
    // fontFamily: 'Target-Bold-Font', // Can use the same font
    fontWeight: "bold",
    color: "#111",
    lineHeight: 42, // Adjust line height
  },
  // Style for the label below the number (DAYS SINCE / HOURS AGO etc.)
  daysLabel: {
    fontSize: 10,
    // fontFamily: 'Target-Regular-Font',
    color: "#333",
    letterSpacing: 1.5, // More spacing
    fontWeight: "500",
    marginTop: 3,
    textTransform: "uppercase", // Match image
    textAlign: "center", // Center the label text
  },
  dateText: {
    fontSize: 12,
    // fontFamily: 'Target-Regular-Font',
    color: "#444",
    marginBottom: 5, // More space below date
  },
  nameText: {
    fontSize: 17, // Slightly larger name
    // fontFamily: 'Target-Regular-Font',
    fontWeight: "500", // Medium weight
    color: "#000",
  },
  notificationIcon: {
    position: "absolute",
    top: 8, // Adjust position
    right: 8,
  },
  emptyText: {
    textAlign: "center",
    fontSize: 15,
    color: "#666", // Softer color
    marginTop: 10,
  },
  // Modal Styles
  modalContainer: { padding: 20, margin: 20, borderRadius: 12 },
  modalTitle: { marginBottom: 20, textAlign: "center" },
  modalInput: { marginBottom: 20 },
  modalButtonRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
  },
  modalButton: { minWidth: 100 }, // Give buttons some minimum width
  // Styles for Temp Action Buttons (Remove later)
  tempActionRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 5,
    borderTopWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    marginTop: 10,
    marginBottom: -5, // Pull up slightly if needed
  },
  tempButtonLabel: {
    fontSize: 12,
  },
});

// --- REMINDER ---
// Make sure your main App component (e.g., App.js or App.tsx)
// wraps the entire application with <PaperProvider> from react-native-paper
// for the theme and Portal components to work correctly.
// Example App.js:
//
// import * as React from 'react';
// import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
// import Index from './app/index'; // Adjust path
//
// // Optional: Customize theme
// const theme = { ...DefaultTheme };
//
// export default function App() {
//   return (
//     <PaperProvider theme={theme}>
//       <Index />
//     </PaperProvider>
//   );
// }
