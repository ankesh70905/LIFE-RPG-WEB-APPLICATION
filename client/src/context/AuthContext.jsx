import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  getToken,
  removeToken,
  setToken,
  setUnauthorizedHandler
} from "../services/api.js";
import {
  getCurrentUser,
  login as loginRequest,
  signup as signupRequest
} from "../services/authService.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => getToken());
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const restoreRequest = useRef(null);

  useEffect(() => {
    const handleUnauthorized = () => {
      removeToken();
      setTokenState(null);
      setUser(null);
    };

    setUnauthorizedHandler(handleUnauthorized);

    return () => {
      setUnauthorizedHandler(null);
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      if (!token) {
        if (active) {
          setLoading(false);
        }
        return;
      }

      let requestPromise = restoreRequest.current?.promise;

      if (restoreRequest.current?.token !== token) {
        requestPromise = getCurrentUser();
        restoreRequest.current = {
          token,
          promise: requestPromise
        };
      }

      try {
        const response = await requestPromise;
        if (active) {
          setUser(response.user);
        }
      } catch {
        if (active) {
          removeToken();
          setTokenState(null);
          setUser(null);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    restoreSession();

    return () => {
      active = false;
    };
  }, [token]);

  async function login(credentials) {
    const response = await loginRequest(credentials);
    setToken(response.token);
    setTokenState(response.token);
    setUser(response.user);
    return response.user;
  }

  async function signup(credentials) {
    const response = await signupRequest(credentials);
    setToken(response.token);
    setTokenState(response.token);
    setUser(response.user);
    return response.user;
  }

  function logout() {
    removeToken();
    setTokenState(null);
    setUser(null);
  }

  async function refreshUser() {
    const response = await getCurrentUser();
    setUser(response.user);
    return response.user;
  }

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(user && token),
      login,
      signup,
      logout,
      refreshUser
    }),
    [loading, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }

  return context;
}
