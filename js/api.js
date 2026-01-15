async function apiRequest(url, method = 'GET', data = null) {
    const headers = { 'Accept': 'application/json' };
    
    let requestUrl = `${API_BASE_URL}${url}`;
    const urlObj = new URL(requestUrl);
    urlObj.searchParams.append('api_key', API_KEY);
    requestUrl = urlObj.toString();
    
    const options = { method, headers };
    
    if (data) {
        if (data instanceof FormData) {
            options.body = data;
        } else {
            headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(data);
        }
    }
    
    try {
        const response = await fetch(requestUrl, options);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP error ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API request failed:', error);
        showNotification(`Ошибка: ${error.message}`, 'error');
        throw error;
    }
}

async function getGoods(params = {}) {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            queryParams.append(key, value);
        }
    });
    
    const url = `/exam-2024-1/api/goods${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
    return await apiRequest(url);
}

async function getGood(goodId) {
    return await apiRequest(`/exam-2024-1/api/goods/${goodId}`);
}

async function getAutocompleteSuggestions(query) {
    if (!query || query.length < 2) return [];
    
    const url = `/exam-2024-1/api/autocomplete?query=${encodeURIComponent(query)}`;
    return await apiRequest(url);
}

async function getOrders() {
    return await apiRequest('/exam-2024-1/api/orders');
}

async function getOrder(orderId) {
    return await apiRequest(`/exam-2024-1/api/orders/${orderId}`);
}

async function createOrder(orderData) {
    return await apiRequest('/exam-2024-1/api/orders', 'POST', orderData);
}

async function updateOrder(orderId, orderData) {
    return await apiRequest(`/exam-2024-1/api/orders/${orderId}`, 'PUT', orderData);
}

async function deleteOrder(orderId) {
    return await apiRequest(`/exam-2024-1/api/orders/${orderId}`, 'DELETE');
}