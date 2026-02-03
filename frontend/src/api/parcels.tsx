import axios from "axios";
import { fetchAuthSession } from "aws-amplify/auth";

const API_URL = import.meta.env.BACKEND_API_URL || "http://localhost:8000";

/**
 * Interface representing the raw data structure from the API
 * used for type-safe mapping to GeoJSON features.
 */
export interface Parcel {
  id: string;
  address: string;
  county: string;
  sqft: number | null;
  price: number;
  geometry: string; // received as a stringified GeoJSON from Postgres
}

/**
 * Type definition for the filter object passed to the API
 */
export interface ParcelFilters {
  min_price: number | null;
  max_price: number | null;
  min_sqft: number | null;
  max_sqft: number | null;
  county: string | null;
}

/**
 function to fetch parcels.
 handles: Auth token retrieval, Header construction, Axios request execution
 */
export const fetchParcels = async (
  filters: ParcelFilters,
  signal: AbortSignal,
) => {
  let token: string | undefined = undefined;

  // Authentication logic:
  try {
    const session = await fetchAuthSession();
    token = session.tokens?.idToken?.toString();
  } catch (err) {
    // no session means guest
    console.log("User is guest (not logged in)");
  }

  const headers: any = {
    "Content-Type": "application/json",
  };

  // Attach the token if it exists
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await axios.get(`${API_URL}/parcels`, {
    params: filters, // filters are spread automatically by axios
    headers: headers,
    signal: signal, // attach the signal to axios request
  });

  return {
    data: response.data.data as Parcel[],
    isLoggedIn: !!token, //return auth status so MapBoard can update its state
  };
};
