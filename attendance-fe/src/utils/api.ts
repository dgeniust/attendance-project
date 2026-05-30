// 1. Quản lý JWT Token trong LocalStorage
export const tokenManager = {
  getToken: () => localStorage.getItem("access_token"),
  setToken: (token: string) => localStorage.setItem("access_token", token),
  removeToken: () => localStorage.removeItem("access_token"),
};

// 2. Cấu hình base URL
const BASE_URL = "http://127.0.0.1:8000/api";

// 3. Hàm gọi API chung (fetch wrapper)
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

interface RequestOptions extends RequestInit {
  data?: any;
}

export async function fetchApi<T>(
  endpoint: string,
  method: HttpMethod = "GET",
  options: RequestOptions = {},
): Promise<T> {
  const { data, headers: customHeaders, ...restOptions } = options;
  const token = tokenManager.getToken();

  const headers: HeadersInit = {
    Accept: "application/json",
    ...(customHeaders as Record<string, string>),
  };
  const isFormData = data instanceof FormData;
  if (!isFormData) {
    headers["Content-Type"] = "application/json";
  } else {
    delete headers["Content-Type"];
    delete headers["content-type"];
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method,
    headers,
    ...restOptions,
  };

  if (data) {
    if (isFormData) {
      config.body = data;
    } else {
      config.body = JSON.stringify(data);
    }
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, config);
  console.log("API response status:", response.status, response.statusText);
  const responseData = await response.json();
  console.log(`API Request: ${method} ${endpoint}`, {
    requestData: data,
    responseData,
  });
  if (!response.ok) {
    throw new Error(
      responseData.message || responseData.detail || "Có lỗi xảy ra từ máy chủ",
    );
  }

  return responseData as T;
}
