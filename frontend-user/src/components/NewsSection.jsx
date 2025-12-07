import { useEffect, useState } from "react";
import "../styles/components/news.css";

export default function NewsSection() {
  const [news, setNews] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5000/news")
      .then(res => res.json())
      .then(data => setNews(data));
  }, []);

  return (
    <section className="news-section">
      <div className="news-list">
        {news.map(n => (
          <a key={n.id} className="news-item" href={n.link} target="_blank" rel="noopener">
            <img src={`http://localhost:5173${n.image}`} alt={n.title} />

            <div className="news-content">
              <p className="category">{n.category}</p>
              <h3 className="headline">{n.title}</h3>
              <p className="date">{n.date}</p>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
