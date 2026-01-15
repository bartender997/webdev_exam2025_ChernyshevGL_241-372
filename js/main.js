let currentPage = 1;
let currentSort = '';
let currentSearch = '';
let currentFilters = {};
let allCategories = [];

const searchInput = document.getElementById('search-input');
const searchButton = document.getElementById('search-button');
const autocompleteList = document.getElementById('autocomplete-list');
const categoryList = document.getElementById('category-list');
const priceMin = document.getElementById('price-min');
const priceMax = document.getElementById('price-max');
const discountOnly = document.getElementById('discount-only');
const applyFiltersBtn = document.getElementById('apply-filters');
const sortSelect = document.getElementById('sort-select');
const catalog = document.getElementById('catalog');
const loadMoreBtn = document.getElementById('load-more');

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadGoods();
        await loadCategories();
        updateCartCount();
        initEventListeners();
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        showNotification('Ошибка загрузки данных', 'error');
    }
});

function initEventListeners() {
    searchInput.addEventListener('input', debounce(handleSearchInput, 300));
    searchButton.addEventListener('click', handleSearch);
    
    autocompleteList.addEventListener('click', handleAutocompleteSelect);
    
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            autocompleteList.style.display = 'none';
        }
    });
    
    applyFiltersBtn.addEventListener('click', applyFilters);
    sortSelect.addEventListener('change', handleSortChange);
    
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', loadMoreGoods);
    }
}

async function handleSearchInput() {
    const query = searchInput.value.trim();
    
    if (query.length < 2) {
        autocompleteList.style.display = 'none';
        return;
    }
    
    try {
        const suggestions = await getAutocompleteSuggestions(query);
        showAutocompleteSuggestions(suggestions);
    } catch (error) {
        console.error('Ошибка получения автодополнений:', error);
    }
}

function showAutocompleteSuggestions(suggestions) {
    if (!suggestions || suggestions.length === 0) {
        autocompleteList.style.display = 'none';
        return;
    }
    
    autocompleteList.innerHTML = '';
    
    suggestions.forEach(suggestion => {
        const item = document.createElement('div');
        item.className = 'autocomplete-item';
        item.textContent = suggestion;
        item.dataset.suggestion = suggestion;
        autocompleteList.appendChild(item);
    });
    
    autocompleteList.style.display = 'block';
}

function handleAutocompleteSelect(e) {
    const item = e.target.closest('.autocomplete-item');
    if (!item) return;
    
    const suggestion = item.dataset.suggestion;
    const currentInput = searchInput.value;
    const words = currentInput.split(' ');
    
    if (words.length > 0) {
        words[words.length - 1] = suggestion;
        searchInput.value = words.join(' ');
    } else {
        searchInput.value = suggestion;
    }
    
    autocompleteList.style.display = 'none';
    searchInput.focus();
}

function handleSearch() {
    currentSearch = searchInput.value.trim();
    currentPage = 1;
    loadGoods();
}

async function loadGoods() {
    try {
        showLoading();
        
        const params = { page: currentPage, per_page: 12 };
        
        if (currentSearch) {
            params.query = currentSearch;
        }
        
        if (currentSort) {
            params.sort_order = currentSort;
        }
        
        if (currentFilters.categories && currentFilters.categories.length > 0) {
            params.main_category = currentFilters.categories.join(',');
        }
        
        if (currentFilters.price_min) {
            params.price_min = currentFilters.price_min;
        }
        
        if (currentFilters.price_max) {
            params.price_max = currentFilters.price_max;
        }
        
        if (currentFilters.discount_only) {
            params.has_discount = true;
        }
        
        const response = await getGoods(params);
        
        const goods = response.goods || response;
        const pagination = response._pagination;
        
        if (currentPage === 1) {
            catalog.innerHTML = '';
        }
        
        if (!goods || goods.length === 0) {
            showNoProducts();
            return;
        }
        
        renderGoods(goods);
        
        if (pagination) {
            if (pagination.current_page < Math.ceil(pagination.total_count / pagination.per_page)) {
                loadMoreBtn.style.display = 'block';
            } else {
                loadMoreBtn.style.display = 'none';
            }
        } else {
            loadMoreBtn.style.display = goods.length >= 12 ? 'block' : 'none';
        }
        
    } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
        showNotification('Ошибка загрузки товаров', 'error');
    } finally {
        hideLoading();
    }
}

async function loadCategories() {
    try {
        const goods = await getGoods({ per_page: 100 });
        const categories = [...new Set(goods.map(good => good.main_category))];
        allCategories = categories;
        renderCategories(categories);
    } catch (error) {
        console.error('Ошибка загрузки категорий:', error);
    }
}

function renderCategories(categories) {
    categoryList.innerHTML = '';
    
    categories.forEach(category => {
        const item = document.createElement('div');
        item.className = 'category-item';
        item.innerHTML = `
            <label>
                <input type="checkbox" value="${category}" class="category-checkbox">
                <span>${category}</span>
            </label>
        `;
        categoryList.appendChild(item);
    });
}

function applyFilters() {
    currentPage = 1;
    
    const selectedCategories = [];
    document.querySelectorAll('.category-checkbox:checked').forEach(checkbox => {
        selectedCategories.push(checkbox.value);
    });
    
    currentFilters = {
        categories: selectedCategories,
        price_min: priceMin.value || null,
        price_max: priceMax.value || null,
        discount_only: discountOnly.checked
    };
    
    loadGoods();
    showNotification('Фильтры применены', 'success');
}

function handleSortChange() {
    currentSort = sortSelect.value;
    currentPage = 1;
    loadGoods();
}

async function loadMoreGoods() {
    currentPage++;
    await loadGoods();
}

function renderGoods(goods) {
    goods.forEach(good => {
        const productCard = createProductCard(good);
        catalog.appendChild(productCard);
    });
}

function createProductCard(good) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.id = good.id;
    
    const price = good.discount_price || good.actual_price;
    const hasDiscount = good.discount_price && good.discount_price < good.actual_price;
    const discountPercent = hasDiscount ? 
        Math.round((1 - good.discount_price / good.actual_price) * 100) : 0;
    
    const imageUrl = getProductImage(good.id);
    
    card.innerHTML = `
        <div class="product-image-container">
            <img src="${imageUrl}" 
                 alt="${good.name}" 
                 class="product-image"
                 onerror="this.onerror=null; this.src='${PLACEHOLDER_IMAGE}'">
            ${hasDiscount ? `
                <div class="discount-badge-overlay">-${discountPercent}%</div>
            ` : ''}
        </div>
        <div class="product-info">
            <h3 class="product-name" title="${good.name}">${good.name}</h3>
            <div class="product-rating">
                <span class="rating-stars">${generateStarRating(good.rating)}</span>
                <span class="rating-value">${good.rating.toFixed(1)}</span>
            </div>
            <div class="product-price">
                <span class="current-price">${formatPrice(price)}</span>
                ${hasDiscount ? `
                    <span class="old-price">${formatPrice(good.actual_price)}</span>
                ` : ''}
            </div>
            <div class="product-actions">
                <button class="btn btn-primary add-to-cart-btn" data-id="${good.id}">
                    <i class="fas fa-cart-plus"></i> Добавить
                </button>
            </div>
        </div>
    `;
    
    const addButton = card.querySelector('.add-to-cart-btn');
    addButton.addEventListener('click', () => addProductToCart(good));
    
    return card;
}

function generateStarRating(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    let stars = '';
    
    for (let i = 0; i < fullStars; i++) stars += '★';
    if (halfStar) stars += '½';
    for (let i = 0; i < emptyStars; i++) stars += '☆';
    
    return stars;
}

function addProductToCart(product) {
    addToCart(product);
    updateCartCount();
}

function showNoProducts() {
    catalog.innerHTML = `
        <div class="no-products">
            <p>${currentSearch ? 'Нет товаров, соответствующих вашему запросу' : 'Товары не найдены'}</p>
            ${currentSearch || currentFilters.categories || currentFilters.price_min || 
              currentFilters.price_max || currentFilters.discount_only ? 
              '<button class="btn btn-secondary" id="reset-filters">Сбросить фильтры</button>' : ''}
        </div>
    `;
    
    const resetButton = document.getElementById('reset-filters');
    if (resetButton) {
        resetButton.addEventListener('click', resetFilters);
    }
    
    loadMoreBtn.style.display = 'none';
}

function resetFilters() {
    currentSearch = '';
    currentFilters = {};
    searchInput.value = '';
    sortSelect.value = '';
    priceMin.value = '';
    priceMax.value = '';
    discountOnly.checked = false;
    
    document.querySelectorAll('.category-checkbox').forEach(checkbox => {
        checkbox.checked = false;
    });
    
    currentPage = 1;
    loadGoods();
}

function showLoading() {
    if (currentPage === 1) {
        catalog.innerHTML = '<div class="loading">Загрузка товаров...</div>';
    }
    loadMoreBtn.disabled = true;
    loadMoreBtn.textContent = 'Загрузка...';
}

function hideLoading() {
    loadMoreBtn.disabled = false;
    loadMoreBtn.textContent = 'Загрузить ещё';
}