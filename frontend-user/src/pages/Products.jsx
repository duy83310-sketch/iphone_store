import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import ProductGrid from "../components/product/ProductGrid";
import { API } from "../utils/config";
import { getLowestVariantBasePrice } from "../utils/price";

export default function Products() {
  const [products, setProducts] = useState([]);

  const location = useLocation();

  // Get ?search= from URL
  const urlParams = new URLSearchParams(location.search);
  const initialKeyword = urlParams.get("search") || "";
  const categoryFromURL = urlParams.get("filter") || "all";

  const [keyword, setKeyword] = useState(initialKeyword);
  const [sortType, setSortType] = useState("none");
  const [priceFilter, setPriceFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState(categoryFromURL);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Fetch API with search from URL
  useEffect(() => {
    setKeyword(initialKeyword);
    // Always fetch the full product list and use client-side filtering.
    // This ensures the search box on the Products page can filter locally
    // even when navigating here from the header search (which sets the URL).
    fetch(`${API}/products`)
      .then((res) => res.json())
      .then((data) => setProducts(data))
      .catch((err) => console.log("Fetch error:", err));
  }, [location.search]);

  // FILTER PRC
  const filterByPrice = (items) => {
    switch (priceFilter) {
      case "under15":
        return items.filter((p) => getLowestVariantBasePrice(p) < 15000000);
      case "15to25":
        return items.filter((p) => getLowestVariantBasePrice(p) >= 15000000 && getLowestVariantBasePrice(p) <= 25000000);
      case "above25":
        return items.filter((p) => getLowestVariantBasePrice(p) > 25000000);
      default:
        return items;
    }
  };

  //FILTER CATEGORY
  const filterByCategory = (items) => {
  switch (categoryFilter) {
    case "featured":
      return items.filter(p => p.featured === true);
    case "hot":
      return items.filter(p => p.hot === true);
    case "new":
      return items.filter(p => p.new === true);
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
    const compareNameCI = (a, b) =>
      String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' });

    switch (sortType) {
      case "priceAsc":
        sorted.sort((a, b) => getLowestVariantBasePrice(a) - getLowestVariantBasePrice(b));
        break;
      case "priceDesc":
        sorted.sort((a, b) => getLowestVariantBasePrice(b) - getLowestVariantBasePrice(a));
        break;
      case "nameAsc":
        sorted.sort(compareNameCI);
        break;
      case "nameDesc":
        sorted.sort((a, b) => compareNameCI(b, a));
        break;
      default: {
        // Default: tag priority (hot+new > hot > new > none), then reverse alphabet (Z → A)
        const tagRank = (p) => {
          const isHot = !!p.hot;
          const isNew = !!p.new;
          if (isHot && isNew) return 0;
          if (isHot) return 1;
          if (isNew) return 2;
          return 3;
        };
        sorted.sort((a, b) => {
          const ra = tagRank(a);
          const rb = tagRank(b);
          if (ra !== rb) return ra - rb;
          return compareNameCI(b, a); // Z → A inside same tag group
        });
        break;
      }
    }

    return sorted;
  };

  // APPLY SEARCH + FILTER + SORT + CATEGORY
  const processedProducts = sortProducts(
    filterBySearch(
      filterByPrice(
        filterByCategory(products)
      )
    )
  );

  // RESET PAGE after search/sort/filter
  useEffect(() => {
    setCurrentPage(1);
  }, [keyword, sortType, priceFilter, categoryFilter]);

  // PAGINATION
  const totalPages = Math.ceil(processedProducts.length / itemsPerPage);

  const paginatedProducts = processedProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div style={{padding: "20px", maxWidth: "90%", margin: "auto"}}>
      <h1 className="title">Tất cả sản phẩm</h1>

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
            color: "#e5d9b6",
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

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{
            padding: "10px",
            borderRadius: 8,
            border: "1px solid #444",
            backgroundColor: "#1e1f22",
            color: "#e5d9b6",
            fontSize: 16,
          }}
        >
          <option value="all">Tất cả</option>
          <option value="featured">Sản phẩm nổi bật</option>
          <option value="hot">Đang hot</option>
          <option value="new">Hàng mới</option>
        </select>
      </div>

      {/* PRODUCT GRID */}
      {paginatedProducts.length === 0 ? (
        <p>Không tìm thấy sản phẩm phù hợp.</p>
      ) : (
        <ProductGrid products={paginatedProducts} columns={4} />
      )}

      {/* PAGINATION UI */}
      <div className="pagination">
        <button
          disabled={currentPage === 1}
          onClick={() => setCurrentPage((p) => p - 1)}
          className="pagination-btn"
        >
          &lt; Trang trước
        </button>

        {[...Array(totalPages)].map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentPage(i + 1)}
            className={`pagination-page ${
              currentPage === i + 1 ? "active" : ""
            }`}
          >
            {i + 1}
          </button>
        ))}

        <button
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage((p) => p + 1)}
          className="pagination-btn"
        >
          Trang sau &gt;
        </button>
      </div>
    </div>
  );
}
