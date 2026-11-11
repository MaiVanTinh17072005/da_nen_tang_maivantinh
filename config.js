import { Platform } from "react-native";

// Thay bằng IPv4 thực tế của máy tính
const LAN_IP = "172.26.54.140";

// Đặt true khi chạy trên Android Emulator
const USE_ANDROID_EMULATOR = false;

export const API_URL =
  Platform.OS === "web"
    ? "http://localhost:5000"
    : USE_ANDROID_EMULATOR
      ? "http://10.0.2.2:5000"
      : `http://${LAN_IP}:5000`;