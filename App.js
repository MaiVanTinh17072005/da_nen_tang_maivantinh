
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
import { productApi } from "./api";

// Chỉ có 4 trường sản phẩm theo yêu cầu đề thi.
const emptyForm = {
  name: "",
  price: "",
  soluong: "",
  image: "",
};

function formatPrice(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0 đ";
  }

  return `${number.toLocaleString("vi-VN")} đ`;
}

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
      <Text style={styles.label}>
        {label}
      </Text>

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

  const [products, setProducts] = useState([]);

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
    console.error(
      "Application error:",
      error
    );

    setMessage(
      error?.message || "Đã xảy ra lỗi"
    );
  };

  // =========================
  // LOAD PRODUCTS
  // =========================

  const loadProducts = useCallback(async () => {
    if (!token) return;

    try {
      const data =
        await productApi.getProducts(token);

      setProducts(
        Array.isArray(data) ? data : []
      );
    } catch (error) {
      showError(error);
    }
  }, [token]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

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
      const data = await productApi.login(
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
  // LOGOUT
  // =========================

  function handleLogout() {
    setToken(null);
    setProducts([]);
    setForm({ ...emptyForm });
    setEditingId(null);
    setSearch("");
    setMessage("");
    setScreen("list");
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

  function openEdit(product) {
    setEditingId(product._id);

    setForm({
      name: product.name || "",
      price: String(product.price ?? ""),
      soluong: String(product.soluong ?? ""),
      image: product.image || "",
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
      // Android/iOS: xin quyền truy cập thư viện ảnh.
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
        // WEB: Giữ nguyên cách upload bằng Blob.
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
          asset.fileName || "product.jpg"
        );
      } else {
        // ANDROID/iOS:
        // Dùng File từ expo-file-system.
        // api.js sẽ sử dụng expo/fetch.
        const file = new File(asset.uri);

        imageForm.append(
          "image",
          file
        );
      }

      const data =
        await productApi.uploadImage(
          imageForm,
          token
        );

      if (!data.image) {
        throw new Error(
          "Upload thành công nhưng server không trả về URL ảnh"
        );
      }

      setForm((current) => ({
        ...current,
        image: data.image,
      }));

      setMessage(
        "Upload ảnh sản phẩm thành công"
      );
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }

  // =========================
  // CREATE / UPDATE PRODUCT
  // =========================

  async function saveProduct() {
    if (!form.name.trim()) {
      setMessage(
        "Vui lòng nhập tên sản phẩm"
      );
      return;
    }

    if (
      form.price.trim() === "" ||
      form.soluong.trim() === ""
    ) {
      setMessage(
        "Vui lòng nhập giá và số lượng sản phẩm"
      );
      return;
    }

    const price = Number(form.price);
    const soluong = Number(form.soluong);

    if (
      !Number.isFinite(price) ||
      price < 0
    ) {
      setMessage(
        "Giá sản phẩm phải là số không âm"
      );
      return;
    }

    if (
      !Number.isInteger(soluong) ||
      soluong < 0
    ) {
      setMessage(
        "Số lượng phải là số nguyên không âm"
      );
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      // Chỉ gửi đúng 4 trường lên Backend.
      const payload = {
        name: form.name.trim(),
        price,
        soluong,
        image: form.image || "",
      };

      if (editingId) {
        await productApi.updateProduct(
          editingId,
          payload,
          token
        );
      } else {
        await productApi.createProduct(
          payload,
          token
        );
      }

      await loadProducts();

      setScreen("list");
      setEditingId(null);
      setForm({ ...emptyForm });

      setMessage(
        editingId
          ? "Cập nhật sản phẩm thành công"
          : "Thêm sản phẩm thành công"
      );
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }

  // =========================
  // DELETE PRODUCT
  // =========================

  async function deleteProduct(id) {
    if (busy) return;

    setBusy(true);
    setMessage("");

    try {
      await productApi.deleteProduct(
        id,
        token
      );

      await loadProducts();

      setMessage(
        "Đã xóa sản phẩm thành công"
      );
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete(product) {
    const question =
      `Bạn có chắc muốn xóa sản phẩm "${product.name}"?`;

    if (Platform.OS === "web") {
      if (window.confirm(question)) {
        deleteProduct(product._id);
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
              deleteProduct(product._id),
          },
        ]
      );
    }
  }

  // =========================
  // SEARCH PRODUCTS
  // =========================

  const filteredProducts =
    products.filter((product) => {
      const keyword =
        search.toLowerCase().trim();

      return (
        (product.name || "")
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
        <ScrollView
          contentContainerStyle={
            styles.loginScroll
          }
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={styles.loginContainer}
          >
            <Text style={styles.title}>
              Product Management
            </Text>

            <Text style={styles.subtitle}>
              Đăng nhập hệ thống quản lý sản phẩm
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
        </ScrollView>
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
            Quản lý sản phẩm
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
          disabled={busy}
          onPress={handleLogout}
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
          style={{
            marginVertical: 8,
          }}
        />
      )}

      {screen === "list" ? (
        // =====================
        // PRODUCT LIST
        // =====================

        <View style={styles.content}>
          <View style={styles.toolbar}>
            <Button
              title="+ Thêm sản phẩm"
              onPress={openAdd}
              disabled={busy}
            />

            <Button
              title="Làm mới"
              secondary
              onPress={loadProducts}
              disabled={busy}
            />
          </View>

          <TextInput
            style={styles.input}
            placeholder="Tìm theo tên sản phẩm..."
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
          />

          <Text style={styles.resultCount}>
            Tổng số sản phẩm: {filteredProducts.length}
          </Text>

          <FlatList
            data={filteredProducts}
            keyExtractor={(item) =>
              item._id
            }
            contentContainerStyle={
              styles.listContainer
            }
            ListEmptyComponent={
              <Text style={styles.empty}>
                Chưa có sản phẩm phù hợp
              </Text>
            }
            renderItem={({ item }) => (
              <View
                style={styles.productCard}
              >
                {item.image ? (
                  <Image
                    source={{
                      uri: item.image,
                    }}
                    style={
                      styles.productImage
                    }
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.productImage,
                      styles.noImage,
                    ]}
                  >
                    <Text
                      style={
                        styles.noImageText
                      }
                    >
                      Chưa có ảnh
                    </Text>
                  </View>
                )}

                <View
                  style={styles.productInfo}
                >
                  <Text
                    style={styles.productName}
                  >
                    {item.name}
                  </Text>

                  <Text
                    style={styles.productPrice}
                  >
                    {formatPrice(item.price)}
                  </Text>

                  <Text
                    style={
                      styles.productQuantity
                    }
                  >
                    Số lượng: {item.soluong}
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
        // ADD / EDIT PRODUCT
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
              ? "Sửa sản phẩm"
              : "Thêm sản phẩm"}
          </Text>

          <View
            style={styles.imageContainer}
          >
            {form.image ? (
              <Image
                source={{
                  uri: form.image,
                }}
                style={
                  styles.largeProductImage
                }
                resizeMode="cover"
              />
            ) : (
              <View
                style={[
                  styles.largeProductImage,
                  styles.noImage,
                ]}
              >
                <Text>
                  Chưa có ảnh sản phẩm
                </Text>
              </View>
            )}

            <Button
              title={
                busy
                  ? "Đang xử lý..."
                  : "Chọn ảnh sản phẩm"
              }
              secondary
              onPress={pickImage}
              disabled={busy}
            />
          </View>

          <Field
            label="Tên sản phẩm (name)"
            value={form.name}
            onChangeText={(value) =>
              setForm((current) => ({
                ...current,
                name: value,
              }))
            }
            placeholder="Ví dụ: Laptop Dell Inspiron 15"
          />

          <Field
            label="Giá sản phẩm (price)"
            value={form.price}
            onChangeText={(value) =>
              setForm((current) => ({
                ...current,
                price: value,
              }))
            }
            keyboardType="decimal-pad"
            placeholder="Ví dụ: 15000000"
          />

          <Field
            label="Số lượng (soluong)"
            value={form.soluong}
            onChangeText={(value) =>
              setForm((current) => ({
                ...current,
                soluong: value,
              }))
            }
            keyboardType="number-pad"
            placeholder="Ví dụ: 10"
          />

          <View style={styles.toolbar}>
            <Button
              title={
                busy
                  ? "Đang lưu..."
                  : editingId
                    ? "Cập nhật sản phẩm"
                    : "Lưu sản phẩm"
              }
              onPress={saveProduct}
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

  loginScroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 24,
  },

  loginContainer: {
    width: "90%",
    maxWidth: 440,
    alignSelf: "center",
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
    gap: 10,
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
    textAlign: "center",
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
    color: "#1e293b",
  },

  productCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  productImage: {
    width: 90,
    height: 90,
    borderRadius: 10,
  },

  noImage: {
    backgroundColor: "#dce7f8",
    alignItems: "center",
    justifyContent: "center",
  },

  noImageText: {
    fontSize: 12,
    color: "#64748b",
    textAlign: "center",
  },

  productInfo: {
    flex: 1,
  },

  productName: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 5,
  },

  productPrice: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#dc3545",
    marginBottom: 5,
  },

  productQuantity: {
    fontSize: 14,
    color: "#64748b",
  },

  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    flexWrap: "wrap",
  },

  resultCount: {
    color: "#64748b",
    marginBottom: 12,
    fontSize: 13,
  },

  listContainer: {
    paddingBottom: 30,
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

  largeProductImage: {
    width: 160,
    height: 160,
    borderRadius: 12,
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
