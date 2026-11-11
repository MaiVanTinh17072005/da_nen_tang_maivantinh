
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  SafeAreaProvider,
  SafeAreaView,
} from "react-native-safe-area-context";

import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import { productApi } from "./api";

// ========================================
// CẤU HÌNH
// ========================================

const PRIMARY = "#ee4d2d";
const LOW_STOCK_LIMIT = 5;

// Chỉ có 4 trường sản phẩm theo đề bài.
const emptyForm = {
  name: "",
  price: "",
  soluong: "",
  image: "",
};

const FILTERS = [
  { key: "all", label: "Tất cả" },
  { key: "in_stock", label: "Còn hàng" },
  { key: "low_stock", label: "Sắp hết" },
  { key: "out_of_stock", label: "Hết hàng" },
];

const SORT_OPTIONS = [
  { key: "default", label: "Mặc định" },
  { key: "price_asc", label: "Giá tăng dần" },
  { key: "price_desc", label: "Giá giảm dần" },
  { key: "qty_asc", label: "Kho tăng dần" },
  { key: "qty_desc", label: "Kho giảm dần" },
  { key: "name_asc", label: "Tên A - Z" },
  { key: "name_desc", label: "Tên Z - A" },
];

function formatPrice(value) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return "0 ₫";
  }

  return number.toLocaleString("vi-VN") + " ₫";
}

function getStockStatus(quantity) {
  const qty = Number(quantity) || 0;

  if (qty <= 0) {
    return {
      label: "Hết hàng",
      color: "#dc2626",
      background: "#fef2f2",
      icon: "alert-circle-outline",
    };
  }

  if (qty <= LOW_STOCK_LIMIT) {
    return {
      label: "Sắp hết hàng",
      color: "#d97706",
      background: "#fffbeb",
      icon: "warning-outline",
    };
  }

  return {
    label: "Còn hàng",
    color: "#16a34a",
    background: "#f0fdf4",
    icon: "checkmark-circle-outline",
  };
}

// ========================================
// COMPONENT BUTTON
// ========================================

function AppButton({
  title,
  icon,
  onPress,
  variant = "primary",
  disabled = false,
  style,
}) {
  const isPrimary = variant === "primary";
  const isDanger = variant === "danger";

  const backgroundColor = isPrimary
    ? PRIMARY
    : isDanger
    ? "#fef2f2"
    : "#ffffff";

  const textColor = isPrimary
    ? "#ffffff"
    : isDanger
    ? "#dc2626"
    : "#475569";

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
      style={[
        styles.button,
        {
          backgroundColor,
          borderColor: isPrimary
            ? PRIMARY
            : isDanger
            ? "#fecaca"
            : "#e2e8f0",
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={17}
          color={textColor}
        />
      ) : null}

      <Text
        style={[
          styles.buttonText,
          { color: textColor },
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

// ========================================
// COMPONENT INPUT
// ========================================

function AppField({
  label,
  value,
  onChangeText,
  placeholder,
  icon,
  helperText,
  ...props
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>
        {label}
      </Text>

      <View style={styles.inputWrapper}>
        {icon ? (
          <Ionicons
            name={icon}
            size={19}
            color="#94a3b8"
          />
        ) : null}

        <TextInput
          style={styles.fieldInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          {...props}
        />
      </View>

      {helperText ? (
        <Text style={styles.helperText}>
          {helperText}
        </Text>
      ) : null}
    </View>
  );
}

// ========================================
// DASHBOARD CARD
// ========================================

function StatCard({
  title,
  value,
  icon,
  color = PRIMARY,
  background = "#fff1f0",
  onPress,
  active = false,
}) {
  return (
    <TouchableOpacity
      disabled={!onPress}
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.statCard,
        active && styles.statCardActive,
      ]}
    >
      <View
        style={[
          styles.statIcon,
          { backgroundColor: background },
        ]}
      >
        <Ionicons
          name={icon}
          size={22}
          color={color}
        />
      </View>

      <Text
        style={styles.statValue}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {value}
      </Text>

      <Text style={styles.statTitle}>
        {title}
      </Text>
    </TouchableOpacity>
  );
}

// ========================================
// PRODUCT CARD
// ========================================

function ProductCard({
  product,
  onEdit,
  onDelete,
  disabled,
}) {
  const qty = Number(product.soluong) || 0;
  const stock = getStockStatus(qty);

  return (
    <View style={styles.productCard}>
      <View style={styles.productImageWrap}>
        {product.image ? (
          <Image
            source={{ uri: product.image }}
            style={styles.productImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.productPlaceholder}>
            <Ionicons
              name="image-outline"
              size={32}
              color="#94a3b8"
            />

            <Text style={styles.placeholderText}>
              Chưa có ảnh
            </Text>
          </View>
        )}

        {qty <= LOW_STOCK_LIMIT ? (
          <View
            style={[
              styles.imageBadge,
              {
                backgroundColor:
                  qty === 0
                    ? "#dc2626"
                    : "#d97706",
              },
            ]}
          >
            <Text style={styles.imageBadgeText}>
              {qty === 0 ? "HẾT HÀNG" : "SẮP HẾT"}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.productInfo}>
        <Text
          style={styles.productName}
          numberOfLines={2}
        >
          {product.name}
        </Text>

        <Text style={styles.productPrice}>
          {formatPrice(product.price)}
        </Text>

        <View
          style={[
            styles.stockBadge,
            { backgroundColor: stock.background },
          ]}
        >
          <Ionicons
            name={stock.icon}
            size={14}
            color={stock.color}
          />

          <Text
            style={[
              styles.stockBadgeText,
              { color: stock.color },
            ]}
          >
            {stock.label} · Kho: {qty}
          </Text>
        </View>

        <View style={styles.productActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => onEdit(product)}
            disabled={disabled}
          >
            <Ionicons
              name="create-outline"
              size={16}
              color="#2563eb"
            />

            <Text style={styles.editText}>
              Sửa
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => onDelete(product)}
            disabled={disabled}
          >
            <Ionicons
              name="trash-outline"
              size={16}
              color="#dc2626"
            />

            <Text style={styles.deleteText}>
              Xóa
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ========================================
// MAIN APP
// ========================================

function ProductManagementApp() {
  // Đăng nhập
  const [token, setToken] = useState(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Sản phẩm
  const [products, setProducts] = useState([]);
  const [screen, setScreen] = useState("list");
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState(null);

  // Tìm kiếm, lọc, sắp xếp
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("default");

  // Trạng thái
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  function notify(text, type = "info") {
    setMessage(text);
    setMessageType(type);
  }

  function showError(error) {
    console.error("Application error:", error);

    notify(
      error?.message ||
        "Đã xảy ra lỗi. Vui lòng thử lại.",
      "error"
    );
  }

  // ========================================
  // LOAD PRODUCTS
  // ========================================

  const loadProducts = useCallback(
    async (showLoading = true) => {
      if (!token) return;

      if (showLoading) {
        setBusy(true);
      }

      try {
        const data = await productApi.getProducts(token);

        setProducts(
          Array.isArray(data) ? data : []
        );
      } catch (error) {
        showError(error);
      } finally {
        if (showLoading) {
          setBusy(false);
        }
      }
    },
    [token]
  );

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  async function handleRefresh() {
    if (!token || refreshing) return;

    setRefreshing(true);

    try {
      const data = await productApi.getProducts(token);

      setProducts(
        Array.isArray(data) ? data : []
      );
    } catch (error) {
      showError(error);
    } finally {
      setRefreshing(false);
    }
  }

  // ========================================
  // LOGIN / LOGOUT
  // ========================================

  async function handleLogin() {
    if (!loginEmail.trim() || !loginPassword) {
      notify(
        "Vui lòng nhập Email và Mật khẩu.",
        "error"
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
          "Server không trả về JWT token."
        );
      }

      setToken(data.token);
      setLoginPassword("");
      setScreen("list");

      notify(
        "Đăng nhập thành công!",
        "success"
      );
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }

  function handleLogout() {
    setToken(null);
    setProducts([]);
    setForm({ ...emptyForm });
    setEditingId(null);
    setSearch("");
    setFilterType("all");
    setSortBy("default");
    setScreen("list");
    setMessage("");
  }

  // ========================================
  // FORM NAVIGATION
  // ========================================

  function openAdd() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setMessage("");
    setScreen("form");
  }

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

  function goBack() {
    if (busy) return;

    setScreen("list");
    setEditingId(null);
    setMessage("");
  }

  // ========================================
  // CLOUDINARY IMAGE UPLOAD
  // ========================================

  async function pickImage() {
    if (busy || !token) return;

    setBusy(true);
    setMessage("");

    try {
      if (Platform.OS !== "web") {
        const permission =
          await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
          throw new Error(
            "Bạn cần cấp quyền truy cập thư viện ảnh."
          );
        }
      }

      const result =
        await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.85,
        });

      if (
        result.canceled ||
        !result.assets?.length
      ) {
        return;
      }

      const asset = result.assets[0];
      const imageForm = new FormData();

      if (Platform.OS === "web") {
        const imageResponse = await fetch(
          asset.uri
        );

        if (!imageResponse.ok) {
          throw new Error(
            "Không thể đọc ảnh đã chọn."
          );
        }

        const blob = await imageResponse.blob();

        imageForm.append(
          "image",
          blob,
          asset.fileName || "product.jpg"
        );
      } else {
        // Giữ cách upload đang chạy tốt
        // trên Android bằng expo-file-system.
        const file = new File(asset.uri);

        imageForm.append("image", file);
      }

      const data = await productApi.uploadImage(
        imageForm,
        token
      );

      if (!data.image) {
        throw new Error(
          "Cloudinary không trả về URL ảnh."
        );
      }

      setForm((current) => ({
        ...current,
        image: data.image,
      }));

      notify(
        "Tải ảnh lên Cloudinary thành công!",
        "success"
      );
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }

  // ========================================
  // CREATE / UPDATE PRODUCT
  // ========================================

  async function saveProduct() {
    if (busy) return;

    if (!form.name.trim()) {
      notify(
        "Vui lòng nhập tên sản phẩm.",
        "error"
      );
      return;
    }

    if (
      form.price.trim() === "" ||
      form.soluong.trim() === ""
    ) {
      notify(
        "Vui lòng nhập giá và số lượng.",
        "error"
      );
      return;
    }

    const price = Number(form.price);
    const soluong = Number(form.soluong);

    if (
      !Number.isFinite(price) ||
      price < 0
    ) {
      notify(
        "Giá phải là số không âm.",
        "error"
      );
      return;
    }

    if (
      !Number.isSafeInteger(soluong) ||
      soluong < 0
    ) {
      notify(
        "Số lượng phải là số nguyên không âm.",
        "error"
      );
      return;
    }

    // Đúng 4 trường, không thêm trường mới.
    const payload = {
      name: form.name.trim(),
      price,
      soluong,
      image: form.image || "",
    };

    setBusy(true);
    setMessage("");

    const isEditing = Boolean(editingId);

    try {
      if (isEditing) {
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

      const data = await productApi.getProducts(
        token
      );

      setProducts(
        Array.isArray(data) ? data : []
      );

      setScreen("list");
      setEditingId(null);
      setForm({ ...emptyForm });

      notify(
        isEditing
          ? "Cập nhật sản phẩm thành công!"
          : "Thêm sản phẩm thành công!",
        "success"
      );
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }

  // ========================================
  // DELETE PRODUCT
  // ========================================

  async function deleteProduct(id) {
    if (busy) return;

    setBusy(true);
    setMessage("");

    try {
      await productApi.deleteProduct(
        id,
        token
      );

      setProducts((current) =>
        current.filter((p) => p._id !== id)
      );

      notify(
        "Đã xóa sản phẩm thành công!",
        "success"
      );
    } catch (error) {
      showError(error);
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete(product) {
    const question =
      `Bạn có chắc muốn xóa "${product.name}"?`;

    if (Platform.OS === "web") {
      if (window.confirm(question)) {
        deleteProduct(product._id);
      }

      return;
    }

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

  // ========================================
  // DASHBOARD STATISTICS
  // ========================================

  const statistics = useMemo(() => {
    const totalProducts = products.length;

    let totalQuantity = 0;
    let inventoryValue = 0;
    let inStockCount = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    products.forEach((product) => {
      const qty = Number(product.soluong) || 0;
      const price = Number(product.price) || 0;

      totalQuantity += qty;
      inventoryValue += qty * price;

      if (qty === 0) {
        outOfStockCount++;
      } else {
        inStockCount++;

        if (qty <= LOW_STOCK_LIMIT) {
          lowStockCount++;
        }
      }
    });

    return {
      totalProducts,
      totalQuantity,
      inventoryValue,
      inStockCount,
      lowStockCount,
      outOfStockCount,
    };
  }, [products]);

  // ========================================
  // SEARCH / FILTER / SORT
  // ========================================

  const filteredProducts = useMemo(() => {
    const keyword = search
      .trim()
      .toLocaleLowerCase("vi-VN");

    const result = products.filter((product) => {
      const name = String(
        product.name || ""
      ).toLocaleLowerCase("vi-VN");

      if (!name.includes(keyword)) {
        return false;
      }

      const qty = Number(product.soluong) || 0;

      switch (filterType) {
        case "in_stock":
          return qty > 0;

        case "low_stock":
          return (
            qty > 0 &&
            qty <= LOW_STOCK_LIMIT
          );

        case "out_of_stock":
          return qty === 0;

        default:
          return true;
      }
    });

    switch (sortBy) {
      case "price_asc":
        result.sort(
          (a, b) =>
            Number(a.price) -
            Number(b.price)
        );
        break;

      case "price_desc":
        result.sort(
          (a, b) =>
            Number(b.price) -
            Number(a.price)
        );
        break;

      case "qty_asc":
        result.sort(
          (a, b) =>
            Number(a.soluong) -
            Number(b.soluong)
        );
        break;

      case "qty_desc":
        result.sort(
          (a, b) =>
            Number(b.soluong) -
            Number(a.soluong)
        );
        break;

      case "name_asc":
        result.sort((a, b) =>
          a.name.localeCompare(
            b.name,
            "vi"
          )
        );
        break;

      case "name_desc":
        result.sort((a, b) =>
          b.name.localeCompare(
            a.name,
            "vi"
          )
        );
        break;
    }

    return result;
  }, [
    products,
    search,
    filterType,
    sortBy,
  ]);

  // ========================================
  // LOGIN SCREEN
  // ========================================

  if (!token) {
    return (
      <SafeAreaView
        style={styles.screen}
        edges={[
          "top",
          "bottom",
          "left",
          "right",
        ]}
      >
        <StatusBar
          style="dark"
          backgroundColor="#ffffff"
        />

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={
            Platform.OS === "ios"
              ? "padding"
              : undefined
          }
        >
          <ScrollView
            contentContainerStyle={
              styles.loginContainer
            }
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.loginCard}>
              <View style={styles.loginLogo}>
                <Ionicons
                  name="storefront"
                  size={38}
                  color={PRIMARY}
                />
              </View>

              <Text style={styles.loginTitle}>
                Kênh Người Bán
              </Text>

              <Text style={styles.loginSubtitle}>
                Hệ thống quản lý sản phẩm
              </Text>

              {message ? (
                <View
                  style={[
                    styles.messageBox,
                    messageType === "error"
                      ? styles.messageError
                      : styles.messageSuccess,
                  ]}
                >
                  <Text style={styles.messageText}>
                    {message}
                  </Text>
                </View>
              ) : null}

              <AppField
                label="Email đăng nhập"
                value={loginEmail}
                onChangeText={setLoginEmail}
                placeholder="Nhập email Admin"
                icon="mail-outline"
                keyboardType="email-address"
                autoCapitalize="none"
              />

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>
                  Mật khẩu
                </Text>

                <View style={styles.inputWrapper}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={19}
                    color="#94a3b8"
                  />

                  <TextInput
                    style={styles.fieldInput}
                    value={loginPassword}
                    onChangeText={setLoginPassword}
                    placeholder="Nhập mật khẩu"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showPassword}
                  />

                  <TouchableOpacity
                    onPress={() =>
                      setShowPassword(!showPassword)
                    }
                  >
                    <Ionicons
                      name={
                        showPassword
                          ? "eye-off-outline"
                          : "eye-outline"
                      }
                      size={20}
                      color="#64748b"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <AppButton
                title={
                  busy
                    ? "Đang đăng nhập..."
                    : "Đăng nhập Gian hàng"
                }
                icon="log-in-outline"
                onPress={handleLogin}
                disabled={busy}
                style={styles.loginButton}
              />

              <View style={styles.loginSecurity}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={16}
                  color="#94a3b8"
                />

                <Text style={styles.loginSecurityText}>
                  Hệ thống quản lý dành cho Admin
                </Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ========================================
  // MAIN SCREEN
  // ========================================

  return (
    <View style={styles.screen}>
      <StatusBar
        style="light"
        backgroundColor={PRIMARY}
      />

      {/* HEADER */}
      <SafeAreaView
        style={styles.headerSafe}
        edges={["top", "left", "right"]}
      >
        <View style={styles.header}>
          <View style={styles.headerBrand}>
            <View style={styles.headerLogo}>
              <Ionicons
                name="storefront"
                size={22}
                color={PRIMARY}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text
                style={styles.headerTitle}
                numberOfLines={1}
              >
                Quản Lý Gian Hàng
              </Text>

              <Text style={styles.headerSubtitle}>
                {statistics.totalProducts} sản phẩm
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Ionicons
              name="log-out-outline"
              size={18}
              color="#ffffff"
            />

            <Text style={styles.logoutText}>
              Đăng xuất
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <SafeAreaView
        style={styles.body}
        edges={["bottom", "left", "right"]}
      >
        {/* THÔNG BÁO */}
        {message ? (
          <View
            style={[
              styles.messageBox,
              styles.floatingMessage,
              messageType === "error"
                ? styles.messageError
                : styles.messageSuccess,
            ]}
          >
            <Text
              style={[
                styles.messageText,
                { flex: 1 },
              ]}
            >
              {message}
            </Text>

            <TouchableOpacity
              onPress={() => setMessage("")}
            >
              <Ionicons
                name="close"
                size={18}
                color="#64748b"
              />
            </TouchableOpacity>
          </View>
        ) : null}

        {busy ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator
              size="small"
              color={PRIMARY}
            />

            <Text style={styles.loadingText}>
              Đang xử lý dữ liệu...
            </Text>
          </View>
        ) : null}

        {screen === "list" ? (
          <View style={styles.content}>
            <FlatList
              data={filteredProducts}
              keyExtractor={(item) => item._id}
              refreshing={refreshing}
              onRefresh={handleRefresh}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={
                styles.productList
              }
              ListHeaderComponent={
                <View>
                  {/* DASHBOARD */}
                  <View style={styles.sectionHeading}>
                    <Text style={styles.sectionTitle}>
                      Tổng quan gian hàng
                    </Text>

                    <TouchableOpacity
                      onPress={handleRefresh}
                      disabled={busy || refreshing}
                      style={styles.refreshLink}
                    >
                      <Ionicons
                        name="refresh-outline"
                        size={17}
                        color={PRIMARY}
                      />

                      <Text style={styles.refreshText}>
                        Làm mới
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.dashboardGrid}>
                    <StatCard
                      title="Tổng sản phẩm"
                      value={statistics.totalProducts}
                      icon="cube-outline"
                      onPress={() =>
                        setFilterType("all")
                      }
                      active={filterType === "all"}
                    />

                    <StatCard
                      title="Tổng số lượng kho"
                      value={statistics.totalQuantity}
                      icon="layers-outline"
                      color="#2563eb"
                      background="#eff6ff"
                    />

                    <StatCard
                      title="Giá trị tồn kho"
                      value={formatPrice(
                        statistics.inventoryValue
                      )}
                      icon="wallet-outline"
                      color="#16a34a"
                      background="#f0fdf4"
                    />

                    <StatCard
                      title="Sản phẩm sắp hết"
                      value={statistics.lowStockCount}
                      icon="warning-outline"
                      color="#d97706"
                      background="#fffbeb"
                      onPress={() =>
                        setFilterType("low_stock")
                      }
                      active={
                        filterType === "low_stock"
                      }
                    />

                    <StatCard
                      title="Còn hàng"
                      value={statistics.inStockCount}
                      icon="checkmark-circle-outline"
                      color="#16a34a"
                      background="#f0fdf4"
                      onPress={() =>
                        setFilterType("in_stock")
                      }
                      active={
                        filterType === "in_stock"
                      }
                    />

                    <StatCard
                      title="Hết hàng"
                      value={statistics.outOfStockCount}
                      icon="close-circle-outline"
                      color="#dc2626"
                      background="#fef2f2"
                      onPress={() =>
                        setFilterType("out_of_stock")
                      }
                      active={
                        filterType === "out_of_stock"
                      }
                    />
                  </View>

                  {/* CẢNH BÁO TỒN KHO */}
                  {statistics.lowStockCount > 0 ||
                  statistics.outOfStockCount > 0 ? (
                    <TouchableOpacity
                      style={styles.warningBanner}
                      onPress={() =>
                        setFilterType(
                          statistics.lowStockCount > 0
                            ? "low_stock"
                            : "out_of_stock"
                        )
                      }
                    >
                      <Ionicons
                        name="warning-outline"
                        size={22}
                        color="#b45309"
                      />

                      <View style={{ flex: 1 }}>
                        <Text style={styles.warningTitle}>
                          Cảnh báo tồn kho
                        </Text>

                        <Text style={styles.warningText}>
                          {
                            statistics.lowStockCount
                          }{" "}
                          sản phẩm sắp hết,{" "}
                          {
                            statistics.outOfStockCount
                          }{" "}
                          sản phẩm hết hàng.
                        </Text>
                      </View>

                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color="#b45309"
                      />
                    </TouchableOpacity>
                  ) : null}

                  {/* TOOLBAR */}
                  <View style={styles.toolbar}>
                    <View style={styles.searchBox}>
                      <Ionicons
                        name="search-outline"
                        size={19}
                        color="#94a3b8"
                      />

                      <TextInput
                        style={styles.searchInput}
                        placeholder="Tìm theo tên sản phẩm..."
                        placeholderTextColor="#94a3b8"
                        value={search}
                        onChangeText={setSearch}
                      />

                      {search.length > 0 ? (
                        <TouchableOpacity
                          onPress={() => setSearch("")}
                        >
                          <Ionicons
                            name="close-circle"
                            size={19}
                            color="#94a3b8"
                          />
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    <View style={styles.toolbarButtons}>
                      <AppButton
                        title="Thêm sản phẩm"
                        icon="add-circle-outline"
                        onPress={openAdd}
                        disabled={busy}
                        style={{ flex: 1 }}
                      />

                      <AppButton
                        title="Làm mới"
                        icon="refresh-outline"
                        variant="outline"
                        onPress={handleRefresh}
                        disabled={busy || refreshing}
                      />
                    </View>
                  </View>

                  {/* BỘ LỌC */}
                  <Text style={styles.controlLabel}>
                    Lọc theo tình trạng
                  </Text>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={
                      styles.filterContent
                    }
                  >
                    {FILTERS.map((filter) => (
                      <TouchableOpacity
                        key={filter.key}
                        onPress={() =>
                          setFilterType(filter.key)
                        }
                        style={[
                          styles.filterChip,
                          filterType === filter.key &&
                            styles.filterChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            filterType === filter.key &&
                              styles.filterChipTextActive,
                          ]}
                        >
                          {filter.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* SẮP XẾP */}
                  <Text style={styles.controlLabel}>
                    Sắp xếp sản phẩm
                  </Text>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={
                      styles.filterContent
                    }
                  >
                    {SORT_OPTIONS.map((option) => (
                      <TouchableOpacity
                        key={option.key}
                        onPress={() =>
                          setSortBy(option.key)
                        }
                        style={[
                          styles.filterChip,
                          sortBy === option.key &&
                            styles.filterChipActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            sortBy === option.key &&
                              styles.filterChipTextActive,
                          ]}
                        >
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* TIÊU ĐỀ DANH SÁCH */}
                  <View style={styles.listHeading}>
                    <Text style={styles.sectionTitle}>
                      Danh sách sản phẩm
                    </Text>

                    <Text style={styles.resultCount}>
                      {filteredProducts.length} kết quả
                    </Text>
                  </View>
                </View>
              }
              renderItem={({ item }) => (
                <ProductCard
                  product={item}
                  onEdit={openEdit}
                  onDelete={confirmDelete}
                  disabled={busy}
                />
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons
                    name="bag-outline"
                    size={48}
                    color="#cbd5e1"
                  />

                  <Text style={styles.emptyTitle}>
                    Không tìm thấy sản phẩm
                  </Text>

                  <Text style={styles.emptyDescription}>
                    Hãy thay đổi bộ lọc hoặc thêm
                    sản phẩm mới.
                  </Text>

                  <AppButton
                    title="Thêm sản phẩm"
                    icon="add-outline"
                    onPress={openAdd}
                    disabled={busy}
                    style={{ marginTop: 16 }}
                  />
                </View>
              }
            />
          </View>
        ) : (
          // ====================================
          // ADD / EDIT PRODUCT FORM
          // ====================================
          <ScrollView
            contentContainerStyle={
              styles.formContainer
            }
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity
              style={styles.backButton}
              onPress={goBack}
              disabled={busy}
            >
              <Ionicons
                name="arrow-back"
                size={20}
                color="#334155"
              />

              <Text style={styles.backText}>
                Quay lại danh sách
              </Text>
            </TouchableOpacity>

            <Text style={styles.formTitle}>
              {editingId
                ? "Cập nhật sản phẩm"
                : "Thêm sản phẩm mới"}
            </Text>

            <View style={styles.formCard}>
              <Text style={styles.formSectionTitle}>
                Hình ảnh sản phẩm
              </Text>

              <Text style={styles.formHint}>
                Hỗ trợ JPG, PNG, WEBP. Tối đa 5MB.
              </Text>

              <View style={styles.imageSection}>
                {form.image ? (
                  <View style={styles.previewWrap}>
                    <Image
                      source={{ uri: form.image }}
                      style={styles.imagePreview}
                      resizeMode="cover"
                    />

                    <TouchableOpacity
                      style={styles.removeImage}
                      onPress={() =>
                        setForm((current) => ({
                          ...current,
                          image: "",
                        }))
                      }
                      disabled={busy}
                    >
                      <Ionicons
                        name="close"
                        size={19}
                        color="#ffffff"
                      />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.uploadArea}
                    onPress={pickImage}
                    disabled={busy}
                  >
                    <Ionicons
                      name="cloud-upload-outline"
                      size={36}
                      color={PRIMARY}
                    />

                    <Text style={styles.uploadTitle}>
                      Chọn ảnh từ thiết bị
                    </Text>

                    <Text style={styles.uploadHint}>
                      Upload lên Cloudinary
                    </Text>
                  </TouchableOpacity>
                )}

                {form.image ? (
                  <AppButton
                    title="Thay đổi ảnh"
                    icon="camera-outline"
                    variant="outline"
                    onPress={pickImage}
                    disabled={busy}
                    style={{ marginTop: 12 }}
                  />
                ) : null}
              </View>

              <View style={styles.divider} />

              <Text style={styles.formSectionTitle}>
                Thông tin sản phẩm
              </Text>

              <AppField
                label="Tên sản phẩm (name) *"
                value={form.name}
                onChangeText={(value) =>
                  setForm((current) => ({
                    ...current,
                    name: value,
                  }))
                }
                placeholder="Nhập tên sản phẩm"
                icon="pricetag-outline"
              />

              <AppField
                label="Giá sản phẩm (price) *"
                value={form.price}
                onChangeText={(value) =>
                  setForm((current) => ({
                    ...current,
                    price: value,
                  }))
                }
                placeholder="Ví dụ: 15000000"
                icon="cash-outline"
                keyboardType="decimal-pad"
                helperText={
                  form.price.trim() !== "" &&
                  Number.isFinite(Number(form.price))
                    ? formatPrice(form.price)
                    : "Đơn vị: VNĐ"
                }
              />

              <AppField
                label="Số lượng (soluong) *"
                value={form.soluong}
                onChangeText={(value) =>
                  setForm((current) => ({
                    ...current,
                    soluong: value,
                  }))
                }
                placeholder="Ví dụ: 10"
                icon="layers-outline"
                keyboardType="number-pad"
              />

              {/* CẢNH BÁO NGAY TRONG FORM */}
              {form.soluong.trim() !== "" &&
              Number.isSafeInteger(
                Number(form.soluong)
              ) &&
              Number(form.soluong) >= 0 &&
              Number(form.soluong) <=
                LOW_STOCK_LIMIT ? (
                <View style={styles.formWarning}>
                  <Ionicons
                    name="warning-outline"
                    size={20}
                    color="#b45309"
                  />

                  <Text style={styles.formWarningText}>
                    {Number(form.soluong) === 0
                      ? "Sản phẩm sẽ được đánh dấu HẾT HÀNG."
                      : "Sản phẩm sẽ được đánh dấu SẮP HẾT HÀNG."}
                  </Text>
                </View>
              ) : null}

              <View style={styles.formActions}>
                <AppButton
                  title={
                    busy
                      ? "Đang lưu..."
                      : editingId
                      ? "Cập nhật sản phẩm"
                      : "Lưu sản phẩm"
                  }
                  icon="checkmark-circle-outline"
                  onPress={saveProduct}
                  disabled={busy}
                  style={{ flex: 1 }}
                />

                <AppButton
                  title="Hủy"
                  variant="outline"
                  onPress={goBack}
                  disabled={busy}
                />
              </View>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

// ========================================
// ROOT COMPONENT
// ========================================

export default function App() {
  return (
    <SafeAreaProvider>
      <ProductManagementApp />
    </SafeAreaProvider>
  );
}

// ========================================
// STYLES
// ========================================

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f5f5f8",
  },

  headerSafe: {
    backgroundColor: PRIMARY,
  },

  header: {
    backgroundColor: PRIMARY,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },

  headerBrand: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  headerLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#ffffff",
  },

  headerSubtitle: {
    fontSize: 12,
    color: "#ffede8",
    marginTop: 2,
  },

  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
  },

  logoutText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },

  body: {
    flex: 1,
    backgroundColor: "#f5f5f8",
  },

  content: {
    flex: 1,
    width: "100%",
    maxWidth: 1050,
    alignSelf: "center",
  },

  productList: {
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 10,
  },

  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1e293b",
  },

  refreshLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  refreshText: {
    fontSize: 13,
    fontWeight: "600",
    color: PRIMARY,
  },

  // Dashboard

  dashboardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 14,
  },

  statCard: {
    flexGrow: 1,
    flexBasis: "30%",
    minWidth: 105,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    gap: 6,
    elevation: 1,
  },

  statCardActive: {
    borderColor: PRIMARY,
    backgroundColor: "#fffaf8",
  },

  statIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },

  statValue: {
    fontSize: 19,
    fontWeight: "800",
    color: "#1e293b",
  },

  statTitle: {
    fontSize: 12,
    color: "#64748b",
    fontWeight: "500",
  },

  // Stock warning

  warningBanner: {
    backgroundColor: "#fffbeb",
    borderColor: "#fde68a",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },

  warningTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#92400e",
  },

  warningText: {
    fontSize: 12,
    color: "#b45309",
    marginTop: 3,
    lineHeight: 18,
  },

  // Toolbar

  toolbar: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    gap: 10,
    marginBottom: 14,
    elevation: 1,
  },

  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f1f5f9",
    borderRadius: 9,
    paddingHorizontal: 12,
    minHeight: 44,
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#1e293b",
    paddingVertical: 9,
  },

  toolbarButtons: {
    flexDirection: "row",
    gap: 8,
  },

  // Filter / Sort

  controlLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 8,
  },

  filterContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 14,
  },

  filterChip: {
    backgroundColor: "#ffffff",
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  filterChipActive: {
    backgroundColor: "#fff1f0",
    borderColor: PRIMARY,
  },

  filterChipText: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "600",
  },

  filterChipTextActive: {
    color: PRIMARY,
    fontWeight: "800",
  },

  listHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: 12,
  },

  resultCount: {
    color: "#64748b",
    fontSize: 12,
  },

  // Product card

  productCard: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "#f1f5f9",
    elevation: 1,
  },

  productImageWrap: {
    width: 105,
    height: 105,
    position: "relative",
  },

  productImage: {
    width: 105,
    height: 105,
    borderRadius: 9,
    backgroundColor: "#f1f5f9",
  },

  productPlaceholder: {
    width: 105,
    height: 105,
    borderRadius: 9,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },

  placeholderText: {
    fontSize: 10,
    color: "#94a3b8",
    marginTop: 5,
  },

  imageBadge: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderBottomLeftRadius: 9,
    borderBottomRightRadius: 9,
    paddingVertical: 4,
    alignItems: "center",
  },

  imageBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#ffffff",
  },

  productInfo: {
    flex: 1,
    gap: 7,
    justifyContent: "space-between",
  },

  productName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1e293b",
  },

  productPrice: {
    fontSize: 18,
    fontWeight: "800",
    color: PRIMARY,
  },

  stockBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },

  stockBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },

  productActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 3,
  },

  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#eff6ff",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 7,
  },

  editText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563eb",
  },

  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#fef2f2",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 7,
  },

  deleteText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#dc2626",
  },

  // Buttons

  button: {
    minHeight: 43,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 9,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  buttonText: {
    fontSize: 13,
    fontWeight: "700",
  },

  // Messages

  messageBox: {
    borderWidth: 1,
    borderRadius: 9,
    padding: 12,
  },

  floatingMessage: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 12,
    marginTop: 8,
  },

  messageError: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
  },

  messageSuccess: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
  },

  messageText: {
    color: "#334155",
    fontSize: 13,
  },

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff7ed",
    padding: 8,
  },

  loadingText: {
    fontSize: 12,
    color: "#c2410c",
  },

  // Empty state

  emptyState: {
    alignItems: "center",
    paddingVertical: 55,
    gap: 8,
  },

  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#475569",
  },

  emptyDescription: {
    fontSize: 13,
    color: "#94a3b8",
    textAlign: "center",
  },

  // Login

  loginContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  loginCard: {
    backgroundColor: "#ffffff",
    width: "100%",
    maxWidth: 440,
    padding: 26,
    borderRadius: 16,
    elevation: 3,
  },

  loginLogo: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: "#fff1f0",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 14,
  },

  loginTitle: {
    fontSize: 25,
    fontWeight: "800",
    color: "#1e293b",
    textAlign: "center",
  },

  loginSubtitle: {
    fontSize: 13,
    color: "#64748b",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 26,
  },

  loginButton: {
    marginTop: 12,
  },

  loginSecurity: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 20,
  },

  loginSecurityText: {
    color: "#94a3b8",
    fontSize: 11,
  },

  // Form

  formContainer: {
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    padding: 16,
    paddingBottom: 50,
  },

  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },

  backText: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "600",
  },

  formTitle: {
    fontSize: 23,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 16,
  },

  formCard: {
    backgroundColor: "#ffffff",
    padding: 20,
    borderRadius: 14,
    elevation: 2,
  },

  formSectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1e293b",
    marginBottom: 6,
  },

  formHint: {
    color: "#64748b",
    fontSize: 12,
  },

  imageSection: {
    alignItems: "center",
    marginVertical: 18,
  },

  uploadArea: {
    width: "100%",
    minHeight: 170,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "#fdba74",
    backgroundColor: "#fffaf8",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    padding: 16,
  },

  uploadTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: PRIMARY,
  },

  uploadHint: {
    fontSize: 12,
    color: "#94a3b8",
  },

  previewWrap: {
    position: "relative",
  },

  imagePreview: {
    width: 180,
    height: 180,
    borderRadius: 12,
  },

  removeImage: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#dc2626",
    alignItems: "center",
    justifyContent: "center",
  },

  divider: {
    height: 1,
    backgroundColor: "#e2e8f0",
    marginVertical: 22,
  },

  fieldGroup: {
    marginTop: 16,
  },

  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 8,
  },

  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 9,
    paddingHorizontal: 12,
    minHeight: 48,
    gap: 9,
    backgroundColor: "#ffffff",
  },

  fieldInput: {
    flex: 1,
    minHeight: 46,
    fontSize: 14,
    color: "#1e293b",
    paddingVertical: 8,
  },

  helperText: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 6,
  },

  formWarning: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fffbeb",
    borderColor: "#fde68a",
    borderWidth: 1,
    borderRadius: 9,
    padding: 12,
    gap: 9,
    marginTop: 18,
  },

  formWarningText: {
    flex: 1,
    color: "#92400e",
    fontSize: 12,
    fontWeight: "600",
  },

  formActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 28,
  },
});
