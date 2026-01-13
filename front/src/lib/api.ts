import axios, { AxiosError } from "axios";

type Dict = Record<string, unknown>;
const isDict = (v: unknown): v is Dict => typeof v === "object" && v !== null;

function extractMessage(data: unknown): string | undefined {
  if (!isDict(data)) return undefined;
  const candidates = [data.message, data.error, data.msg];
  return candidates.find((v): v is string => typeof v === "string" && v.trim().length > 0);
}

const BASE_URL = process.env.NEXT_PUBLIC_API_URL;

if (!BASE_URL) {
  throw new Error(
    "NEXT_PUBLIC_API_URL não definido. Configure no seu .env"
  );
}

const baseURL = `${BASE_URL.replace(/\/+$/, "")}/api`;

export const api = axios.create({
  baseURL,
  withCredentials: true,
});

// deixa JSON como padrão, MAS só quando não for FormData
api.interceptors.request.use((config) => {
  const isFormData =
    typeof FormData !== "undefined" && config.data instanceof FormData;

  if (isFormData) {
    // não defina Content-Type para FormData (o browser coloca com boundary)
    if (config.headers) {
      delete (config.headers)["Content-Type"];
      delete (config.headers)["content-type"];
    }
  } else {
    // força JSON só quando não for FormData
    if (config.headers) {
      (config.headers)["Content-Type"] = "application/json";
    }
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError<unknown>) => {
    const message =
      extractMessage(err.response?.data) ?? err.message ?? "Falha na requisição";

    return Promise.reject(
      new AxiosError(message, err.code, err.config, err.request, err.response)
    );
  }
);
