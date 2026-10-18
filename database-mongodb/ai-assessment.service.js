const crypto = require('crypto');

const TWO_ACTIONS = ['repair', 'resell'];

function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize).sort();
  if (value && typeof value === 'object') {
    return Object.keys(value).sort().reduce((result, key) => {
      result[key] = normalize(value[key]);
      return result;
    }, {});
  }
  return String(value ?? '').trim().toLowerCase();
}

function createAssessmentFingerprint(repair) {
  const assessment = repair.assessment ? { ...repair.assessment, images: undefined } : null;
  const source = {
    deviceType: repair.deviceType,
    assessment,
    issueDescription: repair.issueDescription
  };
  return crypto.createHash('sha256').update(JSON.stringify(normalize(source))).digest('hex');
}

function buildGeminiPrompt(repair) {
  return [
    'Bạn là chuyên gia đánh giá thiết bị điện tử cũ của ECOCycle.',
    'Đánh giá dựa trên FORM và các tin đăng cùng loại/model hiện còn bán trên website ECOCycle được cung cấp bên dưới.',
    'Trả về DUY NHẤT một JSON hợp lệ, không markdown, không giải thích ngoài JSON.',
    'JSON bắt buộc có dạng:',
    JSON.stringify({
      repair: { title: 'Sửa chữa', recommendation: '', nextStep: '', confidence: 'thấp|trung bình|cao' },
      resell: { title: 'Bán lại', recommendation: '', nextStep: '', confidence: 'thấp|trung bình|cao' },
      summary: '',
      estimatedPrice: {
        amountVnd: null,
        currency: 'VND',
        display: 'Chưa có dữ liệu định giá',
        rationale: ''
      },
      estimatedPrices: {
        repair: { amountVnd: null, currency: 'VND', display: 'Chưa có dữ liệu định giá', rationale: '' },
        resell: { amountVnd: null, currency: 'VND', display: 'Chưa có dữ liệu định giá', rationale: '' }
      }
    }),
    'Chỉ đánh giá đúng hai hướng là sửa chữa và bán lại; không đề xuất tái chế hoặc thu hồi linh kiện. Mỗi hướng phải có khuyến nghị cụ thể và bước tiếp theo. Nếu không có giá tham chiếu phù hợp và người dùng cũng không nhập giá, trả amountVnd là null, display ghi "Chưa đủ dữ liệu định giá" và nêu rõ cần kiểm tra; tuyệt đối không bịa số liệu hay dùng giá từ tin đã bán.',
    'Giá người dùng nhập (userEstimatedPriceVnd), nếu có, là giá trị thiết bị do người dùng ước tính chứ không phải báo giá đã xác minh; có thể dùng làm căn cứ dự phòng khi không có tin phù hợp và phải nói rõ nguồn trong rationale. Nếu người dùng không nhập, dùng giá niêm yết các tin đang bán của ECOCycle làm căn cứ chính; chỉ dùng tin cùng model hoặc model rất gần, cùng loại thiết bị/thương hiệu. Ghi trong rationale giá tham chiếu, tên model và cách suy ra ước tính. Nếu chỉ có model gần, nói rõ đó là model tham khảo.',
    'estimatedPrices.repair là chi phí sửa chữa dự kiến dựa trên hạng mục lỗi/linh kiện; estimatedPrices.resell là giá bán lại dự kiến sau khi sửa hoặc công khai đúng tình trạng. Hai giá phải được ước tính riêng và nhất quán với tình trạng thiết bị.',
    'Mọi amountVnd phải là số nguyên không âm hoặc null. display phải là chuỗi tiền Việt dễ đọc.',
    `FORM: ${JSON.stringify({
      deviceName: repair.deviceName,
      deviceType: repair.deviceType,
      issueDescription: repair.issueDescription,
      userEstimatedPriceVnd: repair.userEstimatedPriceVnd,
      assessment: repair.assessment
        ? {
            ...repair.assessment,
            images: (repair.assessment.images || []).map(image => ({
              area: image.area,
              name: image.name,
              type: image.type,
              size: image.size
            }))
          }
        : null
    })}`,
    `GIÁ NIÊM YẾT THAM KHẢO TỪ CÁC SẢN PHẨM ĐANG BÁN TRÊN ECOCycle (không phải báo giá sửa chữa): ${JSON.stringify(repair.marketPriceReferences || [])}`
  ].join('\n');
}

function parsePriceAmount(value) {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) return Math.round(value);
  if (typeof value === 'string' && /^\s*\d+(?:\.\d+)?\s*$/.test(value)) {
    const amount = Number(value);
    return Number.isFinite(amount) && amount >= 0 ? Math.round(amount) : null;
  }
  return null;
}

function normalizeCatalogText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function parseCatalogPrice(product) {
  for (const value of [product.fromPrice, product.Price, product.price, product.currentPrice]) {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) return Math.round(value);
    if (typeof value === 'string') {
      const digits = value.replace(/[^\d]/g, '');
      if (digits && Number(digits) > 0) return Number(digits);
    }
  }
  return null;
}

function buildMarketPriceReferences(categories, repair) {
  const brand = normalizeCatalogText(repair.assessment?.brand);
  const model = normalizeCatalogText(repair.deviceName);
  const modelTokens = model.split(' ').filter(token => token.length > 1);
  const requestedType = normalizeCatalogText(repair.deviceType);

  return categories.flatMap(category => {
    const categoryName = normalizeCatalogText(category.CateName);
    if (
      requestedType &&
      requestedType !== 'thiet bi khac' &&
      !categoryName.includes(requestedType) &&
      !(requestedType === 'dien thoai' && categoryName.includes('smartphone')) &&
      !(requestedType === 'may tinh bang' && categoryName.includes('tablet'))
    ) {
      return [];
    }

    return (category.Products || [])
      .filter(product =>
        product.Status !== 'Đã bán' &&
        (product.quantity === undefined || product.quantity > 0)
      )
      .map(product => {
        const title = String(product.title || product.name || '');
        const normalizedTitle = normalizeCatalogText(title);
        const brandMatches = !brand || brand === 'khac' || normalizedTitle.includes(brand);
        const matchedModelTokens = modelTokens.filter(token => normalizedTitle.includes(token));
        const modelMatches = !modelTokens.length || matchedModelTokens.length === modelTokens.length;
        const price = parseCatalogPrice(product);
        return {
          product,
          category: category.CateName || '',
          title,
          brandMatches,
          modelMatches,
          matchedModelTokens: matchedModelTokens.length,
          price,
          score: (modelMatches ? 100 : matchedModelTokens.length * 10) +
            (brandMatches ? 20 : 0) +
            (price !== null ? 1 : 0)
        };
      })
      .filter(item =>
        item.price !== null &&
        item.brandMatches &&
        (item.modelMatches || item.matchedModelTokens > 0)
      );
  })
    .sort((left, right) => right.score - left.score)
    .slice(0, 5)
    .map(({ product, category, title, price }) => ({
      productID: product.id || product.productID || '',
      title,
      listedPriceVnd: price,
      condition: product.condition || '',
      category,
      status: product.Status || ''
    }));
}

function fallbackAssessment({ repairOrderID, userID, deviceType, fingerprint, errorMessage }) {
  return {
    assessmentID: `AI${Date.now()}`,
    repairOrderID,
    userID,
    deviceType,
    fingerprint,
    source: 'fallback',
    recommendation: 'Cần kỹ thuật viên kiểm tra trực tiếp trước khi quyết định xử lý.',
    recommendations: {
      repair: {
        title: 'Sửa chữa',
        recommendation: 'Ưu tiên kiểm tra và sửa chữa nếu lỗi có thể thay thế linh kiện.',
        nextStep: 'Đặt lịch kỹ thuật viên kiểm tra trực tiếp.',
        confidence: 'thấp'
      },
      resell: {
        title: 'Bán lại',
        recommendation: 'Chỉ bán lại sau khi công khai đầy đủ lỗi và có kết quả kiểm tra.',
        nextStep: 'Chờ kết luận kỹ thuật và cập nhật tình trạng thực tế.',
        confidence: 'thấp'
      },
    },
    summary: errorMessage || 'Chưa có đủ dữ liệu để đánh giá tự động.',
    estimatedPrice: 'Chưa có dữ liệu định giá',
    estimatedPriceDetails: {
      amountVnd: null,
      currency: 'VND',
      display: 'Chưa có dữ liệu định giá',
      rationale: 'Cần kỹ thuật viên kiểm tra trực tiếp trước khi báo giá.'
    },
    estimatedPrices: {
      repair: { amountVnd: null, currency: 'VND', display: 'Chưa có dữ liệu định giá', rationale: 'Cần kiểm tra kỹ thuật.' },
      resell: { amountVnd: null, currency: 'VND', display: 'Chưa có dữ liệu định giá', rationale: 'Cần kiểm tra kỹ thuật.' }
    },
    status: errorMessage ? 'Lỗi khi gọi Gemini API' : 'Chưa cấu hình Gemini API',
    error: errorMessage || null,
    createdAt: new Date().toISOString()
  };
}

function parseGeminiResponse(text, metadata) {
  const cleanText = String(text).replace(/^```json\s*|\s*```$/g, '').trim();
  const parsed = JSON.parse(cleanText);
  if (!parsed || typeof parsed !== 'object' || !TWO_ACTIONS.every(key => parsed[key])) {
    throw new Error('Gemini response thiếu đủ hai hướng xử lý.');
  }
  const price = parsed.estimatedPrice;
  const estimatedPriceDetails = typeof price === 'object' && price !== null
    ? {
        amountVnd: parsePriceAmount(price.amountVnd),
        currency: price.currency || 'VND',
        display: price.display || 'Chưa có dữ liệu định giá',
        rationale: price.rationale || ''
      }
    : {
        amountVnd: null,
        currency: 'VND',
        display: String(price || 'Chưa có dữ liệu định giá'),
        rationale: ''
      };
  const estimatedPrices = TWO_ACTIONS.reduce((result, action) => {
    const actionPrice = parsed.estimatedPrices?.[action];
    result[action] = actionPrice && typeof actionPrice === 'object'
      ? {
          amountVnd: parsePriceAmount(actionPrice.amountVnd),
          currency: actionPrice.currency || 'VND',
          display: actionPrice.display || 'Chưa có dữ liệu định giá',
          rationale: actionPrice.rationale || ''
        }
      : estimatedPriceDetails;
    return result;
  }, {});
  return {
    ...metadata,
    source: 'gemini',
    recommendation: parsed.summary || 'Đã hoàn tất đánh giá theo dữ liệu form.',
    recommendations: {
      repair: parsed.repair,
      resell: parsed.resell
    },
    summary: parsed.summary || '',
    estimatedPrice: estimatedPriceDetails.display,
    estimatedPriceDetails,
    estimatedPrices,
    status: 'Đã đánh giá bằng Gemini',
    error: null,
    createdAt: new Date().toISOString()
  };
}

async function requestAssessment(repair, options = {}) {
  const fingerprint = createAssessmentFingerprint(repair);
  const metadata = {
    assessmentID: `AI${Date.now()}`,
    repairOrderID: repair.repairOrderID,
    userID: options.userID,
    deviceType: repair.deviceType,
    fingerprint
  };

  if (!options.apiKey) {
    return fallbackAssessment({ ...metadata, errorMessage: null });
  }

  const fetchImplementation = options.fetchImplementation || fetch;
  const primaryModel = options.model || process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const models = [...new Set([
    primaryModel,
    ...(options.fallbackModels || ['gemini-2.5-flash', 'gemini-3-flash-preview'])
  ])];
  const retriesPerModel = options.retriesPerModel ?? 2;
  const retryDelayMs = options.retryDelayMs ?? 800;
  const prompt = buildGeminiPrompt(repair);
  let lastError = null;

  for (const model of models) {
    const attempts = model === primaryModel ? retriesPerModel : 1;
    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        const response = await fetchImplementation(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(options.apiKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: AbortSignal.timeout(options.timeoutMs ?? 25000),
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                responseMimeType: 'application/json',
                temperature: 0.2
              }
            })
          }
        );
        if (!response.ok) {
          const details = await response.text();
          throw new Error(`Gemini API ${response.status}: ${details.slice(0, 300)}`);
        }
        const body = await response.json();
        const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('Gemini không trả về nội dung đánh giá.');
        const assessment = parseGeminiResponse(text, metadata);
        assessment.model = model;
        return assessment;
      } catch (error) {
        lastError = error;
        const isTemporary = /Gemini API (429|500|502|503|504):|fetch failed|network|timeout/i
          .test(error.message);
        if (!isTemporary) break;
        if (attempt + 1 < retriesPerModel) {
          await new Promise(resolve => setTimeout(resolve, retryDelayMs * (attempt + 1)));
        }
      }
    }
  }

  return fallbackAssessment({ ...metadata, errorMessage: lastError?.message || 'Gemini không thể xử lý yêu cầu.' });
}

module.exports = {
  TWO_ACTIONS,
  buildGeminiPrompt,
  buildMarketPriceReferences,
  createAssessmentFingerprint,
  fallbackAssessment,
  parsePriceAmount,
  parseGeminiResponse,
  requestAssessment
};
