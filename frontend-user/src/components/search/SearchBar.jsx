// src/components/SearchBar.jsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API } from "../../utils/config";

export default function SearchBar() {
  const [keyword, setKeyword] = useState("");

  const [suggestions, setSuggestions] = useState([]);

  const [isFocused, setIsFocused] = useState(false);

  const navigate = useNavigate();

  //Fetch suggestions
  useEffect(() => {
    if (!keyword.trim() || keyword.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    fetch(`${API}/products?search=${encodeURIComponent(keyword.trim())}`)
      .then((res) => res.json())
      .then((data) => {
        const filtered = data.filter(item =>
          item.name.toLowerCase().includes(keyword.toLowerCase())
        );

        if (filtered.length === 0) {
          setSuggestions([{ _id: "no-result", name: "Không tìm thấy sản phẩm" }]);
          return;
        }

        setSuggestions(filtered.slice(0, 5));
      })
      .catch(() => setSuggestions([]));
  }, [keyword]);



  //Submit: Enter
  const handleSubmit = (e) => {
    e.preventDefault();
    const query = keyword.trim();
    //clear ui
    setSuggestions([]);
    setKeyword("");
    navigate(`/products?search=${encodeURIComponent(query)}`);
  };

  return (
    <div 
      style={{ position: "relative", flex: "1", margin: "0 30px" }}
      onMouseLeave={() => setIsFocused(false)}
    >
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          className="search-box"
          placeholder="Bạn tìm gì..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onMouseEnter={() => setIsFocused(true)}
          style={{
            width: "100%",
            padding: "12px 18px",
            borderRadius: "12px",
            background: "#1e1f22",
            border: "1px solid #444",
            color: "#e0e0e0",
            fontSize: "14px",
            transition: "0.25s",
          }}
        />
      </form>

      {isFocused && suggestions.length > 0 && (
        <ul
          style={{
            position: "absolute",
            top: "44px",
            left: 0,
            right: 0,
            background: "#222",
            border: "1px solid #444",
            borderRadius: 8,
            listStyle: "none",
            margin: 0,
            padding: 0,
            maxHeight: 200,
            overflowY: "auto",
            zIndex: 1000,
          }}
          onMouseEnter={() => setIsFocused(true)}
        >
          {suggestions.map((item) => (
            <li
              key={item._id}
              style={{
                padding: "10px 14px",
                cursor: "pointer",
                borderBottom: "1px solid #444",
              }}
              onClick={() => {
                setSuggestions([]);
                setKeyword("");  //clear
                navigate(`/products?search=${encodeURIComponent(item.name)}`);
              }}
            >
              {item.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
