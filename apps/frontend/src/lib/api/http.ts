import axios, { type AxiosInstance } from "axios";

import { BACKEND_URL } from "@/lib/constants";

export const API_BASE_URL = BACKEND_URL;

export const http: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      "An error occurred";
    throw new Error(
      typeof message === "string" ? message : JSON.stringify(message),
    );
  },
);
