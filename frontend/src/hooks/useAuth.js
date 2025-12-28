import { useContext } from "react";
import { AuthContext } from "../context/AuthContextType";

export function useAuth() {
  return useContext(AuthContext);
}
