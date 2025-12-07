import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import ProductGrid from "../components/ProductGrid";

export default function Products() {
  const [products, setProducts] = useState([]);

  const location = useLocation();

  // Get ?search= from URL
  const urlParams = new URLSearchParams(location.search);
  const initialKeyword = urlParams.get("search") || "";

  const [keyword, setKeyword] = useState(initialKeyword);
  const [sortType, setSortType] = useState("none");
  const [priceFilter, setPriceFilter] = useState("all");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Fetch API with search from URL
  useEffect(() => {
    setKeyword(initialKeyword);

    let api = "http://localhost:5000/products";

    if (initialKeyword) {
      api += `?search=${encodeURIComponent(initialKeyword)}`;
    }

    fetch(api)
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch((err) => console.log("Fetch error:", err));
  }, [location.search]);

  // FILTER PRC
  const filterByPrice = (items) => {
    switch (priceFilter) {
      case "under15":
        return items.filter((p) => p.price < 15000000);
      case "15to25":
        return items.filter((p) => p.price >= 15000000 && p.price <= 25000000);
      case "above25":
        return items.filter((p) => p.price > 25000000);
      default:
        return items;
    }
  };

  // SEARCH LOCAL
  const filterBySearch = (items) => {
    return items.filter((p) =>
      p.name.toLowerCase().includes(keyword.toLowerCase())
    );
  };

  // SORT
  const sortProducts = (items) => {
    let sorted = [...items];

    switch (sortType) {
      case "priceAsc":
        sorted.sort((a, b) => a.price - b.price);
        break;
      case "priceDesc":
        sorted.sort((a, b) => b.price - a.price);
        break;
      case "nameAsc":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case "nameDesc":
        sorted.sort((a, b) => b.name.localeCompare(a.name));
        break;
      default:
        break;
    }

    return sorted;
  };

  // APPLY SEARCH + FILTER + SORT
  const processedProducts = sortProducts(
    filterBySearch(filterByPrice(products))
  );

  // RESET PAGE after search/sort/filter
  useEffect(() => {
    setCurrentPage(1);
  }, [keyword, sortType, priceFilter]);

  // PAGINATION
  const totalPages = Math.ceil(processedProducts.length / itemsPerPage);

  const paginatedProducts = processedProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ marginBottom: 20 }}>Tất cả sản phẩm</h1>

      {/* SEARCH + SORT + FILTER */}
      <div
        style={{
          display: "flex",
          gap: 16,
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        <input
          type="text"
          className="search-box-product"
          placeholder="Tìm sản phẩm..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            border: "1px solid #444",
            backgroundColor: "#1e1f22",
            fontSize: 16,
            flex: "1",
            minWidth: "200px",
          }}
        />

        <select
          value={sortType}
          onChange={(e) => setSortType(e.target.value)}
          style={{
            padding: "10px",
            borderRadius: 8,
            border: "1px solid #444",
            backgroundColor: "#1e1f22",
            color: "#e5d9b6",
            fontSize: 16,
          }}
        >
          <option value="none">Sắp xếp</option>
          <option value="priceAsc">Giá tăng dần</option>
          <option value="priceDesc">Giá giảm dần</option>
          <option value="nameAsc">Tên A → Z</option>
          <option value="nameDesc">Tên Z → A</option>
        </select>

        <select
          value={priceFilter}
          onChange={(e) => setPriceFilter(e.target.value)}
          style={{
            padding: "10px",
            borderRadius: 8,
            border: "1px solid #444",
            backgroundColor: "#1e1f22",
            color: "#e5d9b6",
            fontSize: 16,
          }}
        >
          <option value="all">Tất cả giá</option>
          <option value="under15">Dưới 15 triệu</option>
          <option value="15to25">15 - 25 triệu</option>
          <option value="above25">Trên 25 triệu</option>
        </select>
      </div>

      {/* PRODUCT GRID */}
      {paginatedProducts.length === 0 ? (
        <p>Không tìm thấy sản phẩm phù hợp.</p>
      ) : (
        <ProductGrid products={paginatedProducts} columns={3} />
      )}

      {/* PAGINATION UI */}
      <div style={{ marginTop: 30, display: "flex", gap: 8 }}>
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((p) => p - 1)}
          style={{ padding: "6px 12px" }}
        >
          &lt; Prev
        </button>

        {[...Array(totalPages)].map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentPage(i + 1)}
            style={{
              padding: "6px 12px",
              background: currentPage === i + 1 ? "#111" : "#fff",
              color: currentPage === i + 1 ? "#fff" : "#111",
              borderRadius: "6px",
              border: "1px solid #444",
              cursor: "pointer",
            }}
          >
            {i + 1}
          </button>
        ))}

        <button
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage((p) => p + 1)}
          style={{ padding: "6px 12px" }}
        >
          Next &gt;
        </button>
      </div>
    </div>
  );
}
