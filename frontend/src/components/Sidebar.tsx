import { useState, useEffect } from "react";
import { Authenticator } from "@aws-amplify/ui-react";
import { signOut } from "aws-amplify/auth";
import "@aws-amplify/ui-react/styles.css";

const AuthSuccessHandler = ({
  user,
  onSuccess,
}: {
  user: any;
  onSuccess: () => void;
}) => {
  useEffect(() => {
    if (user) {
      onSuccess();
    }
  }, [user, onSuccess]);

  return (
    <div style={{ textAlign: "center", padding: "20px" }}>
      <h3>Success!</h3>
      <p>Signing you in...</p>
    </div>
  );
};

interface SidebarProps {
  onFilterChange: (filters: any) => void; //sends the selected filter values back to the Map component
  onExport: () => void; // trigger for the CSV export handled in MapBoard
  onLoginToggle: (isLoggedIn: boolean) => void;
  isLoggedIn: boolean;
  resultCount?: number | null;
  isSearching?: boolean;
}

// Hardcoded list to filter by counties
const COUNTIES = [
  "All",
  "Dallas",
  "Tarrant",
  "Collin",
  "Denton",
  "Hood",
  "Palo-Pinto",
  "Rains",
  "Fannin",
  "Wise",
  "Johnson",
  "Hunt",
  "Henderson",
  "Navarro",
  "Hopkins",
  "Kaufman",
  "Van-Zandt",
  "Ellis",
  "Delta",
  "Erath",
  "Grayson",
  "Parker",
  "Rockwall",
];

const Sidebar = ({
  onFilterChange,
  onExport,
  onLoginToggle,
  isLoggedIn,
  resultCount = null,
  isSearching = false,
}: SidebarProps) => {
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minSqft, setMinSqft] = useState("");
  const [maxSqft, setMaxSqft] = useState("");
  const [selectedCounty, setSelectedCounty] = useState("All");
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Initialize filter: Load from LocalStorage on mount AND apply immediately
  useEffect(() => {
    const savedFilters = localStorage.getItem("dallas_filters");
    if (savedFilters) {
      const parsed = JSON.parse(savedFilters);

      //sync local UI state
      if (parsed.minPrice) setMinPrice(parsed.minPrice);
      if (parsed.maxPrice) setMaxPrice(parsed.maxPrice);
      if (parsed.minSqft) setMinSqft(parsed.minSqft);
      if (parsed.maxSqft) setMaxSqft(parsed.maxSqft);
      if (parsed.county) setSelectedCounty(parsed.county);

      // auto apply persisted filters
      onFilterChange({
        min_price: parsed.minPrice || null,
        max_price: parsed.maxPrice || null,
        min_sqft: parsed.minSqft || null,
        max_sqft: parsed.maxSqft || null,
        county: parsed.county === "All" ? null : parsed.county,
      });
    }
  }, []);

  // apply filters and save to local storage
  const handleApply = () => {
    //If guest, ignore the specific county selection
    //to prevent a "ghost" filter if they select a county then logout
    const effectiveCounty =
      !isLoggedIn || selectedCounty === "All" ? null : selectedCounty;

    const filters = {
      min_price: minPrice || null,
      max_price: maxPrice || null,
      min_sqft: minSqft || null,
      max_sqft: maxSqft || null,
      county: effectiveCounty,
    };

    //save to local storage
    localStorage.setItem(
      "dallas_filters",
      JSON.stringify({
        minPrice,
        maxPrice,
        minSqft,
        maxSqft,
        county: selectedCounty,
      }),
    );
    //update component
    onFilterChange(filters);
  };

  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 20,
          left: 20,
          width: "250px",
          backgroundColor: "rgba(0, 0, 0, 0.75)",
          padding: "20px",
          borderRadius: "8px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
          zIndex: 1000,
          color: "white",
        }}
      >
        <div
          style={{
            marginBottom: "20px",
            padding: "10px",
            backgroundColor: isLoggedIn ? "#e6fffa" : "#fff5f5",
            borderRadius: "4px",
            border: isLoggedIn ? "1px solid #38b2ac" : "1px solid #fc8181",
            textAlign: "center",
            color: "#333",
          }}
        >
          <div style={{ fontWeight: "bold", marginBottom: "5px" }}>
            {isLoggedIn ? "Registered User" : "Guest Mode"}
          </div>
          <div
            style={{ fontSize: "11px", color: "#666", marginBottom: "10px" }}
          >
            {isLoggedIn ? "Access: All Counties" : "Access: Dallas Only"}
          </div>

          {isLoggedIn ? (
            //sign out button
            <button
              onClick={async () => {
                // tell AWS to kill the session
                try {
                  await signOut();
                } catch (error) {
                  console.error("Error signing out: ", error);
                }
                onLoginToggle(false);
                setSelectedCounty("All");
              }}
              style={{
                cursor: "pointer",
                fontSize: "12px",
                padding: "5px 10px",
                backgroundColor: "transparent",
                border: "1px solid #666",
                borderRadius: "4px",
                color: "#333",
              }}
            >
              Sign Out
            </button>
          ) : (
            //signup button
            <button
              onClick={() => setShowAuthModal(true)}
              style={{
                cursor: "pointer",
                fontSize: "12px",
                padding: "5px 10px",
                backgroundColor: "#0080ff",
                color: "white",
                border: "none",
                borderRadius: "4px",
              }}
            >
              Log In / Sign Up
            </button>
          )}
        </div>

        <h3 style={{ marginTop: 0 }}>Filters</h3>

        {/* Filter Inputs: Price Row */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <div style={{ flex: 1 }}>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                marginBottom: "2px",
              }}
            >
              Min Price
            </label>
            <input
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="$0"
              style={{ width: "90%", padding: "5px" }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                marginBottom: "2px",
              }}
            >
              Max Price
            </label>
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="$1M+"
              style={{ width: "90%", padding: "5px" }}
            />
          </div>
        </div>

        {/* Filter Inputs: SqFt Row */}
        <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
          <div style={{ flex: 1 }}>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                marginBottom: "2px",
              }}
            >
              Min SqFt
            </label>
            <input
              type="number"
              value={minSqft}
              onChange={(e) => setMinSqft(e.target.value)}
              placeholder="0"
              style={{ width: "90%", padding: "5px" }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                marginBottom: "2px",
              }}
            >
              Max SqFt
            </label>
            <input
              type="number"
              value={maxSqft}
              onChange={(e) => setMaxSqft(e.target.value)}
              placeholder="Max"
              style={{ width: "90%", padding: "5px" }}
            />
          </div>
        </div>

        {/* Filter Inputs: County Dropdown (logged in)*/}
        {isLoggedIn && (
          <div style={{ marginBottom: "15px" }}>
            <label
              style={{
                display: "block",
                fontSize: "12px",
                marginBottom: "5px",
              }}
            >
              County
            </label>
            <select
              value={selectedCounty}
              onChange={(e) => setSelectedCounty(e.target.value)}
              style={{ width: "100%", padding: "5px" }}
            >
              {COUNTIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Results indicator */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "10px",
            fontSize: "12px",
            minHeight: "16px",
          }}
        >
          {isSearching ? (
            <span style={{ color: "#fbbf24", fontWeight: "bold" }}>
              Searching...
            </span>
          ) : resultCount !== null && resultCount !== undefined ? (
            <span
              style={{
                color: resultCount > 0 ? "#4ade80" : "#f87171",
                fontWeight: "bold",
              }}
            >
              Found {resultCount.toLocaleString()} results
            </span>
          ) : (
            <span style={{ color: "#9ca3af" }}>Ready to filter</span>
          )}
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={handleApply}
            style={{
              flex: 1,
              padding: "10px",
              backgroundColor: "#0080ff",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              opacity: isSearching ? 0.7 : 1,
            }}
          >
            {isSearching ? "..." : "Apply"}
          </button>

          <button
            onClick={onExport}
            style={{
              flex: 1,
              padding: "10px",
              backgroundColor: "#28a745",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            }}
          >
            Export
          </button>
        </div>
      </div>

      {/* AWS Login Modal */}
      {showAuthModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0,0,0,0.6)",
            zIndex: 2000,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div
            style={{
              backgroundColor: "white",
              borderRadius: "8px",
              minWidth: "350px",
              maxHeight: "90vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* header row */}
            <div
              style={{
                height: "40px",
                display: "flex",
                justifyContent: "flex-end",
                alignItems: "center",
                padding: "0 10px",
                borderBottom: "1px solid #eee",
              }}
            >
              <button
                onClick={() => setShowAuthModal(false)}
                style={{
                  cursor: "pointer",
                  background: "none",
                  border: "none",
                  fontSize: "20px",
                  fontWeight: "bold",
                  color: "#666",
                  lineHeight: "1",
                }}
              >
                &times;
              </button>
            </div>

            <div style={{ padding: "20px", overflowY: "auto" }}>
              <Authenticator
                loginMechanisms={["email"]}
                signUpAttributes={["email"]}
              >
                {({ user }) => (
                  <AuthSuccessHandler
                    user={user}
                    onSuccess={() => {
                      onLoginToggle(true);
                      setShowAuthModal(false);
                    }}
                  />
                )}
              </Authenticator>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
