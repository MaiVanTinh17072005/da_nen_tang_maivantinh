
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

  // Expo fetch hỗ trợ File từ expo-file-system
  // khi upload ảnh trên Android/iOS.
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

export const userApi = {
  // Đăng nhập
  login: (email, matkhau) =>
    request("/api/users/login", {
      method: "POST",
      body: JSON.stringify({
        email,
        matkhau,
      }),
    }),

  // Lấy danh sách người dùng
  getUsers: (token) =>
    request("/api/users", {}, token),

  // Thêm người dùng
  createUser: (user, token) =>
    request(
      "/api/users",
      {
        method: "POST",
        body: JSON.stringify(user),
      },
      token
    ),

  // Cập nhật người dùng
  updateUser: (id, user, token) =>
    request(
      `/api/users/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(user),
      },
      token
    ),

  // Xóa người dùng
  deleteUser: (id, token) =>
    request(
      `/api/users/${id}`,
      {
        method: "DELETE",
      },
      token
    ),

  // Upload ảnh lên Cloudinary qua backend
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
