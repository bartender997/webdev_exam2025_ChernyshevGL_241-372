const ordersList = document.getElementById('orders-list');
const noOrders = document.getElementById('no-orders');
const viewOrderModal = document.getElementById('view-order-modal');
const editOrderModal = document.getElementById('edit-order-modal');
const deleteOrderModal = document.getElementById('delete-order-modal');
const closeModalButtons = document.querySelectorAll('.close-modal');
const closeViewModalBtn = document.querySelector('.close-view-modal');
const closeEditModalBtn = document.querySelector('.close-edit-modal');
const closeDeleteModalBtn = document.querySelector('.close-delete-modal');
const editOrderForm = document.getElementById('edit-order-form');

let currentOrders = [];
let currentOrderId = null;
let allGoods = [];

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadOrders();
        await loadAllGoods();
        updateCartCount();
        initEventListeners();
    } catch (error) {
        console.error('Ошибка инициализации ЛК:', error);
        showNotification('Ошибка загрузки заказов', 'error');
    }
});

async function loadOrders() {
    try {
        currentOrders = await getOrders();
        
        if (currentOrders.length === 0) {
            showNoOrders();
        } else {
            renderOrders();
        }
        
    } catch (error) {
        console.error('Ошибка загрузки заказов:', error);
        showNotification('Ошибка загрузки заказов', 'error');
    }
}

async function loadAllGoods() {
    try {
        allGoods = await getGoods({ per_page: 1000 });
    } catch (error) {
        console.error('Ошибка загрузки товаров:', error);
    }
}

function renderOrders() {
    ordersList.innerHTML = '';
    
    currentOrders.forEach((order, index) => {
        const orderRow = createOrderRow(order, index + 1);
        ordersList.appendChild(orderRow);
    });
    
    ordersList.style.display = 'table-row-group';
    noOrders.style.display = 'none';
}

function createOrderRow(order, index) {
    const row = document.createElement('tr');
    row.dataset.id = order.id;
    
    const createdAt = new Date(order.created_at);
    const formattedDate = `${createdAt.toLocaleDateString('ru-RU')} ${createdAt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`;
    
    const orderItems = getOrderItemsNames(order.good_ids);
    const orderTotal = calculateOrderTotal(order.good_ids);
    const deliveryDate = formatDate(order.delivery_date);
    
    row.innerHTML = `
        <td>${index}</td>
        <td>${formattedDate}</td>
        <td>${orderItems}</td>
        <td>${formatPrice(orderTotal)}</td>
        <td>${deliveryDate}<br>${order.delivery_interval}</td>
        <td>
            <div class="order-actions">
                <button class="action-btn view-btn" title="Просмотр" data-id="${order.id}">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="action-btn edit-btn" title="Редактировать" data-id="${order.id}">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete-btn delete" title="Удалить" data-id="${order.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </td>
    `;
    
    row.querySelector('.view-btn').addEventListener('click', () => openViewOrderModal(order.id));
    row.querySelector('.edit-btn').addEventListener('click', () => openEditOrderModal(order.id));
    row.querySelector('.delete-btn').addEventListener('click', () => openDeleteOrderModal(order.id));
    
    return row;
}

function getOrderItemsNames(goodIds) {
    if (!goodIds || goodIds.length === 0) return 'Нет товаров';
    
    const itemNames = goodIds.map(id => {
        const good = allGoods.find(g => g.id === id);
        return good ? good.name.substring(0, 30) + (good.name.length > 30 ? '...' : '') : `Товар #${id}`;
    });
    
    return itemNames.join(', ');
}

function calculateOrderTotal(goodIds) {
    if (!goodIds || goodIds.length === 0) return 0;
    
    return goodIds.reduce((total, id) => {
        const good = allGoods.find(g => g.id === id);
        if (good) {
            return total + (good.discount_price || good.actual_price);
        }
        return total;
    }, 200);
}

function formatDate(dateString) {
    if (!dateString) return 'Не указана';
    
    const parts = dateString.split('.');
    if (parts.length === 3) {
        const date = new Date(parts[2], parts[1] - 1, parts[0]);
        return date.toLocaleDateString('ru-RU');
    }
    
    return dateString;
}

function showNoOrders() {
    ordersList.style.display = 'none';
    noOrders.style.display = 'block';
}

function initEventListeners() {
    closeModalButtons.forEach(button => {
        button.addEventListener('click', closeAllModals);
    });
    
    if (closeViewModalBtn) {
        closeViewModalBtn.addEventListener('click', closeAllModals);
    }
    
    if (closeEditModalBtn) {
        closeEditModalBtn.addEventListener('click', closeAllModals);
    }
    
    if (closeDeleteModalBtn) {
        closeDeleteModalBtn.addEventListener('click', closeAllModals);
    }
    
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeAllModals();
        }
    });
    
    editOrderForm.addEventListener('submit', handleEditOrderSubmit);
    
    document.getElementById('confirm-delete').addEventListener('click', handleDeleteOrder);
}

async function openViewOrderModal(orderId) {
    try {
        const order = await getOrder(orderId);
        const orderTotal = calculateOrderTotal(order.good_ids);
        
        const modalContent = document.getElementById('view-order-content');
        modalContent.innerHTML = `
            <div class="order-details">
                <div class="order-detail-row">
                    <span class="order-detail-label">Дата оформления:</span>
                    <span class="order-detail-value">${new Date(order.created_at).toLocaleString('ru-RU')}</span>
                </div>
                <div class="order-detail-row">
                    <span class="order-detail-label">Имя:</span>
                    <span class="order-detail-value">${order.full_name}</span>
                </div>
                <div class="order-detail-row">
                    <span class="order-detail-label">Номер телефона:</span>
                    <span class="order-detail-value">${order.phone}</span>
                </div>
                <div class="order-detail-row">
                    <span class="order-detail-label">Email:</span>
                    <span class="order-detail-value">${order.email}</span>
                </div>
                <div class="order-detail-row">
                    <span class="order-detail-label">Адрес доставки:</span>
                    <span class="order-detail-value">${order.delivery_address}</span>
                </div>
                <div class="order-detail-row">
                    <span class="order-detail-label">Дата доставки:</span>
                    <span class="order-detail-value">${formatDate(order.delivery_date)}</span>
                </div>
                <div class="order-detail-row">
                    <span class="order-detail-label">Время доставки:</span>
                    <span class="order-detail-value">${order.delivery_interval}</span>
                </div>
                <div class="order-detail-row">
                    <span class="order-detail-label">Состав заказа:</span>
                    <div class="order-detail-value">
                        <div class="order-items-list">${getOrderItemsList(order.good_ids)}</div>
                    </div>
                </div>
                <div class="order-detail-row">
                    <span class="order-detail-label">Стоимость:</span>
                    <span class="order-detail-value">${formatPrice(orderTotal)}</span>
                </div>
                ${order.comment ? `
                <div class="order-detail-row">
                    <span class="order-detail-label">Комментарий:</span>
                    <span class="order-detail-value">${order.comment}</span>
                </div>
                ` : ''}
            </div>
        `;
        
        viewOrderModal.style.display = 'flex';
        currentOrderId = orderId;
        
    } catch (error) {
        console.error('Ошибка загрузки заказа:', error);
        showNotification('Ошибка загрузки данных заказа', 'error');
    }
}

function getOrderItemsList(goodIds) {
    if (!goodIds || goodIds.length === 0) return 'Нет товаров';
    
    return goodIds.map(id => {
        const good = allGoods.find(g => g.id === id);
        return `<div>• ${good ? good.name : `Товар #${id}`}</div>`;
    }).join('');
}

async function openEditOrderModal(orderId) {
    try {
        const order = await getOrder(orderId);
        const orderTotal = calculateOrderTotal(order.good_ids);
        
        document.getElementById('edit-created-at').value = new Date(order.created_at).toLocaleString('ru-RU');
        document.getElementById('edit-full-name').value = order.full_name;
        document.getElementById('edit-phone').value = order.phone;
        document.getElementById('edit-email').value = order.email;
        document.getElementById('edit-delivery-address').value = order.delivery_address;
        
        const [day, month, year] = order.delivery_date.split('.');
        document.getElementById('edit-delivery-date').value = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        
        document.getElementById('edit-delivery-interval').value = order.delivery_interval;
        document.getElementById('edit-order-total').value = formatPrice(orderTotal);
        document.getElementById('edit-comment').value = order.comment || '';
        
        const orderItemsList = document.getElementById('edit-order-items');
        orderItemsList.innerHTML = getOrderItemsList(order.good_ids);
        
        editOrderModal.style.display = 'flex';
        currentOrderId = orderId;
        
    } catch (error) {
        console.error('Ошибка загрузки заказа:', error);
        showNotification('Ошибка загрузки данных заказа', 'error');
    }
}

async function handleEditOrderSubmit(e) {
    e.preventDefault();
    
    if (!currentOrderId) return;
    
    try {
        const editData = {
            full_name: document.getElementById('edit-full-name').value,
            phone: document.getElementById('edit-phone').value,
            email: document.getElementById('edit-email').value,
            delivery_address: document.getElementById('edit-delivery-address').value,
            delivery_date: formatDateForAPI(document.getElementById('edit-delivery-date').value),
            delivery_interval: document.getElementById('edit-delivery-interval').value,
            comment: document.getElementById('edit-comment').value || ''
        };
        
        const updatedOrder = await updateOrder(currentOrderId, editData);
        
        await loadOrders();
        
        closeAllModals();
        
        showNotification('Заказ успешно обновлен', 'success');
        
    } catch (error) {
        console.error('Ошибка обновления заказа:', error);
        showNotification('Ошибка обновления заказа', 'error');
    }
}

function openDeleteOrderModal(orderId) {
    deleteOrderModal.style.display = 'flex';
    currentOrderId = orderId;
}

async function handleDeleteOrder() {
    if (!currentOrderId) return;
    
    try {
        await deleteOrder(currentOrderId);
        
        await loadOrders();
        
        closeAllModals();
        
        showNotification('Заказ успешно удален', 'success');
        
    } catch (error) {
        console.error('Ошибка удаления заказа:', error);
        showNotification('Ошибка удаления заказа', 'error');
    }
}

function closeAllModals() {
    viewOrderModal.style.display = 'none';
    editOrderModal.style.display = 'none';
    deleteOrderModal.style.display = 'none';
    currentOrderId = null;
}