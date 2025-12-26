import { useEffect, useState } from "react";
import { API } from "../../utils/config";

import "../../styles/components/faq.css";

export default function FAQSection() {
  const [faqs, setFaqs] = useState([]);

  useEffect(() => {
    fetch(`${API}/faqs`)
      .then(res => res.json())
      .then(data => setFaqs(data));
  }, []);

  return (
    <section className="question-section">
      <div className="faq-list">
        {faqs.map(f => (
          <div key={f.id} className="ques">
            <p className="question">{f.question}</p>

            <div className="answer">
              {f.answer?.map((a, i) => (
                <p key={i}>{a}</p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
