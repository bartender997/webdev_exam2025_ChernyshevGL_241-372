const cartItems = document.getElementById('cart-items');
const emptyCart = document.getElementById('empty-cart');
const productsTotal = document.getElementById('products-total');
const deliveryCost = document.getElementById('delivery-cost');
const orderTotal = document.getElementById('order-total');
const orderForm = document.getElementById('order-form');
const resetFormBtn = document.getElementById('reset-form');
const deliveryDate = document.getElementById('delivery-date');
const deliveryInterval = document.getElementById('delivery-interval');

let cartProducts = [];

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadCartProducts();
        updateOrderSummary();
        initEventListeners();
        updateCartCount();
        
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        deliveryDate.min = tomorrow.toISOString().split('T')[0];
        deliveryDate.value = tomorrow.toISOString().split('T')[0];
        
    } catch (error) {
        console.error('Ошибка инициализации корзины:', error);
        showNotification('Ошибка загрузки корзины', 'error');
    }
});

async function loadCartProducts() {
    const cart = getCart();
    
    if (cart.length === 0) {
        showEmptyCart();
        return;
    }
    
    try {
        const productPromises = cart.map(async item => {
            try {
                const product = await getGood(item.id);
                return {
                    ...item,
                    ...product,
                    totalPrice: (item.quantity * (product.discount_price || product.actual_price))
                };
            } catch (error) {
                console.error(`Ошибка загрузки товара ${item.id}:`, error);
                return null;
            }
        });
        
        cartProducts = (await Promise.all(productPromises)).filter(Boolean);
        renderCartItems();
        
    } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
        showNotification('Ошибка загрузки товаров из корзины', 'error');
    }
}

function renderCartItems() {
    cartItems.innerHTML = '';
    
    cartProducts.forEach(product => {
        const cartItem = createCartItem(product);
        cartItems.appendChild(cartItem);
    });
    
    if (cartProducts.length === 0) {
        showEmptyCart();
    } else {
        emptyCart.style.display = 'none';
        cartItems.style.display = 'grid';
    }
}

function createCartItem(product) {
    const item = document.createElement('div');
    item.className = 'cart-item-card';
    item.dataset.id = product.id;
    
    const price = product.discount_price || product.actual_price;
    const hasDiscount = product.discount_price && product.discount_price < product.actual_price;
    const discountPercent = hasDiscount ? 
        Math.round((1 - product.discount_price / product.actual_price) * 100) : 0;
    
    const imageUrl = getCartImage(product.id);
    
    item.innerHTML = `
        <div class="cart-item-image-container">
            <img src="${imageUrl}" 
                 alt="${product.name}" 
                 class="cart-item-image"
                 onerror="this.onerror=null; this.src='${PLACEHOLDER_IMAGE}'">
        </div>
        <div class="cart-item-info">
            <h3 class="cart-item-name">${product.name}</h3>
            <div class="product-rating">
                <span class="rating-stars">${generateStarRating(product.rating)}</span>
                <span class="rating-value">${product.rating.toFixed(1)}</span>
            </div>
            <div class="product-price">
                <span class="current-price">${formatPrice(price)}</span>
                ${hasDiscount ? `
                    <span class="old-price">${formatPrice(product.actual_price)}</span>
                    <span class="discount-badge">-${discountPercent}%</span>
                ` : ''}
            </div>
            <div class="quantity-controls">
                <button class="btn btn-secondary decrease-btn" data-id="${product.id}">-</button>
                <span class="quantity">${product.quantity} шт.</span>
                <button class="btn btn-secondary increase-btn" data-id="${product.id}">+</button>
            </div>
            <button class="btn btn-danger remove-btn" data-id="${product.id}">
                <i class="fas fa-trash"></i> Удалить
            </button>
        </div>
    `;
    
    item.querySelector('.decrease-btn').addEventListener('click', () => updateQuantity(product.id, -1));
    item.querySelector('.increase-btn').addEventListener('click', () => updateQuantity(product.id, 1));
    item.querySelector('.remove-btn').addEventListener('click', () => removeFromCartItem(product.id));
    
    return item;
}

function updateQuantity(productId, change) {
    const cart = getCart();
    const itemIndex = cart.findIndex(item => item.id === productId);
    
    if (itemIndex !== -1) {
        cart[itemIndex].quantity += change;
        
        if (cart[itemIndex].quantity <= 0) {
            cart.splice(itemIndex, 1);
        }
        
        saveCart(cart);
        loadCartProducts();
        updateOrderSummary();
        updateCartCount();
    }
}

function removeFromCartItem(productId) {
    removeFromCart(productId);
    loadCartProducts();
    updateOrderSummary();
    updateCartCount();
    showNotification('Товар удален из корзины', 'success');
}

function showEmptyCart() {
    cartItems.innerHTML = '';
    cartItems.style.display = 'none';
    emptyCart.style.display = 'block';
    orderForm.style.display = 'none';
}

function initEventListeners() {
    deliveryDate.addEventListener('change', updateOrderSummary);
    deliveryInterval.addEventListener('change', updateOrderSummary);
    
    if (resetFormBtn) {
        resetFormBtn.addEventListener('click', resetOrderForm);
    }
    
    orderForm.addEventListener('submit', handleOrderSubmit);
}

function updateOrderSummary() {
    const productsSum = cartProducts.reduce((sum, product) => {
        const price = product.discount_price || product.actual_price;
        return sum + (price * product.quantity);
    }, 0);
    
    const deliveryPrice = calculateDeliveryCost(deliveryDate.value, deliveryInterval.value);
    
    productsTotal.textContent = formatPrice(productsSum);
    deliveryCost.textContent = formatPrice(deliveryPrice);
    orderTotal.textContent = formatPrice(productsSum + deliveryPrice);
}

function resetOrderForm() {
    orderForm.reset();
    updateOrderSummary();
    showNotification('Форма сброшена', 'info');
}

async function handleOrderSubmit(e) {
    e.preventDefault();
    
    if (cartProducts.length === 0) {
        showNotification('Корзина пуста', 'error');
        return;
    }
    
    if (!validateOrderForm()) {
        return;
    }
    
    try {
        const orderData = {
            full_name: document.getElementById('full-name').value,
            email: document.getElementById('email').value,
            phone: document.getElementById('phone').value,
            subscribe: document.getElementById('subscribe').checked,
            delivery_address: document.getElementById('delivery-address').value,
            delivery_date: formatDateForAPI(deliveryDate.value),
            delivery_interval: deliveryInterval.value,
            comment: document.getElementById('comment').value || '',
            good_ids: cartProducts.map(product => product.id)
        };
        
        const order = await createOrder(orderData);
        
        showNotification('Заказ успешно оформлен!', 'success');
        
        localStorage.removeItem(CART_STORAGE_KEY);
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
        
    } catch (error) {
        console.error('Ошибка оформления заказа:', error);
        showNotification('Ошибка оформления заказа. Попробуйте еще раз.', 'error');
    }
}

function validateOrderForm() {
    const fullName = document.getElementById('full-name').value.trim();
    const email = document.getElementById('email').value.trim();
    const phone = document.getElementById('phone').value.trim();
    const deliveryAddress = document.getElementById('delivery-address').value.trim();
    const deliveryDateValue = deliveryDate.value;
    const deliveryIntervalValue = deliveryInterval.value;
    
    if (!fullName) {
        showNotification('Введите имя', 'error');
        return false;
    }
    
    if (!isValidEmail(email)) {
        showNotification('Введите корректный email', 'error');
        return false;
    }
    
    if (!isValidPhone(phone)) {
        showNotification('Введите корректный номер телефона', 'error');
        return false;
    }
    
    if (!deliveryAddress) {
        showNotification('Введите адрес доставки', 'error');
        return false;
    }
    
    if (!deliveryDateValue) {
        showNotification('Выберите дату доставки', 'error');
        return false;
    }
    
    if (!deliveryIntervalValue) {
        showNotification('Выберите временной интервал доставки', 'error');
        return false;
    }
    
    return true;
}

function formatDateForAPI(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
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