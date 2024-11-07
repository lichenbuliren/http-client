import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';

type RequestInterceptor = (
  config: InternalAxiosRequestConfig
) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>;
type ResponseInterceptor = (
  response: AxiosResponse
) => AxiosResponse | Promise<AxiosResponse>;

class HttpClient {
  private client: AxiosInstance;
  private token: string | null = null;
  private isAuthenticating: boolean = false; // Used to prevent duplicate auth attempts
  private authPromise: Promise<string> | null = null;
  private lastAuthTime: number | null = null;
  private authCooldown = 5000; // Cooldown in milliseconds

  constructor(baseURL: string, defaultHeaders: Record<string, string> = {}) {
    this.client = axios.create({
      baseURL,
      headers: defaultHeaders,
    });

    this.client.interceptors.response.use(
      response => response,
      error => this.handleError(error)
    );
  }

  // Add external interceptors
  public addInterceptors(
    requestInterceptor?: RequestInterceptor,
    responseInterceptor?: ResponseInterceptor
  ): void {
    if (requestInterceptor) {
      this.client.interceptors.request.use(
        config => requestInterceptor(config),
        error => Promise.reject(error)
      );
    }

    if (responseInterceptor) {
      this.client.interceptors.response.use(
        response => responseInterceptor(response),
        error => Promise.reject(error)
      );
    }
  }

  // Method to handle authentication
  private async authenticate(): Promise<string> {
    if (this.isAuthenticating) {
      return this.authPromise!; // If authentication is in progress, return the existing promise
    }

    this.isAuthenticating = true; // Mark as authenticating

    this.authPromise = new Promise(async (resolve, reject) => {
      try {
        const response = await axios.post<{ token: string }>('/auth', {
          username: 'your_username',
          password: 'your_password',
        });
        this.token = response.data.token;
        this.client.defaults.headers.common[
          'Authorization'
        ] = `Bearer ${this.token}`;
        this.lastAuthTime = Date.now();
        resolve(this.token);
      } catch (authError) {
        reject(authError);
      } finally {
        this.isAuthenticating = false;
        this.authPromise = null;
      }
    });

    return this.authPromise;
  }

  // Retry the original request with the new token
  private async retryRequest(
    originalRequest: AxiosRequestConfig
  ): Promise<AxiosResponse> {
    if (!this.token) throw new Error('No token available to retry the request');
    originalRequest.headers = originalRequest.headers || {};
    originalRequest.headers['Authorization'] = `Bearer ${this.token}`;
    return this.client(originalRequest);
  }

  // Handle errors and trigger re-authentication if needed
  private async handleError(error: any): Promise<any> {
    const originalRequest = error.config;
    const now = Date.now();
    const shouldAuthenticate =
      !this.lastAuthTime || now - this.lastAuthTime > this.authCooldown;

    // Check for the 100025 error code (indicating authentication failure)
    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 100025 &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      if (shouldAuthenticate) {
        try {
          await this.authenticate(); // Attempt to authenticate
        } catch (authError) {
          return Promise.reject(authError); // If authentication fails, reject the original request
        }
      } else if (this.authPromise) {
        // Wait for the authentication promise to resolve if in progress
        await this.authPromise;
      }

      return this.retryRequest(originalRequest); // Retry the original request with the new token
    }

    return Promise.reject(error);
  }

  // GET request method
  public async get<T = any>(
    url: string,
    params: Record<string, any> = {},
    config: AxiosRequestConfig = {}
  ): Promise<T> {
    const response = await this.client.get<T>(url, { params, ...config });
    return response.data;
  }

  // POST request method
  public async post<T = any>(
    url: string,
    data: any = {},
    config: AxiosRequestConfig = {}
  ): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  // PUT request method
  public async put<T = any>(
    url: string,
    data: any = {},
    config: AxiosRequestConfig = {}
  ): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  // DELETE request method
  public async delete<T = any>(
    url: string,
    config: AxiosRequestConfig = {}
  ): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }
}

export default HttpClient;
