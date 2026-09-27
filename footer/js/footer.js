/**
 * footer.js
 * - Xử lý form đăng ký nhận tin (kèm checkbox đồng ý)
 * - (Tuỳ chọn) nạp các cột liên kết footer từ data/footer-links.json
 */

function initNewsletterForm() {
  const form = document.querySelector('.newsletter');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = form.querySelector('input[type="email"]');
    const consent = document.querySelector('.newsletter-consent input');
    const note = document.querySelector('.newsletter-note');
    if (!input || !input.value.trim()) return;

    if (consent && !consent.checked) {
      if (note) note.textContent = 'Vui lòng đồng ý nhận email trước khi đăng ký.';
      return;
    }

    // TODO: thay bằng lời gọi API đăng ký nhận tin thực tế
    console.log('Đăng ký nhận tin:', input.value.trim());
    if (note) note.textContent = 'Đã đăng ký! Cảm ơn bạn.';
    input.value = '';
  });
}

/**
 * Nạp các cột link footer từ data/footer-links.json.
 * Cần chạy qua local server (http://) vì fetch() trên file:// bị chặn.
 */
async function loadFooterFromJSON(jsonPath = 'data/footer-links.json') {
  try {
    const res = await fetch(jsonPath);
    if (!res.ok) throw new Error('Không tải được footer-links.json');
    const data = await res.json();

    const container = document.querySelector('#footer-columns');
    if (container && Array.isArray(data.columns)) {
      container.innerHTML = data.columns
        .map(
          (col) => `
          <div class="footer-col">
            <h3>${col.title}</h3>
            <ul>
              ${col.links
                .map((l) => `<li><a href="${l.href}">${l.label}</a></li>`)
                .join('')}
            </ul>
          </div>`
        )
        .join('');
    }

    const copyrightEl = document.querySelector('.copyright');
    if (copyrightEl && data.copyright) {
      copyrightEl.textContent = data.copyright;
    }
  } catch (err) {
    console.warn('[footer.js] Dùng footer tĩnh trong HTML vì:', err.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initNewsletterForm();
  // Bỏ comment dòng dưới nếu muốn render footer động từ JSON:
  // loadFooterFromJSON();
});
