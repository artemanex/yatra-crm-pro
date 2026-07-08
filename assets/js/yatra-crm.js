// ============================================================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ============================================================
var yatraCurrentTripId = null;
var yatraCurrentAvailabilityId = null;
var yatraCurrentDateStr = null;
var yatraCurrentDepartureTime = null;
var yatraCurrentArrivalDate = null;
var yatraCurrentPrice = 0;
var yatraCurrentCurrency = '₽';
var yatraCurrentAvailData = null;
var yatraCurrentAvailableSeats = 0;
var yatraDebugInfo = [];

// Данные из wp_localize_script
var yatra = window.yatra_ajax || {};
var ajaxurl = yatra.ajaxurl || '/wp-admin/admin-ajax.php';
var nonce = yatra.nonce || '';

// ============================================================
// ЛОГИРОВАНИЕ В КОНСОЛЬ И В CRM
// ============================================================
console.log('=== YATRA CRM INIT ===');
console.log('ajaxurl:', ajaxurl);
console.log('nonce:', nonce);
console.log('user_logged_in:', yatra.user_logged_in);

function yatraLog(msg, type) {
    var logEl = document.getElementById('yatra-log');
    if (!logEl) {
        console.log('YATRA LOG:', msg);
        return;
    }
    
    var time = new Date().toLocaleTimeString();
    var typeClass = type || 'info';
    
    logEl.innerHTML += '<div class="log-entry">' +
        '<span class="log-time">[' + time + ']</span>' +
        '<span class="log-msg ' + typeClass + '">' + msg + '</span>' +
        '</div>';
    logEl.scrollTop = logEl.scrollHeight;
    
    yatraDebugInfo.push({ time: time, msg: msg, type: typeClass });
    console.log('[' + time + '] ' + msg);
}

// ============================================================
// СООБЩЕНИЯ
// ============================================================
function yatraShowMessage(id, type, msg) {
    var el = document.getElementById(id);
    if (!el) return;
    
    el.className = 'yatra-msg ' + type;
    el.innerHTML = msg;
    
    clearTimeout(el._timeout);
    el._timeout = setTimeout(function() {
        el.className = 'yatra-msg';
        el.innerHTML = '';
    }, 5000);
}

// ============================================================
// МОДАЛЬНОЕ ОКНО
// ============================================================
function yatraOpenModal(title, content) {
    var modal = document.getElementById('yatra-modal');
    var titleEl = document.getElementById('yatra-modal-title');
    var bodyEl = document.getElementById('yatra-modal-body');
    
    titleEl.textContent = title;
    bodyEl.innerHTML = content;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    yatraLog('📂 Открыто модальное окно: ' + title);
}

function yatraCloseModal() {
    var modal = document.getElementById('yatra-modal');
    modal.classList.remove('active');
    document.body.style.overflow = '';
}

document.addEventListener('DOMContentLoaded', function() {
    var modal = document.getElementById('yatra-modal');
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) yatraCloseModal();
        });
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') yatraCloseModal();
        });
    }
});

// ============================================================
// ПЕРЕКЛЮЧЕНИЕ ТАБОВ
// ============================================================
function yatraSwitchTab(tabId) {
    document.querySelectorAll('.yatra-tab').forEach(function(tab) {
        tab.classList.remove('active');
    });
    document.querySelector('.yatra-tab[data-tab="' + tabId + '"]').classList.add('active');
    
    document.querySelectorAll('.yatra-tab-content').forEach(function(content) {
        content.classList.remove('active');
    });
    document.getElementById('tab-' + tabId).classList.add('active');
    
    yatraLog('🔄 Переключено на вкладку: ' + tabId);
    
    if (tabId === 'account') yatraLoadAccountData();
    if (tabId === 'bookings') yatraLoadMyBookings();
    if (tabId === 'payments') yatraLoadMyPayments();
}

// ============================================================
// ЗАГРУЗКА ТУРОВ
// ============================================================
function yatraLoadTrips(status, search) {
    status = status || 'publish';
    search = search || '';
    
    var container = document.getElementById('trips-list');
    container.innerHTML = '<div class="yatra-loading"><div class="spinner"></div> Загрузка туров...</div>';
    yatraLog('📋 Загрузка туров (статус: ' + status + ')');

    console.log('YATRA: Sending trips request');
    console.log('YATRA: nonce =', nonce);

    var form = new FormData();
    form.append('action', 'yatra_trips');
    form.append('nonce', nonce);
    form.append('status', status);
    form.append('search', search);

    fetch(ajaxurl, { 
        method: 'POST', 
        credentials: 'include', 
        body: form
    })
    .then(function(r) { 
        console.log('YATRA: Response status:', r.status);
        return r.json(); 
    })
    .then(function(r) {
        console.log('YATRA: Trips response:', r);
        
        if (r.success === false) {
            console.error('YATRA: Server error:', r.data);
            container.innerHTML = '<div class="yatra-empty" style="color:var(--danger);"><i class="fas fa-exclamation-triangle"></i><h3>Ошибка</h3><p>' + (r.data?.message || 'Неизвестная ошибка') + '</p></div>';
            yatraLog('❌ Ошибка: ' + (r.data?.message || 'Неизвестная ошибка'), 'error');
            return;
        }
        
        var trips = null;
        
        if (r.success && r.data && r.data.data && r.data.data.data) {
            trips = r.data.data.data;
        } else if (r.success && r.data && r.data.data) {
            trips = r.data.data;
        } else if (r.success && r.data && Array.isArray(r.data)) {
            trips = r.data;
        } else if (r.success && r.data) {
            trips = r.data;
        }

        console.log('YATRA: Parsed trips:', trips);

        if (trips && trips.length > 0) {
            var filteredTrips = trips.filter(function(trip) {
                if (status === 'all') return true;
                return trip.status === status;
            });
            
            if (filteredTrips.length === 0) {
                container.innerHTML = '<div class="yatra-empty"><i class="fas fa-search"></i><h3>Туры не найдены</h3><p>Попробуйте изменить фильтры</p></div>';
                yatraLog('⚠️ Туры со статусом "' + status + '" не найдены', 'warning');
                return;
            }
            
            var html = '<div class="yatra-trips-grid">';
            for (var i = 0; i < filteredTrips.length; i++) {
                var trip = filteredTrips[i];
                var title = trip.title || 'Без названия';
                var price = trip.original_price || '0';
                var salePrice = trip.sale_price || trip.discounted_price || null;
                var id = trip.id || 0;
                var location = trip.starting_location || '';
                var tripStatus = trip.status || 'draft';
                var permalink = trip.permalink || '';
                var image = trip.featured_image_url || trip.featured_image || '';
                
                var displayPrice = salePrice ? 
                    salePrice + ' ₽ <span class="old">' + price + ' ₽</span>' :
                    price + ' ₽';
                
                var statusMap = {
                    'publish': '✅ Опубликован',
                    'draft': '📝 Черновик',
                    'pending': '⏳ На модерации'
                };
                var statusLabel = statusMap[tripStatus] || tripStatus;
                
                var imageHtml = image ? 
                    '<img src="' + image + '" alt="' + title + '" loading="lazy">' :
                    '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--gray-400);font-size:48px;"><i class="fas fa-mountain"></i></div>';
                
                html += '<div class="yatra-trip-card">';
                html += '<div class="yatra-trip-image">';
                html += imageHtml;
                html += '<span class="status-badge ' + tripStatus + '">' + statusLabel + '</span>';
                html += '</div>';
                html += '<div class="yatra-trip-body">';
                html += '<h3>' + title + '</h3>';
                if (permalink) {
                    html += '<a href="' + permalink + '" target="_blank" class="trip-link"><i class="fas fa-external-link-alt"></i> Открыть тур</a>';
                }
                html += '<div class="price">' + displayPrice + '</div>';
                if (location) {
                    html += '<div class="meta"><i class="fas fa-map-marker-alt"></i> ' + location + '</div>';
                }
                html += '<div class="meta"><i class="fas fa-hashtag"></i> ID: ' + id + '</div>';
                html += '<div class="actions">';
                html += '<button class="yatra-btn yatra-btn-primary yatra-btn-sm" onclick="yatraShowTripDetails(' + id + ')"><i class="fas fa-info-circle"></i> Детали</button>';
                html += '<button class="yatra-btn yatra-btn-success yatra-btn-sm" onclick="yatraShowAvailability(' + id + ')"><i class="fas fa-calendar-alt"></i> Даты</button>';
                html += '</div>';
                html += '</div>';
                html += '</div>';
            }
            html += '</div>';
            container.innerHTML = html;
            yatraLog('✅ Загружено ' + filteredTrips.length + ' туров', 'success');
        } else {
            container.innerHTML = '<div class="yatra-empty"><i class="fas fa-mountain"></i><h3>Туры не найдены</h3><p>Попробуйте изменить фильтры</p></div>';
            yatraLog('⚠️ Туры не найдены', 'warning');
        }
    })
    .catch(function(error) {
        console.error('YATRA: Fetch error:', error);
        container.innerHTML = '<div class="yatra-empty" style="color:var(--danger);"><i class="fas fa-exclamation-triangle"></i><h3>Ошибка загрузки</h3><p>' + error.message + '</p></div>';
        yatraLog('❌ Ошибка загрузки туров: ' + error.message, 'error');
    });
}

// ============================================================
// ДЕТАЛИ ТУРА
// ============================================================
function yatraShowTripDetails(tripId) {
    yatraLog('📄 Загрузка деталей тура #' + tripId);
    
    var form = new FormData();
    form.append('action', 'yatra_trip_details');
    form.append('nonce', nonce);
    form.append('trip_id', tripId);

    fetch(ajaxurl, { method: 'POST', credentials: 'include', body: form })
    .then(function(r) { return r.json(); })
    .then(function(r) {
        console.log('YATRA: Trip details response:', r);
        var data = r.data?.data || r.data;
        var html = yatraFormatTripDetails(data);
        yatraOpenModal('📋 Детали тура #' + tripId, html);
        yatraLog('✅ Детали тура #' + tripId + ' загружены', 'success');
    })
    .catch(function(error) {
        yatraLog('❌ Ошибка загрузки деталей: ' + error.message, 'error');
        yatraShowMessage('global-msg', 'error', '❌ Ошибка загрузки деталей тура');
    });
}

function yatraFormatTripDetails(data) {
    var html = '<div style="display:grid;gap:12px;">';
    
    var fields = {
        'title': '📝 Название',
        'slug': '🔗 ЧПУ',
        'permalink': '🔗 Ссылка',
        'short_description': '📝 Краткое описание',
        'description': '📄 Полное описание',
        'starting_location': '📍 Место начала',
        'ending_location': '📍 Место окончания',
        'trip_type': '🏷️ Тип тура',
        'duration_days': '📅 Дней',
        'duration_nights': '🌙 Ночей',
        'original_price': '💵 Цена',
        'sale_price': '🏷️ Цена со скидкой',
        'discounted_price': '🏷️ Цена со скидкой',
        'deposit_amount': '💳 Депозит',
        'min_travelers': '👤 Мин. человек',
        'max_travelers': '👥 Макс. человек',
        'difficulty_level': '📊 Сложность',
        'status': '📌 Статус',
        'featured': '⭐ Избранный',
        'views_count': '👁️ Просмотры',
        'bookings_count': '📋 Бронирований',
        'avg_rating': '⭐ Рейтинг',
        'reviews_count': '📝 Отзывов',
        'created_at': '📅 Создан',
        'updated_at': '📅 Обновлен'
    };

    for (var key in fields) {
        if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
            var value = data[key];
            var label = fields[key];
            
            if (key === 'status') {
                var statusMap = {
                    'publish': '✅ Опубликован',
                    'draft': '📝 Черновик',
                    'pending': '⏳ На модерации'
                };
                value = statusMap[value] || value;
            }
            
            if (key === 'featured') {
                value = value ? '⭐ Да' : '❌ Нет';
            }
            
            if (key === 'difficulty_level') {
                var diffMap = {
                    'easy': '🟢 Легкий',
                    'medium': '🟡 Средний',
                    'hard': '🔴 Сложный'
                };
                value = diffMap[value] || value;
            }
            
            if (key === 'trip_type') {
                var typeMap = {
                    'multi_day': '📅 Многодневный',
                    'single_day': '☀️ Однодневный'
                };
                value = typeMap[value] || value;
            }
            
            if (key === 'description' || key === 'short_description') {
                if (typeof value === 'string' && value.length > 500) {
                    value = value.substring(0, 500) + '...';
                }
                value = '<div style="max-height:150px;overflow-y:auto;background:var(--gray-50);padding:12px;border-radius:var(--radius-sm);font-size:13px;line-height:1.6;">' + value + '</div>';
            }
            
            if (key === 'permalink' && typeof value === 'string' && value !== '') {
                value = '<a href="' + value + '" target="_blank" style="color:var(--primary);text-decoration:none;">' + value + ' <i class="fas fa-external-link-alt"></i></a>';
            }
            
            if ((key === 'original_price' || key === 'sale_price' || key === 'discounted_price' || key === 'deposit_amount') && typeof value === 'number') {
                value = value.toLocaleString('ru-RU') + ' ₽';
            }
            
            html += '<div style="display:flex;justify-content:space-between;padding:8px 12px;background:var(--gray-50);border-radius:var(--radius-sm);flex-wrap:wrap;gap:4px;">';
            html += '<span style="font-weight:600;color:var(--gray-700);">' + label + '</span>';
            html += '<span style="color:var(--gray-900);word-break:break-word;max-width:70%;text-align:right;">' + value + '</span>';
            html += '</div>';
        }
    }
    
    html += '</div>';
    return html;
}

// ============================================================
// ДОСТУПНЫЕ ДАТЫ
// ============================================================
function yatraShowAvailability(tripId) {
    yatraLog('📅 Загрузка дат для тура #' + tripId);
    
    var form = new FormData();
    form.append('action', 'yatra_trip_availability');
    form.append('nonce', nonce);
    form.append('trip_id', tripId);

    fetch(ajaxurl, { method: 'POST', credentials: 'include', body: form })
    .then(function(r) { return r.json(); })
    .then(function(r) {
        console.log('YATRA: Availability response:', r);
        var data = r.data?.data || r.data;
        yatraCurrentAvailData = data.dates || data.data || data;
        if (!Array.isArray(yatraCurrentAvailData)) {
            yatraCurrentAvailData = [];
        }
        var html = yatraFormatAvailability(data, tripId);
        yatraOpenModal('📅 Доступные даты тура #' + tripId, html);
        yatraLog('✅ Даты для тура #' + tripId + ' загружены', 'success');
    })
    .catch(function(error) {
        yatraLog('❌ Ошибка загрузки дат: ' + error.message, 'error');
        yatraShowMessage('global-msg', 'error', '❌ Ошибка загрузки дат');
    });
}

function yatraFormatAvailability(data, tripId) {
    var dates = null;
    var total = 0;
    
    if (data && data.dates && Array.isArray(data.dates)) {
        dates = data.dates;
        total = data.total || data.dates.length;
    } else if (data && data.data && Array.isArray(data.data)) {
        dates = data.data;
        total = data.total || data.data.length;
    } else if (data && Array.isArray(data)) {
        dates = data;
        total = data.length;
    }
    
    if (!dates || dates.length === 0) {
        return '<div class="yatra-empty"><i class="fas fa-calendar-times"></i><h3>Нет доступных дат</h3><p>Для этого тура пока нет дат</p></div>';
    }
    
    dates.sort(function(a, b) {
        var dateA = new Date(a.departure_date || a.date || a);
        var dateB = new Date(b.departure_date || b.date || b);
        return dateA - dateB;
    });
    
    var html = '<div class="yatra-availability-grid">';
    html += '<div style="font-size:14px;color:var(--gray-500);margin-bottom:8px;">Всего: ' + total + ' дат</div>';
    
    for (var i = 0; i < dates.length; i++) {
        var item = dates[i];
        var departureDate = item.departure_date || item.date || item;
        var arrivalDate = item.arrival_date || '';
        var status = item.status || 'available';
        var price = item.discounted_price || item.original_price || '';
        var originalPrice = item.original_price || '';
        var availableSeats = item.seats_available || item.available_seats || 0;
        var totalSeats = item.seats_total || item.total_seats || 0;
        var fromLocation = item.from_location || '';
        var toLocation = item.to_location || '';
        var availabilityId = item.id || i;
        var departureTime = item.departure_time || '';
        var priceTypes = item.price_types || [];
        
        var dateStr = '';
        if (departureDate) {
            var dateObj = new Date(departureDate);
            dateStr = dateObj.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        }
        
        var arrivalStr = '';
        if (arrivalDate && arrivalDate !== departureDate) {
            var arrObj = new Date(arrivalDate);
            arrivalStr = arrObj.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
        }
        
        var statusMap = {
            'available': { text: '✅ Доступно', class: 'available' },
            'booked': { text: '❌ Забронировано', class: 'booked' },
            'limited': { text: '⚠️ Мало мест', class: 'limited' },
            'closed': { text: '🚫 Закрыто', class: 'closed' }
        };
        var statusInfo = statusMap[status] || statusMap['available'];
        
        var seatsColor = availableSeats <= 2 ? 'var(--danger)' : availableSeats <= 5 ? 'var(--warning)' : 'var(--success)';
        var canBook = status === 'available' || status === 'limited';
        
        html += '<div class="yatra-availability-item">';
        html += '<div class="date-info">';
        html += '<span class="date"><i class="fas fa-calendar-day"></i> ' + dateStr;
        if (arrivalStr) {
            html += ' → ' + arrivalStr;
        }
        if (departureTime) {
            html += ' 🕐 ' + departureTime;
        }
        html += '</span>';
        if (fromLocation) {
            html += '<span class="location"><i class="fas fa-map-marker-alt"></i> ' + fromLocation;
            if (toLocation) html += ' → ' + toLocation;
            html += '</span>';
        }
        html += '</div>';
        html += '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">';
        if (availableSeats !== undefined) {
            html += '<span class="seats" style="color:' + seatsColor + ';"><i class="fas fa-users"></i> ' + availableSeats + '/' + totalSeats + '</span>';
        }
        if (price && price > 0) {
            html += '<span class="price-info">';
            if (originalPrice && originalPrice !== price) {
                html += price + ' ₽ <span style="text-decoration:line-through;color:var(--gray-400);font-weight:400;font-size:13px;">' + originalPrice + ' ₽</span>';
            } else {
                html += price + ' ₽';
            }
            html += '</span>';
        }
        html += '<span class="status-badge ' + statusInfo.class + '">' + statusInfo.text + '</span>';
        
        if (canBook) {
            var arrivalDateStr = arrivalDate ? new Date(arrivalDate).toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }) : '';
            html += '<button class="book-btn" onclick="yatraOpenBookingForm(' + tripId + ', ' + availabilityId + ', \'' + dateStr + '\', \'' + departureTime + '\', \'' + encodeURIComponent(JSON.stringify(priceTypes)) + '\', \'' + arrivalDateStr + '\', ' + availableSeats + ')">';
            html += '<i class="fas fa-shopping-cart"></i> Забронировать';
            html += '</button>';
        }
        
        html += '</div>';
        html += '</div>';
    }
    
    html += '</div>';
    return html;
}

// ============================================================
// ПОЛУЧЕНИЕ ДАННЫХ ПОЛЬЗОВАТЕЛЯ
// ============================================================
function yatraGetUserData() {
    return new Promise(function(resolve, reject) {
        var form = new FormData();
        form.append('action', 'yatra_account_data');
        form.append('nonce', nonce);

        fetch(ajaxurl, { method: 'POST', credentials: 'include', body: form })
        .then(function(r) { return r.json(); })
        .then(function(r) {
            console.log('YATRA: User data response:', r);
            var data = r.data?.data || r.data;
            var userData = data.data || data;
            
            var contactData = {
                first_name: userData.first_name || '',
                last_name: userData.last_name || '',
                email: userData.email || '',
                phone: userData.phone || '',
                address: userData.address || '',
                city: userData.city || '',
                state: userData.state || '',
                zip: userData.zip || '',
                country: userData.country || 'US'
            };
            
            resolve(contactData);
        })
        .catch(function(error) {
            reject(error);
        });
    });
}

// ============================================================
// ОТКРЫТИЕ ФОРМЫ БРОНИРОВАНИЯ
// ============================================================
function yatraOpenBookingForm(tripId, availabilityId, dateStr, departureTime, priceTypesJson, arrivalDateStr, availableSeats) {
    yatraLog('📝 Открытие формы бронирования для даты ' + dateStr);
    
    yatraCurrentTripId = tripId;
    yatraCurrentAvailabilityId = availabilityId;
    yatraCurrentDateStr = dateStr;
    yatraCurrentDepartureTime = departureTime || '';
    yatraCurrentArrivalDate = arrivalDateStr || '';
    yatraCurrentAvailableSeats = availableSeats || 0;
    
    var price = 0;
    var currency = '₽';
    
    var availItems = document.querySelectorAll('.yatra-availability-item');
    for (var i = 0; i < availItems.length; i++) {
        var item = availItems[i];
        var btn = item.querySelector('.book-btn');
        if (btn) {
            var onclickAttr = btn.getAttribute('onclick');
            var matches = onclickAttr.match(/yatraOpenBookingForm\((\d+),\s*(\d+)/);
            if (matches && parseInt(matches[1]) === tripId && parseInt(matches[2]) === availabilityId) {
                var priceEl = item.querySelector('.price-info');
                if (priceEl) {
                    var priceText = priceEl.textContent.trim();
                    var priceMatch = priceText.match(/([\d\s,]+)\s*₽/);
                    if (priceMatch) {
                        price = parseFloat(priceMatch[1].replace(/\s/g, '').replace(/,/g, '.'));
                        currency = '₽';
                    }
                }
                break;
            }
        }
    }
    
    if (price === 0 && yatraCurrentAvailData) {
        for (var i = 0; i < yatraCurrentAvailData.length; i++) {
            if (yatraCurrentAvailData[i].id == availabilityId) {
                price = yatraCurrentAvailData[i].discounted_price || yatraCurrentAvailData[i].original_price || 0;
                currency = yatraCurrentAvailData[i].currency || '₽';
                break;
            }
        }
    }
    
    yatraCurrentPrice = price;
    yatraCurrentCurrency = currency;
    
    yatraLog('💰 Цена за человека: ' + price + ' ' + currency);
    yatraLog('💺 Свободных мест: ' + availableSeats);
    
    var html = '';
    html += '<div class="yatra-booking-form">';
    
    html += '<div class="yatra-booking-info">';
    html += '<i class="fas fa-info-circle"></i>';
    html += '<div><strong>Бронирование тура</strong><br>';
    html += '📅 Дата: <strong>' + dateStr + '</strong>';
    if (departureTime) {
        html += ' 🕐 <strong>' + departureTime + '</strong>';
    }
    if (arrivalDateStr) {
        html += '<br>📅 Дата возврата: <strong>' + arrivalDateStr + '</strong>';
    }
    html += '<br>💰 Цена за человека: <strong>' + price + ' ' + currency + '</strong>';
    html += '<br>💺 Свободных мест: <strong>' + availableSeats + '</strong>';
    html += '</div>';
    html += '</div>';
    
    html += '<div class="yatra-booking-row">';
    html += '<div class="field">';
    html += '<label><i class="fas fa-users"></i> Количество путешественников:</label>';
    html += '<input type="number" id="traveler-count" value="1" min="1" max="' + Math.min(availableSeats || 20, 20) + '" onchange="yatraUpdateTravelerFields()" oninput="yatraUpdateTravelerFields()">';
    html += '<small style="color:var(--gray-500);">Максимум: ' + Math.min(availableSeats || 20, 20) + ' мест</small>';
    html += '</div>';
    html += '</div>';
    
    html += '<div id="traveler-fields-container" style="margin-top:10px;"></div>';
    
    html += '<div id="booking-calculation" style="background:#f8fafc;padding:16px;border-radius:8px;border:1px solid #e2e8f0;margin-top:10px;">';
    html += '<h4 style="margin:0 0 12px 0;font-size:15px;">💰 Калькуляция бронирования</h4>';
    html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #e2e8f0;">';
    html += '<span>Общая сумма брони:</span>';
    html += '<span id="calc-total-amount" style="font-weight:600;">0 ' + currency + '</span>';
    html += '</div>';
    html += '<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #e2e8f0;">';
    html += '<span>Комиссия (10%):</span>';
    html += '<span id="calc-commission" style="font-weight:600;color:#ef4444;">0 ' + currency + '</span>';
    html += '</div>';
    html += '<div style="display:flex;justify-content:space-between;padding:8px 0;font-size:18px;font-weight:800;color:#059669;">';
    html += '<span>К оплате:</span>';
    html += '<span id="calc-payable">0 ' + currency + '</span>';
    html += '</div>';
    html += '</div>';
    
    html += '<div class="yatra-booking-actions">';
    html += '<button class="yatra-btn yatra-btn-success" id="confirm-booking-btn" onclick="yatraCreateBooking()">';
    html += '<i class="fas fa-check"></i> Забронировать';
    html += '</button>';
    html += '<button class="yatra-btn yatra-btn-secondary" onclick="yatraCloseModal()">';
    html += '<i class="fas fa-times"></i> Отмена';
    html += '</button>';
    html += '</div>';
    
    html += '<div id="booking-summary-container" style="margin-top:10px;"></div>';
    
    html += '</div>';
    
    yatraOpenModal('📝 Бронирование тура', html);
    yatraUpdateTravelerFields();
}

// ============================================================
// ОБНОВЛЕНИЕ ПОЛЕЙ ПУТЕШЕСТВЕННИКОВ
// ============================================================
function yatraUpdateTravelerFields() {
    var countInput = document.getElementById('traveler-count');
    if (!countInput) return;
    
    var count = parseInt(countInput.value) || 1;
    var maxSeats = yatraCurrentAvailableSeats || 20;
    
    if (count > maxSeats) {
        count = maxSeats;
        countInput.value = maxSeats;
    }
    
    var container = document.getElementById('traveler-fields-container');
    if (!container) return;
    
    var html = '<div style="background:#f1f5f9;padding:12px;border-radius:8px;margin-bottom:10px;">';
    html += '<h4 style="margin:0 0 10px 0;font-size:14px;">👤 Данные путешественников</h4>';
    
    for (var i = 1; i <= count; i++) {
        html += '<div style="border:1px solid #e2e8f0;border-radius:6px;padding:12px;margin-bottom:10px;background:white;">';
        html += '<div style="font-weight:600;margin-bottom:8px;color:#4F46E5;">Путешественник #' + i + '</div>';
        
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px;">';
        html += '<div><label style="font-size:12px;font-weight:600;">Имя</label>';
        html += '<input type="text" id="traveler-' + i + '-first-name" placeholder="Имя" style="width:100%;padding:6px 10px;border:1px solid #d1d5db;border-radius:4px;font-size:13px;"></div>';
        html += '<div><label style="font-size:12px;font-weight:600;">Фамилия</label>';
        html += '<input type="text" id="traveler-' + i + '-last-name" placeholder="Фамилия" style="width:100%;padding:6px 10px;border:1px solid #d1d5db;border-radius:4px;font-size:13px;"></div>';
        html += '</div>';
        
        html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">';
        html += '<div><label style="font-size:12px;font-weight:600;">Дата рождения</label>';
        html += '<input type="date" id="traveler-' + i + '-dob" style="width:100%;padding:6px 10px;border:1px solid #d1d5db;border-radius:4px;font-size:13px;"></div>';
        html += '<div><label style="font-size:12px;font-weight:600;">Пол</label>';
        html += '<select id="traveler-' + i + '-gender" style="width:100%;padding:6px 10px;border:1px solid #d1d5db;border-radius:4px;font-size:13px;">';
        html += '<option value="male">Мужской</option>';
        html += '<option value="female">Женский</option>';
        html += '</select></div>';
        html += '</div>';
        
        html += '</div>';
    }
    
    html += '</div>';
    container.innerHTML = html;
    yatraUpdateCalculation();
}

// ============================================================
// ОБНОВЛЕНИЕ КАЛЬКУЛЯЦИИ
// ============================================================
function yatraUpdateCalculation() {
    var countInput = document.getElementById('traveler-count');
    if (!countInput) return;
    
    var count = parseInt(countInput.value) || 1;
    var totalAmount = count * yatraCurrentPrice;
    var commission = totalAmount * 0.1;
    var payable = totalAmount - commission;
    
    totalAmount = Math.round(totalAmount * 100) / 100;
    commission = Math.round(commission * 100) / 100;
    payable = Math.round(payable * 100) / 100;
    
    document.getElementById('calc-total-amount').textContent = totalAmount.toLocaleString('ru-RU') + ' ' + yatraCurrentCurrency;
    document.getElementById('calc-commission').textContent = commission.toLocaleString('ru-RU') + ' ' + yatraCurrentCurrency;
    document.getElementById('calc-payable').textContent = payable.toLocaleString('ru-RU') + ' ' + yatraCurrentCurrency;
}

// ============================================================
// ФУНКЦИЯ ФОРМАТИРОВАНИЯ ДАТЫ ДЛЯ API
// ============================================================
function yatraFormatDateForAPI(dateStr) {
    if (!dateStr) return '';
    
    var formatted = dateStr;
    
    if (dateStr.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
        var parts = dateStr.split('.');
        formatted = parts[2] + '-' + parts[1] + '-' + parts[0];
    } else if (dateStr.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        var parts = dateStr.split('/');
        formatted = parts[2] + '-' + parts[1] + '-' + parts[0];
    } else if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
        // уже правильный формат
    } else {
        var dateObj = new Date(dateStr);
        if (!isNaN(dateObj.getTime())) {
            var year = dateObj.getFullYear();
            var month = String(dateObj.getMonth() + 1).padStart(2, '0');
            var day = String(dateObj.getDate()).padStart(2, '0');
            formatted = year + '-' + month + '-' + day;
        }
    }
    
    return formatted;
}

// ============================================================
// СОЗДАНИЕ БРОНИРОВАНИЯ
// ============================================================
function yatraCreateBooking() {
    var countInput = document.getElementById('traveler-count');
    if (!countInput) {
        yatraShowMessage('global-msg', 'error', '❌ Ошибка: не указано количество');
        return;
    }
    
    var total = parseInt(countInput.value) || 1;
    
    if (total < 1) {
        yatraShowMessage('global-msg', 'error', '❌ Минимальное количество - 1 человек');
        return;
    }
    
    if (!yatraCurrentTripId || !yatraCurrentAvailabilityId) {
        yatraShowMessage('global-msg', 'error', '❌ Нет данных о туре');
        return;
    }
    
    var travelers = [];
    var isValid = true;
    
    for (var i = 1; i <= total; i++) {
        var firstName = document.getElementById('traveler-' + i + '-first-name');
        var lastName = document.getElementById('traveler-' + i + '-last-name');
        var dob = document.getElementById('traveler-' + i + '-dob');
        var gender = document.getElementById('traveler-' + i + '-gender');
        
        if (!firstName || !lastName || !dob || !gender) {
            continue;
        }
        
        var fName = firstName.value.trim();
        var lName = lastName.value.trim();
        var dateOfBirth = dob.value;
        var genderVal = gender.value;
        
        if (!fName || !lName || !dateOfBirth) {
            isValid = false;
            yatraShowMessage('global-msg', 'error', '❌ Заполните все поля для путешественника #' + i);
            return;
        }
        
        travelers.push({
            first_name: fName,
            last_name: lName,
            email: '',
            phone: '',
            dob: dateOfBirth,
            gender: genderVal,
            nationality: 'US'
        });
    }
    
    if (!isValid) {
        return;
    }
    
    var totalAmount = total * yatraCurrentPrice;
    var commission = totalAmount * 0.1;
    var payable = totalAmount - commission;
    
    totalAmount = Math.round(totalAmount * 100) / 100;
    commission = Math.round(commission * 100) / 100;
    payable = Math.round(payable * 100) / 100;
    
    if (!confirm('Подтвердить бронирование на ' + total + ' чел.\n' +
        'Общая сумма: ' + totalAmount.toLocaleString('ru-RU') + ' ' + yatraCurrentCurrency + '\n' +
        'Комиссия 10%: ' + commission.toLocaleString('ru-RU') + ' ' + yatraCurrentCurrency + '\n' +
        'К оплате: ' + payable.toLocaleString('ru-RU') + ' ' + yatraCurrentCurrency + '?')) {
        return;
    }
    
    yatraLog('📝 Начало бронирования...');
    yatraLog('💰 Общая сумма: ' + totalAmount + ' ' + yatraCurrentCurrency);
    yatraLog('💰 Комиссия 10%: ' + commission + ' ' + yatraCurrentCurrency);
    yatraLog('💰 К оплате: ' + payable + ' ' + yatraCurrentCurrency);
    
    var btn = document.getElementById('confirm-booking-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Бронирование...';
    
    var container = document.getElementById('booking-summary-container');
    
    var debugLogs = [];
    
    function addDebugLog(msg, data) {
        var time = new Date().toLocaleTimeString();
        var entry = '[' + time + '] ' + msg;
        if (data) {
            entry += '\n' + JSON.stringify(data, null, 2);
        }
        debugLogs.push(entry);
        yatraLog(msg);
        console.log(msg, data || '');
        
        var logEl = document.getElementById('booking-debug-log');
        if (logEl) {
            logEl.innerHTML = debugLogs.join('\n\n');
            logEl.scrollTop = logEl.scrollHeight;
        }
    }
    
    var logHtml = '<div id="booking-debug-log" style="background:#1e293b;color:#e2e8f0;padding:12px;border-radius:8px;font-family:monospace;font-size:11px;max-height:400px;overflow-y:auto;margin-top:12px;white-space:pre-wrap;border:1px solid #334155;"></div>';
    
    container.innerHTML = '<div class="yatra-loading" style="padding:20px;"><div class="spinner"></div> Создание бронирования...</div>' + logHtml;
    
    var departureDateFormatted = yatraFormatDateForAPI(yatraCurrentDateStr);
    var arrivalDateFormatted = yatraCurrentArrivalDate ? yatraFormatDateForAPI(yatraCurrentArrivalDate) : '';
    
    if (!departureDateFormatted || !departureDateFormatted.match(/^\d{4}-\d{2}-\d{2}$/)) {
        addDebugLog('❌ ОШИБКА: Не удалось преобразовать дату "' + yatraCurrentDateStr + '" в формат YYYY-MM-DD', 'error');
        yatraShowMessage('global-msg', 'error', '❌ Ошибка формата даты.');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check"></i> Забронировать';
        return;
    }
    
    yatraGetUserData().then(function(userData) {
        addDebugLog('👤 Данные пользователя получены');
        
        var bookingData = {
            trip_id: parseInt(yatraCurrentTripId),
            availability_id: parseInt(yatraCurrentAvailabilityId),
            travelers_count: total,
            departure_date: departureDateFormatted,
            start_date: departureDateFormatted,
            travel_date: departureDateFormatted,
            contact_email: userData.email || '',
            contact_first_name: userData.first_name || '',
            contact_last_name: userData.last_name || '',
            contact_phone: userData.phone || '',
            contact_country: userData.country || 'US',
            travelers: travelers,
            total_amount: payable,
            amount_paid: 0,
            amount_due: payable,
            subtotal: totalAmount,
            commission: commission,
            payable: payable,
            currency: 'USD',
            booking_token: '',
            status: 'pending',
            payment_method: 'full'
        };
        
        addDebugLog('📤 ОТПРАВКА ЗАПРОСА НА СОЗДАНИЕ БРОНИРОВАНИЯ');
        addDebugLog('📦 ДАННЫЕ:', bookingData);
        
        var form = new FormData();
        form.append('action', 'yatra_create_booking');
        form.append('nonce', nonce);
        form.append('booking_data', JSON.stringify(bookingData));

        return fetch(ajaxurl, { 
            method: 'POST', 
            credentials: 'include', 
            body: form
        });
    })
    .then(function(response) {
        addDebugLog('📥 Ответ сервера: HTTP ' + response.status);
        return response.json();
    })
    .then(function(r) {
        addDebugLog('📦 ПОЛНЫЙ ОТВЕТ ОТ БРОНИРОВАНИЯ:', r);
        
        if (r.success) {
            var data = r.data?.data || r.data;
            
            addDebugLog('✅ БРОНИРОВАНИЕ УСПЕШНО СОЗДАНО!');
            addDebugLog('📊 Данные ответа:', data);
            
            var finalLogs = debugLogs.join('\n\n');
            
            container.innerHTML = '<div class="yatra-msg success" style="display:block;">' +
                '✅ Бронирование успешно создано!<br>' +
                '👥 ' + total + ' чел.<br>' +
                '💰 Общая сумма: ' + totalAmount.toLocaleString('ru-RU') + ' ' + yatraCurrentCurrency + '<br>' +
                '💰 Комиссия 10%: ' + commission.toLocaleString('ru-RU') + ' ' + yatraCurrentCurrency + '<br>' +
                '💰 К оплате: ' + payable.toLocaleString('ru-RU') + ' ' + yatraCurrentCurrency + '<br>' +
                '📅 Дата: ' + departureDateFormatted +
                (yatraCurrentDepartureTime ? ' 🕐 ' + yatraCurrentDepartureTime : '') +
                (arrivalDateFormatted ? ' → ' + arrivalDateFormatted : '') +
                '<br><small>Статус: ' + (data.status || 'pending') + '</small>' +
                '</div>' +
                '<div id="booking-debug-log" style="background:#1e293b;color:#e2e8f0;padding:12px;border-radius:8px;font-family:monospace;font-size:11px;max-height:400px;overflow-y:auto;margin-top:12px;white-space:pre-wrap;border:1px solid #334155;">' + 
                finalLogs + 
                '</div>';
            
            btn.innerHTML = '<i class="fas fa-check"></i> Создано!';
            btn.disabled = true;
            
            yatraCurrentTripId = null;
            yatraCurrentAvailabilityId = null;
            yatraCurrentDateStr = null;
            yatraCurrentDepartureTime = null;
            yatraCurrentArrivalDate = null;
            yatraCurrentPrice = 0;
            yatraCurrentAvailableSeats = 0;
            
            setTimeout(function() {
                yatraCloseModal();
                yatraLoadMyBookings();
            }, 5000);
        } else {
            var error = r.data?.message || r.message || 'Ошибка создания';
            addDebugLog('❌ ОШИБКА СОЗДАНИЯ БРОНИРОВАНИЯ:', { error: error, full_response: r });
            throw new Error(error);
        }
    })
    .catch(function(error) {
        addDebugLog('❌ КРИТИЧЕСКАЯ ОШИБКА: ' + error.message);
        
        var finalLogs = debugLogs.join('\n\n');
        
        container.innerHTML = '<div class="yatra-msg error" style="display:block;">' +
            '❌ Ошибка: ' + error.message + 
            '</div>' +
            '<div id="booking-debug-log" style="background:#1e293b;color:#e2e8f0;padding:12px;border-radius:8px;font-family:monospace;font-size:11px;max-height:400px;overflow-y:auto;margin-top:12px;white-space:pre-wrap;border:1px solid #334155;">' + 
            finalLogs + 
            '</div>';
        
        yatraLog('❌ Ошибка: ' + error.message, 'error');
        yatraShowMessage('global-msg', 'error', '❌ Ошибка: ' + error.message);
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check"></i> Забронировать';
    });
}

// ============================================================
// АККАУНТ
// ============================================================
function yatraLoadAccountData() {
    var container = document.getElementById('account-data');
    container.innerHTML = '<div class="yatra-loading"><div class="spinner"></div> Загрузка данных...</div>';
    yatraLog('👤 Загрузка данных аккаунта');

    var form = new FormData();
    form.append('action', 'yatra_account_data');
    form.append('nonce', nonce);

    fetch(ajaxurl, { method: 'POST', credentials: 'include', body: form })
    .then(function(r) { return r.json(); })
    .then(function(r) {
        console.log('YATRA: Account data response:', r);
        var data = r.data?.data || r.data;
        container.innerHTML = yatraFormatAccountData(data);
        yatraLog('✅ Данные аккаунта загружены', 'success');
    })
    .catch(function(error) {
        container.innerHTML = '<div class="yatra-empty" style="color:var(--danger);"><i class="fas fa-exclamation-triangle"></i><h3>Ошибка загрузки</h3><p>' + error.message + '</p></div>';
        yatraLog('❌ Ошибка загрузки аккаунта: ' + error.message, 'error');
    });
}

function yatraFormatAccountData(data) {
    var html = '';
    var userData = data;
    if (data && data.data) userData = data.data;
    
    if (!userData || Object.keys(userData).length === 0) {
        return '<div class="yatra-empty"><i class="fas fa-user"></i><h3>Нет данных</h3></div>';
    }
    
    var stats = [
        { label: 'Бронирований', value: userData.total_bookings || 0, icon: 'fa-bookmark', color: 'purple' },
        { label: 'Потрачено', value: (userData.total_spent || 0) + ' ₽', icon: 'fa-wallet', color: 'green' },
        { label: 'Уровень', value: userData.loyalty_tier || 'Бронзовый', icon: 'fa-crown', color: 'yellow' },
        { label: 'Статус', value: userData.status || 'Активен', icon: 'fa-circle-check', color: 'green' }
    ];
    
    html += '<div class="yatra-stats-grid">';
    for (var i = 0; i < stats.length; i++) {
        var stat = stats[i];
        html += '<div class="yatra-stat-card ' + stat.color + '">';
        html += '<span class="stat-icon"><i class="fas ' + stat.icon + '"></i></span>';
        html += '<div class="stat-label">' + stat.label + '</div>';
        html += '<div class="stat-value">' + stat.value + '</div>';
        html += '</div>';
    }
    html += '</div>';
    
    html += '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:16px;">';
    html += '<h3 style="margin:0;font-size:18px;">👤 Профиль</h3>';
    html += '<button class="yatra-btn yatra-btn-primary yatra-btn-sm" onclick="yatraToggleEditProfile()"><i class="fas fa-edit"></i> Редактировать</button>';
    html += '</div>';
    
    html += '<div class="yatra-account-grid">';
    var fields = {
        'first_name': '📛 Имя',
        'last_name': '📛 Фамилия',
        'email': '📧 Email',
        'phone': '📞 Телефон',
        'address': '📍 Адрес',
        'city': '🏙️ Город',
        'state': '📍 Область',
        'zip': '📮 Индекс',
        'country': '🌍 Страна',
        'created_at': '📅 Зарегистрирован'
    };
    
    for (var key in fields) {
        if (userData[key] !== undefined && userData[key] !== null && userData[key] !== '') {
            var value = userData[key];
            if (key === 'created_at' || key === 'registered_at') {
                var dateObj = new Date(value);
                if (!isNaN(dateObj.getTime())) {
                    value = dateObj.toLocaleString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    });
                }
            }
            html += '<div class="yatra-account-item">';
            html += '<div class="label">' + fields[key] + '</div>';
            html += '<div class="value">' + value + '</div>';
            html += '</div>';
        }
    }
    html += '</div>';
    
    html += '<div id="edit-profile-form" style="display:none;margin-top:20px;padding-top:20px;border-top:2px solid var(--gray-200);">';
    html += '<h4 style="margin:0 0 16px 0;">✏️ Редактировать профиль</h4>';
    html += '<div class="yatra-profile-form">';
    
    var editFields = {
        'first_name': 'Имя',
        'last_name': 'Фамилия',
        'email': 'Email',
        'phone': 'Телефон',
        'address': 'Адрес',
        'city': 'Город',
        'state': 'Область',
        'zip': 'Индекс',
        'country': 'Страна'
    };
    
    for (var key in editFields) {
        var value = userData[key] || '';
        var label = editFields[key];
        var type = key === 'email' ? 'email' : 'text';
        var required = key === 'email' ? 'required' : '';
        
        html += '<div class="field">';
        html += '<label>' + label + '</label>';
        html += '<input type="' + type + '" name="' + key + '" value="' + value + '" ' + required + '>';
        html += '</div>';
    }
    
    html += '<div class="form-actions">';
    html += '<button class="yatra-btn yatra-btn-success" onclick="yatraSaveProfile()"><i class="fas fa-save"></i> Сохранить</button>';
    html += '<button class="yatra-btn yatra-btn-secondary" onclick="yatraToggleEditProfile()"><i class="fas fa-times"></i> Отмена</button>';
    html += '<span id="profile-save-msg" style="margin-left:12px;font-weight:600;"></span>';
    html += '</div>';
    html += '</div>';
    html += '</div>';
    
    return html;
}

function yatraToggleEditProfile() {
    var form = document.getElementById('edit-profile-form');
    if (!form) return;
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
    yatraLog('✏️ Форма редактирования ' + (form.style.display === 'block' ? 'открыта' : 'закрыта'));
}

function yatraSaveProfile() {
    var form = document.getElementById('edit-profile-form');
    var inputs = form.querySelectorAll('input');
    var data = {};
    
    for (var i = 0; i < inputs.length; i++) {
        if (inputs[i].name) data[inputs[i].name] = inputs[i].value;
    }
    
    if (!data.email || !data.email.includes('@')) {
        yatraShowMessage('profile-save-msg', 'error', '❌ Введите корректный email');
        return;
    }
    
    yatraLog('💾 Сохранение профиля...');
    var msgEl = document.getElementById('profile-save-msg');
    msgEl.textContent = '⏳ Сохранение...';
    msgEl.className = '';

    var formData = new FormData();
    formData.append('action', 'yatra_update_profile');
    formData.append('nonce', nonce);
    for (var key in data) formData.append(key, data[key]);

    fetch(ajaxurl, { method: 'POST', credentials: 'include', body: formData })
    .then(function(r) { return r.json(); })
    .then(function(r) {
        if (r.success) {
            yatraLog('✅ Профиль сохранен', 'success');
            yatraShowMessage('profile-save-msg', 'success', '✅ Профиль успешно обновлен!');
            setTimeout(function() {
                yatraLoadAccountData();
                yatraToggleEditProfile();
            }, 1000);
        } else {
            var error = r.data?.message || 'Ошибка сохранения';
            yatraLog('❌ Ошибка: ' + error, 'error');
            yatraShowMessage('profile-save-msg', 'error', '❌ ' + error);
        }
    })
    .catch(function(error) {
        yatraLog('❌ Ошибка сохранения: ' + error.message, 'error');
        yatraShowMessage('profile-save-msg', 'error', '❌ Ошибка сохранения профиля');
    });
}

// ============================================================
// МОИ БРОНИРОВАНИЯ (ОБНОВЛЕННЫЙ ДИЗАЙН)
// ============================================================
function yatraLoadMyBookings() {
    var container = document.getElementById('my-bookings');
    container.innerHTML = '<div class="yatra-loading"><div class="spinner"></div> Загрузка бронирований...</div>';
    yatraLog('📋 Загрузка бронирований');

    var form = new FormData();
    form.append('action', 'yatra_my_bookings');
    form.append('nonce', nonce);

    fetch(ajaxurl, { method: 'POST', credentials: 'include', body: form })
    .then(function(r) { return r.json(); })
    .then(function(r) {
        console.log('YATRA: Bookings response:', r);
        var data = r.data?.data || r.data;
        
        if (data && data.data && Array.isArray(data.data)) {
            data = data.data;
        } else if (data && Array.isArray(data)) {
            // уже массив
        } else {
            data = [];
        }
        
        // Сохраняем данные для детального просмотра
        window.yatraLastBookingsData = data;
        
        container.innerHTML = yatraFormatMyBookings(data);
        yatraLog('✅ Бронирования загружены', 'success');
    })
    .catch(function(error) {
        container.innerHTML = '<div class="yatra-empty" style="color:var(--danger);"><i class="fas fa-exclamation-triangle"></i><h3>Ошибка загрузки</h3><p>' + error.message + '</p></div>';
        yatraLog('❌ Ошибка загрузки бронирований: ' + error.message, 'error');
    });
}

function yatraFormatMyBookings(bookings) {
    if (!bookings || bookings.length === 0) {
        return '<div class="yatra-empty"><i class="fas fa-bookmark"></i><h3>Нет бронирований</h3><p>У вас пока нет бронирований</p></div>';
    }
    
    var html = '';
    var statusMap = {
        'pending': { label: '⏳ Ожидает', class: 'pending' },
        'confirmed': { label: '✅ Подтверждено', class: 'confirmed' },
        'cancelled': { label: '❌ Отменено', class: 'cancelled' },
        'completed': { label: '✅ Завершено', class: 'completed' },
        'paid': { label: '✅ Оплачено', class: 'paid' },
        'processing': { label: '⏳ В обработке', class: 'processing' }
    };
    
    for (var i = 0; i < bookings.length; i++) {
        var b = bookings[i];
        var statusInfo = statusMap[b.status] || { label: b.status || 'Неизвестно', class: 'pending' };
        
        var startDate = b.start_date ? new Date(b.start_date).toLocaleDateString('ru-RU') : '—';
        var endDate = b.end_date ? new Date(b.end_date).toLocaleDateString('ru-RU') : '—';
        
        html += '<div class="booking-card" style="background:white;border-radius:12px;padding:20px;margin-bottom:16px;box-shadow:0 1px 3px rgba(0,0,0,0.08);border:1px solid #e5e7eb;transition:all 0.2s;">';
        html += '<div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:12px;">';
        
        html += '<div style="flex:1;min-width:200px;">';
        html += '<div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:8px;">';
        html += '<span style="font-weight:700;font-size:16px;color:#1f2937;">' + (b.trip_title || 'Без названия') + '</span>';
        html += '<span class="yatra-status-badge ' + statusInfo.class + '" style="font-size:11px;padding:3px 10px;">' + statusInfo.label + '</span>';
        html += '</div>';
        
        html += '<div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(150px, 1fr));gap:8px;font-size:13px;color:#6b7280;">';
        html += '<div><span style="font-weight:500;color:#4b5563;">📋 Заявка:</span> <strong style="color:#1f2937;">' + (b.reference || '—') + '</strong></div>';
        html += '<div><span style="font-weight:500;color:#4b5563;">📅 Начало:</span> ' + startDate + '</div>';
        html += '<div><span style="font-weight:500;color:#4b5563;">📅 Окончание:</span> ' + endDate + '</div>';
        html += '</div>';
        html += '</div>';
        
        html += '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;min-width:150px;">';
        html += '<div style="text-align:right;">';
        html += '<div style="font-size:12px;color:#6b7280;">Стоимость для туриста</div>';
        html += '<div style="font-size:18px;font-weight:700;color:#4f46e5;">' + (parseFloat(b.subtotal || 0).toLocaleString('ru-RU')) + ' ₽</div>';
        html += '</div>';
        html += '<div style="text-align:right;">';
        html += '<div style="font-size:12px;color:#6b7280;">К оплате агентом</div>';
        html += '<div style="font-size:18px;font-weight:700;color:#059669;">' + (parseFloat(b.total_amount || 0).toLocaleString('ru-RU')) + ' ₽</div>';
        html += '</div>';
        html += '<button class="yatra-btn yatra-btn-primary yatra-btn-sm" onclick="yatraShowBookingDetails(' + (b.id || i) + ')" style="margin-top:4px;">';
        html += '<i class="fas fa-eye"></i> Открыть';
        html += '</button>';
        html += '</div>';
        
        html += '</div>';
        html += '</div>';
    }
    
    return html;
}

// ============================================================
// ПРОСМОТР ДЕТАЛЕЙ БРОНИРОВАНИЯ (ЧЕРЕЗ API)
// ============================================================
function yatraShowBookingDetails(bookingId) {
    yatraLog('📄 Загрузка деталей бронирования #' + bookingId);
    
    var container = document.getElementById('booking-details-container');
    if (container) {
        container.innerHTML = '<div class="yatra-loading"><div class="spinner"></div> Загрузка деталей...</div>';
    }
    
    yatraShowMessage('global-msg', 'info', '⏳ Загрузка деталей бронирования...');
    
    // Запрос к API: yatra/v1/bookings/{id}
    var form = new FormData();
    form.append('action', 'yatra_get_booking');
    form.append('nonce', nonce);
    form.append('booking_id', bookingId);
    
    fetch(ajaxurl, {
        method: 'POST',
        credentials: 'include',
        body: form
    })
    .then(function(response) {
        console.log('YATRA: Booking details response status:', response.status);
        return response.json();
    })
    .then(function(r) {
        console.log('YATRA: Booking details response:', r);
        
        if (!r.success) {
            var errorMsg = r.data?.message || r.message || 'Ошибка загрузки деталей';
            yatraShowMessage('global-msg', 'error', '❌ ' + errorMsg);
            return;
        }
        
        var booking = r.data?.data || r.data;
        if (booking.id) {
            yatraShowBookingDetailsModal(booking);
            yatraShowMessage('global-msg', 'success', '✅ Детали загружены');
        } else {
            yatraShowMessage('global-msg', 'error', '❌ Бронирование не найдено');
        }
    })
    .catch(function(error) {
        console.error('YATRA: Error loading booking details:', error);
        yatraShowMessage('global-msg', 'error', '❌ Ошибка загрузки: ' + error.message);
    });
}

// ============================================================
// ОТОБРАЖЕНИЕ ДЕТАЛЕЙ БРОНИРОВАНИЯ В МОДАЛЬНОМ ОКНЕ
// ============================================================
function yatraShowBookingDetailsModal(b) {
    if (!b || !b.id) {
        yatraShowMessage('global-msg', 'error', '❌ Данные бронирования не найдены');
        return;
    }
    
    var statusMap = {
        'pending': { label: '⏳ Ожидает', class: 'pending' },
        'confirmed': { label: '✅ Подтверждено', class: 'confirmed' },
        'cancelled': { label: '❌ Отменено', class: 'cancelled' },
        'completed': { label: '✅ Завершено', class: 'completed' },
        'paid': { label: '✅ Оплачено', class: 'paid' },
        'processing': { label: '⏳ В обработке', class: 'processing' }
    };
    var statusInfo = statusMap[b.status] || { label: b.status || 'Неизвестно', class: 'pending' };
    
    var paymentStatusMap = {
        'pending': '⏳ Ожидает оплаты',
        'paid': '✅ Оплачено',
        'failed': '❌ Ошибка',
        'refunded': '↩️ Возврат'
    };
    var paymentStatusLabel = paymentStatusMap[b.payment_status] || b.payment_status || '—';
    
    var startDate = b.start_date ? new Date(b.start_date).toLocaleDateString('ru-RU') : '—';
    var endDate = b.end_date ? new Date(b.end_date).toLocaleDateString('ru-RU') : '—';
    var createdDate = b.created_at ? new Date(b.created_at).toLocaleString('ru-RU') : '—';
    
    var travelers = b.travelers || [];
    var travelersHtml = '';
    if (travelers.length > 0) {
        travelersHtml = '<div style="background:#f8fafc;padding:12px;border-radius:8px;margin-top:10px;">';
        travelersHtml += '<div style="font-weight:600;margin-bottom:8px;">👤 Путешественники</div>';
        for (var i = 0; i < travelers.length; i++) {
            var t = travelers[i];
            var fields = t.fields || {};
            travelersHtml += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:13px;padding:4px 0;border-bottom:1px solid #e5e7eb;">';
            travelersHtml += '<div><span style="color:#6b7280;">Имя:</span> ' + (fields.first_name || '—') + '</div>';
            travelersHtml += '<div><span style="color:#6b7280;">Фамилия:</span> ' + (fields.last_name || '—') + '</div>';
            travelersHtml += '<div><span style="color:#6b7280;">Дата рождения:</span> ' + (fields.dob || '—') + '</div>';
            travelersHtml += '<div><span style="color:#6b7280;">Пол:</span> ' + (fields.gender === 'male' ? 'Мужской' : fields.gender === 'female' ? 'Женский' : fields.gender || '—') + '</div>';
            travelersHtml += '</div>';
        }
        travelersHtml += '</div>';
    }
    
    var html = '';
    html += '<div style="display:grid;gap:16px;">';
    
    html += '<div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;border-bottom:2px solid #e5e7eb;padding-bottom:12px;">';
    html += '<div>';
    html += '<div style="font-size:20px;font-weight:700;color:#1f2937;">' + (b.trip_title || 'Без названия') + '</div>';
    html += '<div style="font-size:13px;color:#6b7280;margin-top:4px;">';
    html += 'Заявка: <strong style="color:#1f2937;">' + (b.reference || b.booking_number || '—') + '</strong>';
    html += ' &bull; ID: ' + b.id;
    html += '</div>';
    html += '</div>';
    html += '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">';
    html += '<span class="yatra-status-badge ' + statusInfo.class + '" style="font-size:13px;padding:4px 14px;">' + statusInfo.label + '</span>';
    html += '<span style="font-size:12px;background:#f3f4f6;padding:4px 12px;border-radius:20px;color:#6b7280;">Оплата: ' + paymentStatusLabel + '</span>';
    html += '</div>';
    html += '</div>';
    
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">';
    html += '<div style="background:#f8fafc;padding:12px;border-radius:8px;"><span style="font-size:11px;color:#6b7280;text-transform:uppercase;">📅 Дата начала</span><div style="font-weight:600;font-size:15px;">' + startDate + '</div></div>';
    html += '<div style="background:#f8fafc;padding:12px;border-radius:8px;"><span style="font-size:11px;color:#6b7280;text-transform:uppercase;">📅 Дата окончания</span><div style="font-weight:600;font-size:15px;">' + endDate + '</div></div>';
    html += '<div style="background:#f8fafc;padding:12px;border-radius:8px;"><span style="font-size:11px;color:#6b7280;text-transform:uppercase;">👥 Путешественников</span><div style="font-weight:600;font-size:15px;">' + (b.travelers_count || 0) + ' чел.</div></div>';
    html += '<div style="background:#f8fafc;padding:12px;border-radius:8px;"><span style="font-size:11px;color:#6b7280;text-transform:uppercase;">📅 Создано</span><div style="font-weight:600;font-size:15px;">' + createdDate + '</div></div>';
    html += '</div>';
    
    var contact = b.contact || {};
    html += '<div style="background:#f1f5f9;padding:12px;border-radius:8px;">';
    html += '<div style="font-weight:600;margin-bottom:6px;">📞 Контактные данные</div>';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:14px;">';
    html += '<div><span style="color:#6b7280;">Имя:</span> ' + (contact.first_name || b.contact_first_name || '—') + '</div>';
    html += '<div><span style="color:#6b7280;">Фамилия:</span> ' + (contact.last_name || b.contact_last_name || '—') + '</div>';
    html += '<div><span style="color:#6b7280;">Email:</span> ' + (contact.email || b.contact_email || '—') + '</div>';
    html += '<div><span style="color:#6b7280;">Телефон:</span> ' + (contact.phone || b.contact_phone || '—') + '</div>';
    html += '<div style="grid-column:span 2;"><span style="color:#6b7280;">Страна:</span> ' + (contact.country || b.contact_country || '—') + '</div>';
    html += '</div>';
    html += '</div>';
    
    html += travelersHtml;
    
    html += '<div style="background:#f0fdf4;padding:12px;border-radius:8px;border:1px solid #bbf7d0;">';
    html += '<div style="font-weight:600;margin-bottom:6px;color:#065f46;">💰 Финансовая информация</div>';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;">';
    html += '<div><span style="font-size:12px;color:#6b7280;">Стоимость для туриста</span><div style="font-weight:700;font-size:16px;color:#4f46e5;">' + (parseFloat(b.subtotal || 0).toLocaleString('ru-RU')) + ' ₽</div></div>';
    html += '<div><span style="font-size:12px;color:#6b7280;">К оплате агентом</span><div style="font-weight:700;font-size:16px;color:#059669;">' + (parseFloat(b.total_amount || 0).toLocaleString('ru-RU')) + ' ₽</div></div>';
    html += '<div><span style="font-size:12px;color:#6b7280;">Остаток</span><div style="font-weight:700;font-size:16px;color:' + (parseFloat(b.amount_due || 0) > 0 ? '#dc2626' : '#059669') + ';">' + (parseFloat(b.amount_due || 0).toLocaleString('ru-RU')) + ' ₽</div></div>';
    html += '</div>';
    if (b.discount_amount && parseFloat(b.discount_amount) > 0) {
        html += '<div style="margin-top:8px;font-size:13px;color:#6b7280;">Скидка: <strong>' + (parseFloat(b.discount_amount).toLocaleString('ru-RU')) + ' ₽</strong></div>';
    }
    html += '</div>';
    
    if (b.special_requests) {
        html += '<div style="background:#fef3c7;padding:12px;border-radius:8px;border:1px solid #fcd34d;">';
        html += '<div style="font-weight:600;color:#92400e;">📝 Особые пожелания</div>';
        html += '<div style="font-size:14px;color:#78350f;">' + b.special_requests + '</div>';
        html += '</div>';
    }
    
    if (b.internal_notes) {
        html += '<div style="background:#e0e7ff;padding:12px;border-radius:8px;border:1px solid #818cf8;">';
        html += '<div style="font-weight:600;color:#3730a3;">📌 Внутренние заметки</div>';
        html += '<div style="font-size:14px;color:#312e81;">' + b.internal_notes + '</div>';
        html += '</div>';
    }
    
    if (b.payment_gateway) {
        html += '<div style="background:#f8fafc;padding:10px;border-radius:8px;font-size:13px;color:#6b7280;display:flex;justify-content:space-between;flex-wrap:wrap;gap:8px;">';
        html += '<span>💳 Способ оплаты: <strong>' + (b.payment_method || b.payment_gateway || '—') + '</strong></span>';
        if (b.payment_transaction_id) {
            html += '<span>Транзакция: <strong>' + b.payment_transaction_id + '</strong></span>';
        }
        html += '</div>';
    }
    
    html += '</div>';
    
    yatraOpenModal('📋 Бронирование #' + (b.reference || b.id), html);
    yatraLog('✅ Детали бронирования #' + b.id + ' загружены', 'success');
}

// ============================================================
// ПЛАТЕЖИ
// ============================================================
function yatraLoadMyPayments() {
    var container = document.getElementById('my-payments');
    container.innerHTML = '<div class="yatra-loading"><div class="spinner"></div> Загрузка платежей...</div>';
    yatraLog('💰 Загрузка платежей');

    var form = new FormData();
    form.append('action', 'yatra_my_payments');
    form.append('nonce', nonce);

    fetch(ajaxurl, { method: 'POST', credentials: 'include', body: form })
    .then(function(r) { return r.json(); })
    .then(function(r) {
        console.log('YATRA: Payments response:', r);
        var data = r.data?.data || r.data;
        container.innerHTML = yatraFormatMyPayments(data);
        yatraLog('✅ Платежи загружены', 'success');
    })
    .catch(function(error) {
        container.innerHTML = '<div class="yatra-empty" style="color:var(--danger);"><i class="fas fa-exclamation-triangle"></i><h3>Ошибка загрузки</h3><p>' + error.message + '</p></div>';
        yatraLog('❌ Ошибка загрузки платежей: ' + error.message, 'error');
    });
}

function yatraFormatMyPayments(data) {
    var payments = data;
    if (data && data.data && Array.isArray(data.data)) payments = data.data;
    else if (data && Array.isArray(data)) payments = data;
    
    if (!payments || payments.length === 0) {
        return '<div class="yatra-empty"><i class="fas fa-credit-card"></i><h3>Нет платежей</h3><p>У вас пока нет платежей</p></div>';
    }
    
    var html = '';
    for (var i = 0; i < payments.length; i++) {
        var p = payments[i];
        var id = p.id || p.payment_id || i;
        var status = p.status || 'pending';
        var amount = p.amount || p.total_amount || 0;
        var currency = p.currency || '₽';
        var method = p.payment_method || p.method || '-';
        var createdDate = p.created_at || p.date || '';
        var bookingId = p.booking_id || p.order_id || '';
        var description = p.description || p.notes || '';
        
        var dateStr = createdDate ? new Date(createdDate).toLocaleDateString('ru-RU') : '';
        
        var statusMap = {
            'completed': '✅ Завершен',
            'pending': '⏳ Ожидает',
            'failed': '❌ Ошибка',
            'refunded': '↩️ Возврат',
            'processing': '⏳ В обработке',
            'paid': '✅ Оплачено',
            'success': '✅ Успешно'
        };
        var statusLabel = statusMap[status] || status;
        
        html += '<div class="yatra-list-item">';
        html += '<div class="item-main">';
        html += '<div class="title"><i class="fas fa-receipt" style="color:var(--primary);"></i> #' + id;
        if (description) html += ' - ' + description;
        html += '</div>';
        html += '<div class="sub"><i class="fas fa-credit-card"></i> ' + method;
        if (bookingId) html += ' &bull; <i class="fas fa-ticket-alt"></i> Бронь #' + bookingId;
        if (dateStr) html += ' &bull; <i class="fas fa-clock"></i> ' + dateStr;
        html += '</div>';
        html += '</div>';
        html += '<div class="item-right">';
        html += '<span class="amount">' + amount.toLocaleString('ru-RU') + ' ' + currency + '</span>';
        html += '<span class="yatra-status-badge ' + status + '">' + statusLabel + '</span>';
        html += '</div>';
        html += '</div>';
    }
    
    return html;
}

// ============================================================
// ВЫХОД
// ============================================================
function yatraLogout() {
    if (!confirm('Вы уверены, что хотите выйти?')) return;
    
    var form = new FormData();
    form.append('action', 'yatra_logout');
    form.append('nonce', nonce);
    
    fetch(ajaxurl, { method: 'POST', credentials: 'include', body: form })
    .then(function() { window.location.reload(); });
}

// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    console.log('YATRA: DOM loaded, user_logged_in =', yatra.user_logged_in);
    
    if (yatra.user_logged_in) {
        yatraLog('🚀 CRM инициализирована');
        yatraLog('👋 Добро пожаловать');
        
        var activeTab = document.querySelector('.yatra-tab.active');
        if (activeTab) {
            var tabId = activeTab.dataset.tab;
            if (tabId === 'account') yatraLoadAccountData();
            if (tabId === 'bookings') yatraLoadMyBookings();
            if (tabId === 'payments') yatraLoadMyPayments();
            if (tabId === 'trips') yatraLoadTrips('publish');
        } else {
            yatraLoadTrips('publish');
        }
    } else {
        console.log('YATRA: User not logged in');
    }
});