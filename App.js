
import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import { userApi } from "./api";

const emptyForm = {
  email: "",
  matkhau: "",
  hoten: "",
  hinhanh: "",
};

function Button({
  title,
  onPress,
  danger,
  secondary,
  disabled,
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        danger && styles.dangerButton,
        secondary && styles.secondaryButton,
        disabled && { opacity: 0.5 },
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          secondary && { color: "#163d78" },
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

function Field({
  label,
  value,
  onChangeText,
  secureTextEntry,
  ...props
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>

      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={secureTextEntry}
        placeholderTextColor="#94a3b8"
        {...props}
      />
    </View>
  );
}

export default function App() {
  const [token, setToken] = useState(null);

  const [loginEmail, setLoginEmail] =
    useState("");

  const [loginPassword, setLoginPassword] =
    useState("");

  const [users, setUsers] = useState([]);

  const [screen, setScreen] =
    useState("list");

  const [form, setForm] =
    useState({ ...emptyForm });

  const [editingId, setEditingId] =
    useState(null);

  const [search, setSearch] =
    useState("");

  const [busy, setBusy] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const showError = (error) => {
    console.error("Application error:", error);

    setMessage(
      error?.message || "Đã xảy ra lỗi"
    );
  };

  // =========================
  // LOAD USERS
  // =========================

  const loadUsers = useCallback(async () => {
    if (!token) return;

    try {
      const data =
        await userApi.getUsers(token);

      setUsers(
        Array.isArray(data) ? data : []
      );
    } catch (error) {
      showError(error);
    }
  }, [token]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // =========================
  // LOGIN
  // =========================

  async function handleLogin() {
    if (
      !loginEmail.trim() ||
      !loginPassword
    ) {
      setMessage(
        "Vui lòng nhập email và mật khẩu"
      );
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const data = await userApi.login(
        loginEmail.trim(),
        loginPassword
      );

      if (!data.token) {
        throw new Error(
          "Server không trả về token"
        );
      }

      setToken(data.token);
      setScreen("list");
      setLoginPassword("");
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }

  // =========================
  // OPEN ADD FORM
  // =========================

  function openAdd() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setMessage("");
    setScreen("form");
  }

  // =========================
  // OPEN EDIT FORM
  // =========================

  function openEdit(user) {
    setEditingId(user._id);

    setForm({
      email: user.email,
      hoten: user.hoten,
      hinhanh: user.hinhanh || "",
      matkhau: "",
    });

    setMessage("");
    setScreen("form");
  }

  // =========================
  // PICK AND UPLOAD IMAGE
  // =========================

  async function pickImage() {
    if (busy) return;

    setBusy(true);
    setMessage("");

    try {
      // Trên Android/iOS yêu cầu quyền truy cập ảnh
      if (Platform.OS !== "web") {
        const permission =
          await ImagePicker
            .requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
          throw new Error(
            "Cần cấp quyền truy cập thư viện ảnh"
          );
        }
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });

      if (
        result.canceled ||
        !result.assets?.length
      ) {
        return;
      }

      const asset = result.assets[0];

      if (!asset.uri) {
        throw new Error(
          "Không đọc được đường dẫn ảnh"
        );
      }

      const imageForm = new FormData();

      if (Platform.OS === "web") {
        // WEB: Sử dụng Blob như trước
        const imageResponse =
          await fetch(asset.uri);

        if (!imageResponse.ok) {
          throw new Error(
            "Không thể đọc ảnh đã chọn"
          );
        }

        const blob =
          await imageResponse.blob();

        imageForm.append(
          "image",
          blob,
          asset.fileName || "avatar.jpg"
        );
      } else {
        // ANDROID / IOS:
        // Dùng File của expo-file-system
        // thay vì object {uri, name, type}.
        const file = new File(asset.uri);

        imageForm.append(
          "image",
          file
        );
      }

      // api.js sẽ sử dụng expo/fetch
      // cho FormData trên Android/iOS.
      const data =
        await userApi.uploadImage(
          imageForm,
          token
        );

      if (!data.hinhanh) {
        throw new Error(
          "Upload thành công nhưng server không trả về URL ảnh"
        );
      }

      setForm((current) => ({
        ...current,
        hinhanh: data.hinhanh,
      }));

      setMessage(
        "Upload ảnh thành công"
      );
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }

  // =========================
  // CREATE / UPDATE USER
  // =========================

  async function saveUser() {
    if (
      !form.email.trim() ||
      !form.hoten.trim()
    ) {
      setMessage(
        "Vui lòng nhập email và họ tên"
      );
      return;
    }

    if (
      !editingId &&
      !form.matkhau
    ) {
      setMessage(
        "Vui lòng nhập mật khẩu"
      );
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const payload = {
        email: form.email.trim(),
        hoten: form.hoten.trim(),
        hinhanh: form.hinhanh,
      };

      if (form.matkhau) {
        payload.matkhau =
          form.matkhau;
      }

      if (editingId) {
        await userApi.updateUser(
          editingId,
          payload,
          token
        );
      } else {
        await userApi.createUser(
          payload,
          token
        );
      }

      await loadUsers();

      setScreen("list");

      setMessage(
        "Lưu người dùng thành công"
      );
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }

  // =========================
  // DELETE USER
  // =========================

  async function deleteUser(id) {
    setBusy(true);
    setMessage("");

    try {
      await userApi.deleteUser(
        id,
        token
      );

      await loadUsers();

      setMessage(
        "Đã xóa người dùng"
      );
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete(user) {
    const question =
      `Xóa người dùng ${user.hoten}?`;

    if (Platform.OS === "web") {
      if (window.confirm(question)) {
        deleteUser(user._id);
      }
    } else {
      Alert.alert(
        "Xác nhận xóa",
        question,
        [
          {
            text: "Hủy",
            style: "cancel",
          },
          {
            text: "Xóa",
            style: "destructive",
            onPress: () =>
              deleteUser(user._id),
          },
        ]
      );
    }
  }

  // =========================
  // SEARCH USERS
  // =========================

  const filteredUsers =
    users.filter((user) => {
      const keyword =
        search.toLowerCase().trim();

      return (
        (user.hoten || "")
          .toLowerCase()
          .includes(keyword) ||
        (user.email || "")
          .toLowerCase()
          .includes(keyword)
      );
    });

  // =========================
  // LOGIN SCREEN
  // =========================

  if (!token) {
    return (
      <SafeAreaView
        style={styles.container}
      >
        <View
          style={styles.loginContainer}
        >
          <Text style={styles.title}>
            User Management
          </Text>

          <Text style={styles.subtitle}>
            Đăng nhập hệ thống quản trị
          </Text>

          <Field
            label="Email"
            value={loginEmail}
            onChangeText={setLoginEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="admin@example.com"
          />

          <Field
            label="Mật khẩu"
            value={loginPassword}
            onChangeText={
              setLoginPassword
            }
            secureTextEntry
            placeholder="Nhập mật khẩu"
          />

          {message ? (
            <Text
              style={styles.message}
            >
              {message}
            </Text>
          ) : null}

          <Button
            title={
              busy
                ? "Đang đăng nhập..."
                : "Đăng nhập"
            }
            onPress={handleLogin}
            disabled={busy}
          />
        </View>
      </SafeAreaView>
    );
  }

  // =========================
  // MAIN SCREEN
  // =========================

  return (
    <SafeAreaView
      style={styles.container}
    >
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text
            style={styles.headerTitle}
          >
            Quản lý người dùng
          </Text>

          <Text
            style={styles.headerSubtitle}
          >
            React Native • MongoDB • Cloudinary
          </Text>
        </View>

        <Button
          title="Đăng xuất"
          secondary
          onPress={() => {
            setToken(null);
            setUsers([]);
            setMessage("");
            setScreen("list");
          }}
        />
      </View>

      {message ? (
        <Text style={styles.message}>
          {message}
        </Text>
      ) : null}

      {busy && (
        <ActivityIndicator
          color="#174ea6"
          style={{ marginVertical: 8 }}
        />
      )}

      {screen === "list" ? (
        // =====================
        // USER LIST
        // =====================

        <View style={styles.content}>
          <View style={styles.toolbar}>
            <Button
              title="+ Thêm"
              onPress={openAdd}
              disabled={busy}
            />

            <Button
              title="Làm mới"
              secondary
              onPress={loadUsers}
              disabled={busy}
            />
          </View>

          <TextInput
            style={styles.input}
            placeholder={
              "Tìm theo họ tên hoặc email..."
            }
            value={search}
            onChangeText={setSearch}
          />

          <FlatList
            data={filteredUsers}
            keyExtractor={(item) =>
              item._id
            }
            ListEmptyComponent={
              <Text style={styles.empty}>
                Chưa có người dùng phù hợp
              </Text>
            }
            renderItem={({ item }) => (
              <View
                style={styles.userCard}
              >
                {item.hinhanh ? (
                  <Image
                    source={{
                      uri: item.hinhanh,
                    }}
                    style={styles.avatar}
                  />
                ) : (
                  <View
                    style={[
                      styles.avatar,
                      styles.noAvatar,
                    ]}
                  >
                    <Text
                      style={styles.avatarText}
                    >
                      {(item.hoten || "?")
                        .charAt(0)
                        .toUpperCase()}
                    </Text>
                  </View>
                )}

                <View
                  style={styles.userInfo}
                >
                  <Text
                    style={styles.userName}
                  >
                    {item.hoten}
                  </Text>

                  <Text
                    style={styles.userEmail}
                  >
                    {item.email}
                  </Text>

                  <View
                    style={styles.actions}
                  >
                    <Button
                      title="Sửa"
                      secondary
                      disabled={busy}
                      onPress={() =>
                        openEdit(item)
                      }
                    />

                    <Button
                      title="Xóa"
                      danger
                      disabled={busy}
                      onPress={() =>
                        confirmDelete(item)
                      }
                    />
                  </View>
                </View>
              </View>
            )}
          />
        </View>
      ) : (
        // =====================
        // ADD / EDIT FORM
        // =====================

        <ScrollView
          contentContainerStyle={
            styles.formContainer
          }
          keyboardShouldPersistTaps="handled"
        >
          <Text
            style={styles.sectionTitle}
          >
            {editingId
              ? "Sửa người dùng"
              : "Thêm người dùng"}
          </Text>

          <View
            style={styles.imageContainer}
          >
            {form.hinhanh ? (
              <Image
                source={{
                  uri: form.hinhanh,
                }}
                style={styles.largeAvatar}
              />
            ) : (
              <View
                style={[
                  styles.largeAvatar,
                  styles.noAvatar,
                ]}
              >
                <Text>
                  Chưa có ảnh
                </Text>
              </View>
            )}

            <Button
              title={
                busy
                  ? "Đang xử lý..."
                  : "Chọn ảnh"
              }
              secondary
              onPress={pickImage}
              disabled={busy}
            />
          </View>

          <Field
            label="Họ tên"
            value={form.hoten}
            onChangeText={(value) =>
              setForm((current) => ({
                ...current,
                hoten: value,
              }))
            }
            placeholder="Nhập họ tên"
          />

          <Field
            label="Email"
            value={form.email}
            onChangeText={(value) =>
              setForm((current) => ({
                ...current,
                email: value,
              }))
            }
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Nhập email"
          />

          <Field
            label={
              editingId
                ? "Mật khẩu mới (để trống nếu giữ nguyên)"
                : "Mật khẩu"
            }
            value={form.matkhau}
            onChangeText={(value) =>
              setForm((current) => ({
                ...current,
                matkhau: value,
              }))
            }
            secureTextEntry
            placeholder="Nhập mật khẩu"
          />

          <View style={styles.toolbar}>
            <Button
              title={
                busy
                  ? "Đang lưu..."
                  : "Lưu"
              }
              onPress={saveUser}
              disabled={busy}
            />

            <Button
              title="Hủy"
              secondary
              disabled={busy}
              onPress={() => {
                setScreen("list");
                setMessage("");
              }}
            />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// =========================
// STYLES
// =========================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f3f6fb",
  },

  loginContainer: {
    width: "90%",
    maxWidth: 440,
    alignSelf: "center",
    marginTop: 100,
    backgroundColor: "#fff",
    padding: 28,
    borderRadius: 16,
  },

  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#153b73",
    marginBottom: 8,
  },

  subtitle: {
    color: "#64748b",
    marginBottom: 24,
  },

  header: {
    backgroundColor: "#fff",
    padding: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#153b73",
  },

  headerSubtitle: {
    fontSize: 11,
    color: "#64748b",
  },

  content: {
    flex: 1,
    width: "95%",
    maxWidth: 900,
    alignSelf: "center",
    paddingTop: 20,
  },

  toolbar: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
    flexWrap: "wrap",
  },

  button: {
    backgroundColor: "#174ea6",
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },

  secondaryButton: {
    backgroundColor: "#e7eefb",
  },

  dangerButton: {
    backgroundColor: "#dc3545",
  },

  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },

  field: {
    marginBottom: 16,
  },

  label: {
    fontWeight: "600",
    marginBottom: 7,
    color: "#334155",
  },

  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    padding: 13,
    borderRadius: 9,
    fontSize: 15,
    marginBottom: 12,
  },

  userCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  avatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
  },

  noAvatar: {
    backgroundColor: "#dce7f8",
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#174ea6",
  },

  userInfo: {
    flex: 1,
  },

  userName: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#1e293b",
  },

  userEmail: {
    color: "#64748b",
    marginVertical: 5,
  },

  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },

  formContainer: {
    width: "95%",
    maxWidth: 600,
    alignSelf: "center",
    padding: 20,
    paddingBottom: 60,
  },

  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#153b73",
  },

  imageContainer: {
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },

  largeAvatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },

  message: {
    color: "#b45309",
    textAlign: "center",
    padding: 12,
  },

  empty: {
    textAlign: "center",
    marginTop: 40,
    color: "#64748b",
  },
});
