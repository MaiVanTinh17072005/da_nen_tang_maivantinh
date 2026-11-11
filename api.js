
import { Platform } from "react-native";
import { fetch as expoFetch } from "expo/fetch";
import { API_URL } from "./config";

async function request(path, options = {}, token = null) {
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(!isFormData
      ? { "Content-Type": "application/json" }
      : {}),
    ...(token
      ? { Authorization: `Bearer ${token}` }
      : {}),
    ...(options.headers || {}),
  };

  // Giữ nguyên cách upload đã hoạt động trên Android.
  const fetchFunction =
    isFormData && Platform.OS !== "web"
      ? expoFetch
      : fetch;

  let response;

  try {
    response = await fetchFunction(
      `${API_URL}${path}`,
      {
        ...options,
        headers,
      }
    );
  } catch (error) {
    throw new Error(
      "Không thể kết nối đến server. " +
      "Hãy kiểm tra backend, địa chỉ IP và Wi-Fi. " +
      `Chi tiết: ${error.message}`
    );
  }

  const responseText = await response.text();

  let data;

  try {
    data = responseText
      ? JSON.parse(responseText)
      : {};
  } catch {
    throw new Error(
      `Server trả về dữ liệu không hợp lệ (HTTP ${response.status})`
    );
  }

  if (!response.ok) {
    throw new Error(
      data.message ||
      `Yêu cầu thất bại (HTTP ${response.status})`
    );
  }

  return data;
}

export const productApi = {
  // Đăng nhập Admin: giữ nguyên API cũ.
  login: (email, matkhau) =>
    request("/api/users/login", {
      method: "POST",
      body: JSON.stringify({
        email,
        matkhau,
      }),
    }),

  // Lấy danh sách sản phẩm.
  getProducts: (token) =>
    request("/api/products", {}, token),

  // Thêm sản phẩm.
  createProduct: (product, token) =>
    request(
      "/api/products",
      {
        method: "POST",
        body: JSON.stringify(product),
      },
      token
    ),

  // Sửa sản phẩm.
  updateProduct: (id, product, token) =>
    request(
      `/api/products/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(product),
      },
      token
    ),

  // Xóa sản phẩm.
  deleteProduct: (id, token) =>
    request(
      `/api/products/${id}`,
      {
        method: "DELETE",
      },
      token
    ),

  // Upload ảnh sản phẩm lên Cloudinary.
  uploadImage: (formData, token) =>
    request(
      "/api/upload",
      {
        method: "POST",
        body: formData,
      },
      token
    ),
};
