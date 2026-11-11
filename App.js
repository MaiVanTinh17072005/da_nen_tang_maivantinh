
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
  useWindowDimensions,
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
// CẤU HÌNH & TỐI ƯU GIAO DIỆN
// ========================================

// Xử lý loại bỏ khung viền đen mặc định của trình duyệt trên Web khi focus vào ô input
if (Platform.OS === "web" && typeof document !== "undefined") {
  const styleId = "rnw-focus-outline-fix";
  if (!document.getElementById(styleId)) {
    const styleEl = document.createElement("style");
    styleEl.id = styleId;
    styleEl.textContent = `
      input:focus, textarea:focus, [contenteditable]:focus {
        outline: none !important;
      }
    `;
    document.head.appendChild(styleEl);
  }
}

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
  isPassword = false,
  rightIcon,
  onRightPress,
  secureTextEntry,
  onFocus,
  onBlur,
  ...props
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const effectiveSecure = isPassword ? !showPassword : secureTextEntry;

  return (
    <View style={styles.fieldGroup}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}

      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputWrapperFocused,
        ]}
      >
        {icon ? (
          <Ionicons
            name={icon}
            size={19}
            color={isFocused ? PRIMARY : "#94a3b8"}
          />
        ) : null}

        <TextInput
          style={styles.fieldInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          secureTextEntry={effectiveSecure}
          onFocus={(e) => {
            setIsFocused(true);
            if (onFocus) onFocus(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            if (onBlur) onBlur(e);
          }}
          {...props}
        />

        {isPassword ? (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.inputAction}
          >
            <Ionicons
              name={showPassword ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={isFocused ? "#475569" : "#64748b"}
            />
          </TouchableOpacity>
        ) : rightIcon ? (
          <TouchableOpacity
            onPress={onRightPress}
            disabled={!onRightPress}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.inputAction}
          >
            <Ionicons
              name={rightIcon}
              size={20}
              color="#64748b"
            />
          </TouchableOpacity>
        ) : null}
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
  subtitle,
  icon,
  color = PRIMARY,
  background = "#fff1f0",
  onPress,
  active = false,
  isMobile = false,
  style,
}) {
  const CardWrapper = onPress ? TouchableOpacity : View;

  return (
    <CardWrapper
      disabled={!onPress}
      onPress={onPress}
      activeOpacity={0.8}
      style={[
        styles.statCard,
        isMobile && styles.statCardMobile,
        active && styles.statCardActive,
        style,
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
          size={18}
          color={color}
        />
      </View>

      <View style={[styles.statContent, isMobile && styles.statContentMobile]}>
        <Text
          style={[styles.statValue, isMobile && styles.statValueMobile]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {value}
        </Text>

        <Text
          style={[styles.statTitle, isMobile && styles.statTitleMobile]}
          numberOfLines={isMobile ? 2 : 1}
        >
          {title}
        </Text>

        {subtitle ? (
          <Text
            style={styles.statSubtitle}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
    </CardWrapper>
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
  const { width } = useWindowDimensions();
  const isMobile = width < 768;
  const [showOverview, setShowOverview] = useState(true);

  // Đăng nhập
  const [token, setToken] = useState(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Sản phẩm
  const [products, setProducts] = useState([]);
  const [screen, setScreen] = useState("list");
  const [form, setForm] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState(null);

  // Tìm kiếm, lọc, sắp xếp
  const [search, setSearch] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [filterType, setFilterType] = useState("all");
  const [sortBy, setSortBy] = useState("default");
  const [showFilterModal, setShowFilterModal] = useState(false);

  // Kiểm tra xem có filter nào đang active không
  const isFilterActive = useMemo(() => {
    return filterType !== "all" || sortBy !== "default";
  }, [filterType, sortBy]);

  // Trạng thái
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");
  const [messageKey, setMessageKey] = useState(0);

  function notify(text, type = "info") {
    setMessage(text);
    setMessageType(type);
    setMessageKey((prev) => prev + 1);
  }

  // Tự động tắt thông báo sau 2 giây
  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => {
      setMessage("");
    }, 2000);

    return () => clearTimeout(timer);
  }, [message, messageKey]);

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
                    styles.loginMessageBox,
                    messageType === "error"
                      ? styles.messageError
                      : styles.messageSuccess,
                  ]}
                >
                  <Ionicons
                    name={
                      messageType === "error"
                        ? "alert-circle"
                        : "checkmark-circle"
                    }
                    size={18}
                    color={
                      messageType === "error" ? "#dc2626" : "#16a34a"
                    }
                  />

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
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons
                      name="close"
                      size={18}
                      color="#64748b"
                    />
                  </TouchableOpacity>
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

              <AppField
                label="Mật khẩu"
                value={loginPassword}
                onChangeText={setLoginPassword}
                placeholder="Nhập mật khẩu"
                icon="lock-closed-outline"
                isPassword
              />

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
                size={20}
                color={PRIMARY}
              />
            </View>

            <View style={styles.headerBrandInfo}>
              <Text
                style={styles.headerTitle}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.8}
              >
                Quản Lý Gian Hàng
              </Text>

              <Text
                style={styles.headerSubtitle}
                numberOfLines={1}
              >
                {statistics.totalProducts} sản phẩm
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="log-out-outline"
              size={17}
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
            <Ionicons
              name={
                messageType === "error"
                  ? "alert-circle"
                  : "checkmark-circle"
              }
              size={18}
              color={
                messageType === "error" ? "#dc2626" : "#16a34a"
              }
            />

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
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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

        {/* MODAL LỌC */}
        {showFilterModal && (
          <View style={styles.filterModal}>
            <View style={styles.filterModalContent}>
              <View style={styles.filterModalHeader}>
                <Text style={styles.filterModalTitle}>
                  Tùy chọn tìm kiếm
                </Text>
                <TouchableOpacity
                  onPress={() => setShowFilterModal(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>

              {/* Trạng thái kho */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>Trạng thái kho</Text>
                <View style={styles.filterOptions}>
                  {FILTERS.map((filter) => (
                    <TouchableOpacity
                      key={filter.key}
                      onPress={() => setFilterType(filter.key)}
                      style={[
                        styles.filterOption,
                        filterType === filter.key && styles.filterOptionActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.filterOptionText,
                          filterType === filter.key && styles.filterOptionTextActive,
                        ]}
                      >
                        {filter.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Sắp xếp theo giá */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>Sắp xếp theo giá</Text>
                <View style={styles.filterOptions}>
                  <TouchableOpacity
                    onPress={() => setSortBy("price_asc")}
                    style={[
                      styles.filterOption,
                      sortBy === "price_asc" && styles.filterOptionActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        sortBy === "price_asc" && styles.filterOptionTextActive,
                      ]}
                    >
                      Giá tăng dần
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setSortBy("price_desc")}
                    style={[
                      styles.filterOption,
                      sortBy === "price_desc" && styles.filterOptionActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        sortBy === "price_desc" && styles.filterOptionTextActive,
                      ]}
                    >
                      Giá giảm dần
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Sắp xếp theo số lượng kho */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>Sắp xếp theo kho</Text>
                <View style={styles.filterOptions}>
                  <TouchableOpacity
                    onPress={() => setSortBy("qty_asc")}
                    style={[
                      styles.filterOption,
                      sortBy === "qty_asc" && styles.filterOptionActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        sortBy === "qty_asc" && styles.filterOptionTextActive,
                      ]}
                    >
                      Kho tăng dần
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setSortBy("qty_desc")}
                    style={[
                      styles.filterOption,
                      sortBy === "qty_desc" && styles.filterOptionActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        sortBy === "qty_desc" && styles.filterOptionTextActive,
                      ]}
                    >
                      Kho giảm dần
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Sắp xếp theo tên */}
              <View style={styles.filterGroup}>
                <Text style={styles.filterGroupTitle}>Sắp xếp theo tên</Text>
                <View style={styles.filterOptions}>
                  <TouchableOpacity
                    onPress={() => setSortBy("name_asc")}
                    style={[
                      styles.filterOption,
                      sortBy === "name_asc" && styles.filterOptionActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        sortBy === "name_asc" && styles.filterOptionTextActive,
                      ]}
                    >
                      Tên A - Z
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setSortBy("name_desc")}
                    style={[
                      styles.filterOption,
                      sortBy === "name_desc" && styles.filterOptionActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterOptionText,
                        sortBy === "name_desc" && styles.filterOptionTextActive,
                      ]}
                    >
                      Tên Z - A
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Nút hành động */}
              <View style={styles.filterModalActions}>
                <AppButton
                  title="Thiết lập lại"
                  variant="outline"
                  onPress={() => {
                    setFilterType("all");
                    setSortBy("default");
                  }}
                  style={{ flex: 1 }}
                />
                <AppButton
                  title="Áp dụng"
                  onPress={() => setShowFilterModal(false)}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </View>
        )}

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
                      onPress={() => setShowOverview(!showOverview)}
                      style={styles.toggleOverviewButton}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons
                        name={showOverview ? "chevron-up" : "chevron-down"}
                        size={15}
                        color="#475569"
                      />
                      <Text style={styles.toggleOverviewText}>
                        {showOverview ? "Thu gọn" : "Mở rộng"}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {showOverview ? (
                    <View style={styles.dashboardGrid}>
                      <StatCard
                        title="Tổng sản phẩm"
                        value={statistics.totalProducts}
                        icon="cube-outline"
                        isMobile={isMobile}
                      />

                      <StatCard
                        title="Tổng tồn kho"
                        value={statistics.totalQuantity}
                        icon="layers-outline"
                        color="#2563eb"
                        background="#eff6ff"
                        isMobile={isMobile}
                      />

                      <StatCard
                        title="Tổng tiền tồn kho"
                        value={formatPrice(statistics.inventoryValue)}
                        icon="cash-outline"
                        color="#16a34a"
                        background="#f0fdf4"
                        isMobile={isMobile}
                      />
                    </View>
                  ) : null}

                  {/* TOOLBAR */}
                  <View style={styles.toolbar}>
                    <View
                      style={[
                        styles.searchBox,
                        isSearchFocused && styles.searchBoxFocused,
                      ]}
                    >
                      <Ionicons
                        name="search-outline"
                        size={19}
                        color={isSearchFocused ? PRIMARY : "#94a3b8"}
                      />

                      <TextInput
                        style={styles.searchInput}
                        placeholder="Tìm theo tên sản phẩm..."
                        placeholderTextColor="#94a3b8"
                        value={search}
                        onChangeText={setSearch}
                        onFocus={() => setIsSearchFocused(true)}
                        onBlur={() => setIsSearchFocused(false)}
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

                  {/* TIÊU ĐỀ DANH SÁCH + NÚT LỌC */}
                  <View style={styles.listHeading}>
                    <Text style={styles.sectionTitle}>
                      Danh sách sản phẩm
                    </Text>

                    <TouchableOpacity
                      onPress={() => setShowFilterModal(true)}
                      style={[
                        styles.filterTrigger,
                        isFilterActive && styles.filterTriggerActive,
                      ]}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="options-outline"
                        size={16}
                        color={isFilterActive ? PRIMARY : "#64748b"}
                      />
                      <Text
                        style={[
                          styles.filterTriggerText,
                          isFilterActive && styles.filterTriggerTextActive,
                        ]}
                      >
                        Lọc
                      </Text>
                      {isFilterActive ? (
                        <View style={styles.filterTriggerDot} />
                      ) : null}
                    </TouchableOpacity>
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
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },

  headerBrand: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 0,
  },

  headerBrandInfo: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },

  headerLogo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },

  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
  },

  headerSubtitle: {
    fontSize: 11,
    color: "#ffede8",
    marginTop: 1,
  },

  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    flexShrink: 0,
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
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1e293b",
  },

  toggleOverviewButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: "#f1f5f9",
  },

  toggleOverviewText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },

  // Dashboard

  dashboardGrid: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 8,
    marginBottom: 14,
  },

  statCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 9,
    elevation: 1,
  },

  statCardMobile: {
    flex: 1,
    minWidth: 0,
    flexDirection: "column",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    gap: 6,
  },

  statIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },

  statContent: {
    flex: 1,
    justifyContent: "center",
  },

  statContentMobile: {
    flex: 0,
    alignItems: "center",
    width: "100%",
  },

  statValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1e293b",
    lineHeight: 20,
  },

  statValueMobile: {
    fontSize: 18,
    textAlign: "center",
  },

  statTitle: {
    fontSize: 11,
    color: "#64748b",
    fontWeight: "600",
    marginTop: 1,
  },

  statTitleMobile: {
    fontSize: 11,
    textAlign: "center",
    marginTop: 0,
  },

  statSubtitle: {
    fontSize: 10,
    color: "#64748b",
    fontWeight: "500",
    marginTop: 2,
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
    backgroundColor: "#f8fafc",
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 9,
    paddingHorizontal: 12,
    minHeight: 44,
  },

  searchBoxFocused: {
    borderColor: PRIMARY,
    backgroundColor: "#ffffff",
    ...Platform.select({
      web: {
        boxShadow: "0 0 0 3px rgba(238, 77, 45, 0.15)",
      },
    }),
  },

  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#1e293b",
    paddingVertical: 9,
    ...Platform.select({
      web: {
        outlineStyle: "none",
      },
    }),
  },

  toolbarButtons: {
    flexDirection: "row",
    gap: 8,
  },

  // Filter Modal (Shopee-style)

  filterModal: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    marginHorizontal: 12,
    marginBottom: 14,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },

  filterModalContent: {
    padding: 16,
  },

  filterModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },

  filterModalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1e293b",
  },

  filterGroup: {
    marginBottom: 18,
  },

  filterGroupTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 10,
  },

  filterOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  filterOption: {
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },

  filterOptionActive: {
    backgroundColor: "#fff1f0",
    borderColor: PRIMARY,
  },

  filterOptionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },

  filterOptionTextActive: {
    color: PRIMARY,
    fontWeight: "700",
  },

  filterModalActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
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

  // Filter Trigger Button (next to "Danh sách sản phẩm")

  filterTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
  },

  filterTriggerActive: {
    borderColor: PRIMARY,
    backgroundColor: "#fff1f0",
  },

  filterTriggerText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },

  filterTriggerTextActive: {
    color: PRIMARY,
    fontWeight: "700",
  },

  filterTriggerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: PRIMARY,
    marginLeft: 2,
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

  loginMessageBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
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
    borderWidth: 1.5,
    borderColor: "#cbd5e1",
    borderRadius: 9,
    paddingHorizontal: 12,
    minHeight: 48,
    gap: 9,
    backgroundColor: "#ffffff",
  },

  inputWrapperFocused: {
    borderColor: PRIMARY,
    backgroundColor: "#ffffff",
    ...Platform.select({
      web: {
        boxShadow: "0 0 0 3px rgba(238, 77, 45, 0.15)",
      },
    }),
  },

  fieldInput: {
    flex: 1,
    minHeight: 46,
    fontSize: 14,
    color: "#1e293b",
    paddingVertical: 8,
    ...Platform.select({
      web: {
        outlineStyle: "none",
      },
    }),
  },

  inputAction: {
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
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
