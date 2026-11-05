const categories = [
  { id: 'paperweight', name: '문진', icon: '✿' },
  { id: 'box', name: '합', icon: '◇' },
  { id: 'movement', name: '무브먼트', icon: '♫', nameOnly: true },
  { id: 'handle', name: '핸들', icon: '↻' },
  { id: 'sticker', name: '곡스티커', icon: '♪', nameOnly: true },
  { id: 'figure', name: '피규어', icon: '☆', nameOnly: true },
  { id: 'base', name: '바닥판', icon: '▱', items: ['문진', '일러합', '동양화합'] },
  { id: 'packaging', name: '포장패키지', icon: '▣', items: ['문진박스', '합박스', '띠지', '쇼핑백', '손잡이박스', '에어캡', '명함', null, '합 사용설명서', '문진 사용설명서'], units: { 에어캡: '묶음', 명함: 'box', '합 사용설명서': 'box', '문진 사용설명서': 'box' } },
  { id: 'dome', name: '우드소/유리돔', icon: '◠', items: ['우드소 (바닥 포함)', '유리돔 (바닥 포함)', '스핀'] },
  { id: 'supplies', name: '소모품', icon: '✧', items: ['실리콘', '에폭시', '순간접착제', '갑티슈', '물티슈', '글루건심', '물걸레청소포'] },
  { id: 'other', name: '기타', icon: '⋯' }
];

const homeCategoryOrder = [
  'paperweight', 'box', 'movement', 'handle', 'base', 'dome',
  'sticker', 'figure', 'packaging', 'supplies', 'other'
];

const storageKey = 'moony.orders.v1';
const main = document.querySelector('#main');
const announce = document.querySelector('#announcement');
const summaryButton = document.querySelector('#summary');
const seoulDay = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date());
const dateLabel = day => new Intl.DateTimeFormat('ko-KR', { dateStyle: 'full', timeZone: 'Asia/Seoul' }).format(new Date(day + 'T12:00:00+09:00'));
const escape = value => String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));

let records = {};
let storageError = false;
try {
  records = JSON.parse(localStorage.getItem(storageKey) ?? '{}');
} catch {
  storageError = true;
}
let day = seoulDay();
let page = 'home';

function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(records));
    storageError = false;
  } catch {
    storageError = true;
  }
  const indicator = main.querySelector('.save');
  if (indicator) {
    indicator.dataset.error = storageError;
    indicator.textContent = storageError ? '저장하지 못했어요. 이 화면을 닫기 전에 발주 내용을 복사해 주세요.' : '✓ 이 브라우저에 자동 저장됨';
  }
  updateSummaryButton();
}

function rows(category) {
  const saved = records[day]?.[category.id] ?? [];
  if (!category.items) return saved;
  return category.items.flatMap((name, index) => {
    const row = saved[index];
    if (name) return [{ ...row, name, index }];
    // This slot belongs to records created before the manuals were split.
    if (row && Object.values(row).some(value => value !== '')) {
      return [{ ...row, name: '사용설명서 (기존 기록)', index }];
    }
    return [];
  });
}

function requestedRows(category) {
  return rows(category).filter(row => row.name?.trim() && (category.nameOnly || category.id === 'other' || Number(row.request) > 0));
}

function updateSummaryButton() {
  const count = categories.reduce((total, category) => total + requestedRows(category).length, 0);
  summaryButton.textContent = count ? `발주서 보기 · ${count}품목` : '발주서 보기';
}

function saveIndicator() {
  return `<span class="save" data-error="${storageError}" role="status">${storageError ? '저장 공간을 확인해 주세요.' : '이 브라우저에 자동 저장'} </span>`;
}

function renderHome() {
  const history = Object.keys(records).filter(key => key !== day && Object.values(records[key]).some(list =>
    Object.values(list).some(row => row.name || row.request !== undefined && row.request !== '' || row.stock !== undefined && row.stock !== '' || row.note)
  )).sort().reverse();
  return `<section class="hero">
    <p class="eyebrow">발주 요청</p><h1>매장 발주서</h1>
    <p>카테고리를 열고 발주할 품목을 기록하세요.</p>
    <div class="date-row"><label class="tag" for="date">작성 날짜</label><input id="date" type="date" value="${day}" min="2000-01-01" max="9999-12-31">${day === seoulDay() ? '<span class="tag">오늘</span>' : '<button class="secondary" data-day="today" type="button">오늘로</button>'}</div>
    ${saveIndicator()}
  </section>
  <section class="section"><h2>카테고리</h2><div class="grid">
    ${homeCategoryOrder.map(id => {
      const category = categories.find(item => item.id === id);
      const count = requestedRows(category).length;
      return `<button class="tile" type="button" data-page="${category.id}"><span class="tile-icon" aria-hidden="true">${category.icon}</span><strong>${category.name}<small>${count ? count + '품목 요청' : category.items ? category.items.filter(Boolean).length + '개 세부 품목' : '품목 추가'}</small></strong><span class="arrow" aria-hidden="true">›</span></button>`;
    }).join('')}
  </div></section>
  ${history.length ? `<section class="section"><h2>지난 기록</h2><div class="history">${history.map(key => `<button type="button" class="secondary" data-day="${key}">${dateLabel(key)}</button>`).join('')}</div></section>` : ''}`;
}

function quantityInput(row, field, label, name) {
  return `<label>${label}<input type="text" inputmode="numeric" maxlength="9" data-field="${field}" value="${escape(row[field])}" placeholder="—"${name ? ` aria-label="${name} ${label}"` : ''}></label>`;
}

function stockInput(category, row) {
  if (category.id === 'movement') return '';
  if (category.id === 'paperweight') return quantityInput(row, 'stock', '잔여 재고');
  const label = category.items ? `${row.name} 재고 없음` : '재고 없음';
  return `<label class="stock-toggle"><input type="checkbox" data-field="stock" aria-label="${escape(label)}"${stockText(category, row) ? ' checked' : ''}>재고 없음</label>`;
}

function renderCategory(category) {
  const items = rows(category);
  const intro = category.id === 'paperweight' ? '요청 수량과 잔여 재고를 입력하세요.'
    : category.id === 'movement' ? '발주할 품목명을 입력하세요.'
      : category.nameOnly ? '품목명을 입력하고, 재고가 없으면 체크하세요.'
      : category.id === 'other' ? '품목명을 입력하세요. 요청 수량과 메모는 선택사항이에요.'
      : '요청 수량을 입력하고, 재고가 없으면 체크하세요.';
  return `<button type="button" class="back" data-page="home">‹ 카테고리</button>
    <p class="eyebrow">${dateLabel(day)}</p><h1>${category.name}</h1>
    <p class="intro">${intro}</p>${saveIndicator()}
    <section class="section" aria-label="${category.name} 품목">
    ${items.map((row, index) => category.items ?
      `<div class="item fixed" data-row="${row.index}"><strong>${row.name}</strong>${quantityInput(row, 'request', category.units?.[row.name] ? `요청 수량 (${category.units[row.name]})` : '요청 수량', row.name)}${stockInput(category, row)}</div>` :
      `<div class="item${category.nameOnly ? ' name-only' : ''}" data-row="${index}"><div class="item-top"><span>품목 ${index + 1}</span><button type="button" class="remove" data-remove="${index}" aria-label="품목 ${index + 1} 삭제">삭제</button></div>
      <label class="name">품목명<input data-field="name" value="${escape(row.name)}" placeholder="품목명 입력" maxlength="100"></label>
      ${category.nameOnly ? '' : quantityInput(row, 'request', '요청 수량')}${stockInput(category, row)}
      ${category.id === 'other' ? `<label class="note">메모<input data-field="note" value="${escape(row.note)}" maxlength="250" placeholder="필요한 내용 입력"></label>` : ''}</div>`
    ).join('')}
    ${category.items ? '' : '<button type="button" class="secondary add" id="add">＋ 품목 추가</button>'}
    </section>`;
}

function groupedRequests() {
  return categories.flatMap(category => {
    const grouped = new Map();
    for (const row of requestedRows(category)) {
      const quantity = category.nameOnly ? null : Number(row.request) || null;
      const label = quantity === null ? '' : `${quantity}${category.units?.[row.name] ?? '개'}`;
      if (!grouped.has(label)) grouped.set(label, { quantity, label, items: [] });
      grouped.get(label).items.push(row);
    }
    return grouped.size ? [{ category, groups: [...grouped.values()].sort((a, b) => b.quantity - a.quantity) }] : [];
  });
}

function stockText(category, row) {
  if (category.id === 'movement' || row.stock === undefined || row.stock === '') return '';
  const stock = Number(row.stock);
  if (category.id === 'paperweight') return `잔여 ${stock}개`;
  return stock === 0 ? '재고 없음' : '';
}

function renderSummary() {
  const requests = groupedRequests();
  return `<button type="button" class="back" data-page="home">‹ 카테고리</button>
    <p class="eyebrow">${dateLabel(day)}</p>
    <div class="summary-head"><h1>발주서 보기</h1>${requests.length ? '<button class="secondary" type="button" id="copy">내용 복사</button>' : ''}</div>
    <p class="intro">카테고리 안에서 수량과 단위가 같은 품목을 모았어요.</p>
    ${requests.length ? requests.map(({category, groups}) => `<section class="sheet"><h2>${category.name}</h2>
      ${groups.map(({label, items}) => `<div class="group${label ? '' : ' name-only'}">${label ? `<span class="qty">${label}</span>` : ''}<ul>${items.map(row => {
        const stock = stockText(category, row);
        return `<li><strong>${escape(row.name.trim())}</strong>${stock ? ` <span class="stock">/ ${stock}</span>` : ''}${row.note ? `<span class="memo">${escape(row.note)}</span>` : ''}</li>`;
      }).join('')}</ul></div>`).join('')}
      </section>`).join('') : '<section class="sheet"><p class="empty">이 날짜에 발주를 요청한 품목이 없어요.</p></section>'}`;
}

function render(focus = false) {
  main.innerHTML = page === 'home' ? renderHome() : page === 'summary' ? renderSummary() : renderCategory(categories.find(category => category.id === page));
  updateSummaryButton();
  if (focus) {
    main.focus();
    window.scrollTo(0, 0);
  }
}

function navigate(destination) {
  page = destination;
  render(true);
}

function copyText() {
  const lines = ['Moony Music Box 발주서', dateLabel(day)];
  for (const { category, groups } of groupedRequests()) {
    lines.push('', `[${category.name}]`);
    for (const { label, items } of groups) {
      for (const row of items) {
        const stock = stockText(category, row);
        lines.push(`${row.name.trim()}${label ? ' ' + label : ''}${stock ? ' / ' + stock : ''}${row.note ? ' · ' + row.note : ''}`);
      }
    }
  }
  return lines.join('\n');
}

main.addEventListener('click', async event => {
  const button = event.target.closest('button');
  if (!button) return;
  if (button.dataset.page) {
    navigate(button.dataset.page);
  } else if (button.dataset.day) {
    day = button.dataset.day === 'today' ? seoulDay() : button.dataset.day;
    navigate('home');
  } else if (button.id === 'add') {
    const list = (records[day] ??= {})[page] ??= [];
    list.push({});
    render();
    save();
    main.querySelector('[data-row="' + (list.length - 1) + '"] input').focus();
  } else if (button.dataset.remove !== undefined) {
    const list = records[day][page];
    const index = Number(button.dataset.remove);
    const row = list[index];
    if (Object.values(row).some(value => value !== '') && !window.confirm('이 품목 기록을 삭제할까요?')) return;
    list.splice(index, 1);
    render();
    save();
    main.querySelector('#add').focus();
  } else if (button.id === 'copy') {
    try {
      await navigator.clipboard.writeText(copyText());
      button.textContent = '복사 완료';
      announce.textContent = '발주서 내용을 복사했어요.';
    } catch {
      window.prompt('아래 내용을 선택해 복사해 주세요.', copyText());
    }
  }
});

main.addEventListener('change', event => {
  const input = event.target;
  if (input.id === 'date' && input.value && input.validity.valid) {
    day = input.value;
    render();
    main.querySelector('#date').focus();
  }
});

main.addEventListener('input', event => {
  const input = event.target;
  const field = input.dataset.field;
  if (!field) return;
  const category = categories.find(category => category.id === page);
  const list = (records[day] ??= {})[page] ??= category.items ? {} : [];
  const index = Number(input.closest('[data-row]').dataset.row);
  const row = list[index] ??= {};
  if (input.type === 'checkbox') {
    row.stock = input.checked ? '0' : '';
    save();
    return;
  }
  if (field === 'stock' || field === 'request') {
    const value = input.value.replace(/[０-９]/g, digit => String(digit.charCodeAt(0) - 65296)).replace(/[^0-9]/g, '');
    if (value !== input.value) input.value = value;
  }
  row[field] = input.value;
  save();
});

document.querySelector('#home').addEventListener('click', () => navigate('home'));
document.querySelector('#brand').addEventListener('click', () => navigate('home'));
summaryButton.addEventListener('click', () => navigate('summary'));
render();
