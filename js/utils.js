const API_BASE_URL = 'https://edu.std-900.ist.mospolytech.ru';
const API_KEY = '6ed4dbd6-6e6e-4ed2-9f19-90d8267518b6'; 
const CART_STORAGE_KEY = 'techshop_cart';


const LOCAL_PRODUCT_IMAGES = [
    'images/products/1.jpg',
    'images/products/2.jpg',
    'images/products/3.jpg',
    'images/products/4.jpg',
    'images/products/5.jpg',
    'images/products/6.jpg',
    'images/products/7.jpg',
    'images/products/8.jpg',
    'images/products/9.jpg',
    'images/products/10.jpg'
];

const PLACEHOLDER_IMAGE = 'images/placeholder.jpg';

function getProductImage(productId) {
    const id = parseInt(productId);
    
    if (isNaN(id) || id <= 0) {
        return PLACEHOLDER_IMAGE;
    }
    
    const imageIndex = (id - 1) % LOCAL_PRODUCT_IMAGES.length;
    return LOCAL_PRODUCT_IMAGES[imageIndex];
}

function getCartImage(productId) {
    return getProductImage(productId);
}

function getPlaceholderImage() {
    return PLACEHOLDER_IMAGE;
}


function showNotification(message, type = 'info', duration = 5000) {
    const notificationArea = document.getElementById('notification-area');
    if (!notificationArea) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    notificationArea.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, duration);
}

function formatPrice(price) {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 0
    }).format(price);
}

function updateCartCount() {
    const cartCountElement = document.getElementById('cart-count');
    if (!cartCountElement) return;
    
    const cart = getCart();
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCountElement.textContent = totalItems;
}

function getCart() {
    const cartJson = localStorage.getItem(CART_STORAGE_KEY);
    return cartJson ? JSON.parse(cartJson) : [];
}

function saveCart(cart) {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

function addToCart(product) {
    const cart = getCart();
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            quantity: 1,
            name: product.name,
            price: product.discount_price || product.actual_price
        });
    }
    
    saveCart(cart);
    updateCartCount();
    showNotification('Товар добавлен в корзину', 'success');
}

function removeFromCart(productId) {
    let cart = getCart();
    cart = cart.filter(item => item.id !== productId);
    saveCart(cart);
    updateCartCount();
}

function calculateDeliveryCost(date, interval) {
    if (!date || !interval) return 200;
    
    const deliveryDate = new Date(date);
    const dayOfWeek = deliveryDate.getDay();
    const [startTime] = interval.split('-').map(time => parseInt(time.split(':')[0]));
    
    let cost = 200;
    
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        cost += 300;
    }
    
    if (startTime >= 18 && dayOfWeek >= 1 && dayOfWeek <= 5) {
        cost += 200;
    }
    
    return cost;
}

function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function isValidPhone(phone) {
    const re = /^[\d\s\-+()]{10,}$/;
    return re.test(phone);
}

function debounce(func, delay) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
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

function formatDateForAPI(dateString) {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
}