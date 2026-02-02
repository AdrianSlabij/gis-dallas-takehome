import { useState, useEffect } from "react";

interface SidebarProps {
  onFilterChange: (filters: any) => void; //sends the selected filter values back to the Map component
  onExport: () => void; // trigger for the CSV export handled in MapBoard
}

const Sidebar = ({ onFilterChange, onExport }: SidebarProps) => {
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minSqft, setMinSqft] = useState("");

// Initialize filter: Load from LocalStorage on mount AND apply immediately
  useEffect(() => {
    const savedFilters = localStorage.getItem('dallas_filters');
    if (savedFilters) {
      const parsed = JSON.parse(savedFilters);
      
      //sync local UI state
      if (parsed.minPrice) setMinPrice(parsed.minPrice);
      if (parsed.maxPrice) setMaxPrice(parsed.maxPrice);
      if (parsed.minSqft) setMinSqft(parsed.minSqft);
      
      // auto apply persisted filters
      onFilterChange({
        min_price: parsed.minPrice || null,
        max_price: parsed.maxPrice || null,
        min_sqft: parsed.minSqft || null,
      });
    }
  }, []);

  // apply filters and save to local storage
  const handleApply = () => {
    const filters = {
      min_price: minPrice || null,
      max_price: maxPrice || null,
      min_sqft: minSqft || null,
    };

    //save to local storage
    localStorage.setItem(
      "dallas_filters",
      JSON.stringify({
        minPrice,
        maxPrice,
        minSqft,
      }),
    );
    //update component
    onFilterChange(filters);
  };

  return (
    <div
    
      style={{
        position: "absolute",
        top: 20,
        left: 20,
        width: "250px",
        backgroundColor: "rgba(0, 0, 0, 0.53)",
        padding: "20px",
        borderRadius: "8px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        zIndex: 1000,
      }}
    >
      <h3 style={{ marginTop: 0 }}>Filters</h3>
      {/* Filter Inputs */}
      <div style={{ marginBottom: "10px" }}>
        <label style={{ display: "block", fontSize: "12px" }}>Min Price</label>
        <input
          type="number"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          placeholder="$0"
          style={{ width: "100%", padding: "5px" }}
        />
      </div>

      <div style={{ marginBottom: "10px" }}>
        <label style={{ display: "block", fontSize: "12px" }}>Max Price</label>
        <input
          type="number"
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          placeholder="$1,000,000"
          style={{ width: "100%", padding: "5px" }}
        />
      </div>

      <div style={{ marginBottom: "10px" }}>
        <label style={{ display: "block", fontSize: "12px" }}>Min SqFt</label>
        <input
          type="number"
          value={minSqft}
          onChange={(e) => setMinSqft(e.target.value)}
          placeholder="0"
          style={{ width: "100%", padding: "5px" }}
        />
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
          }}
        >
          Apply
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
  );
};

export default Sidebar;
