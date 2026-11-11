
import { Platform } from "react-native";
import { fetch as expoFetch } from "expo/fetch";
import { API_URL } from "./config";

// ==========================================
// HÀM GỬI REQUEST CHUNG
// ==========================================

async function request(path, options = {}, token = null) {
  const isFormData = options.body instanceof FormData;

  // Không tự đặt Content-Type khi upload FormData.
  // Fetch sẽ tự tạo multipart boundary.
  const headers = {
    ...(!isFormData
      ? { "Content-Type": "application/json" }
      : {}),
    ...(token
      ? { Authorization: `Bearer ${token}` }
      : {}),
    ...(options.headers || {}),
  };

  // Android/iOS: dùng expo/fetch khi upload ảnh.
  // Web và request JSON: dùng fetch thông thường.
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
      "Hãy kiểm tra Backend, địa chỉ IP và Wi-Fi. " +
      `Chi tiết: ${error.message}`
    );
  }

  // Đọc nội dung phản hồi.
  const responseText = await response.text();

  let data;

  try {
    data = responseText
      ? JSON.parse(responseText)
      : {};
  } catch {
    throw new Error(
      `Server trả về dữ liệu không hợp lệ ` +
      `(HTTP ${response.status})`
    );
  }

  // Xử lý lỗi HTTP.
  if (!response.ok) {
    throw new Error(
      data.message ||
      `Yêu cầu thất bại (HTTP ${response.status})`
    );
  }

  return data;
}

// ==========================================
// API QUẢN LÝ SẢN PHẨM
// ==========================================

export const productApi = {

  // ----------------------------------------
  // 1. ĐĂNG NHẬP ADMIN
  // ----------------------------------------
  // Giữ nguyên API đăng nhập hiện tại.
  // Backend trả về JWT token.

  login: (email, matkhau) =>
    request("/api/users/login", {
      method: "POST",
      body: JSON.stringify({
        email,
        matkhau,
      }),
    }),

  // ----------------------------------------
  // 2. LẤY DANH SÁCH SẢN PHẨM
  // ----------------------------------------
  // Dữ liệu này được dùng cho:
  // - Danh sách sản phẩm
  // - Dashboard thống kê
  // - Tìm kiếm, lọc, sắp xếp
  // - Cảnh báo tồn kho

  getProducts: (token) =>
    request(
      "/api/products",
      {
        method: "GET",
      },
      token
    ),

  // ----------------------------------------
  // 3. THÊM SẢN PHẨM
  // ----------------------------------------
  // Chỉ gửi đúng 4 trường:
  // name, price, soluong, image

  createProduct: (product, token) =>
    request(
      "/api/products",
      {
        method: "POST",
        body: JSON.stringify({
          name: product.name,
          price: product.price,
          soluong: product.soluong,
          image: product.image,
        }),
      },
      token
    ),

  // ----------------------------------------
  // 4. CẬP NHẬT SẢN PHẨM
  // ----------------------------------------

  updateProduct: (id, product, token) =>
    request(
      `/api/products/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        body: JSON.stringify({
          name: product.name,
          price: product.price,
          soluong: product.soluong,
          image: product.image,
        }),
      },
      token
    ),

  // ----------------------------------------
  // 5. XÓA SẢN PHẨM
  // ----------------------------------------

  deleteProduct: (id, token) =>
    request(
      `/api/products/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
      },
      token
    ),

  // ----------------------------------------
  // 6. UPLOAD ẢNH LÊN CLOUDINARY
  // ----------------------------------------
  // Backend xử lý:
  // - Upload ảnh vào thư mục products
  // - Thêm ảnh vào Cloudinary Collection
  //   nếu đã cấu hình chức năng này
  // - Trả về URL trong thuộc tính image
  //
  // Không thay đổi cách upload Android.

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
