<script>
// Прямая передача данных без wp_localize_script
var yatra_ajax = {
    ajaxurl: '<?php echo admin_url("admin-ajax.php"); ?>',
    nonce: '<?php echo wp_create_nonce("yatra_nonce"); ?>',
    user_logged_in: <?php echo is_user_logged_in() ? 'true' : 'false'; ?>
};
console.log('YATRA: Data from PHP:', yatra_ajax);
</script>


<div class="yatra-crm">
    <div id="global-msg" class="yatra-msg"></div>

    <div class="yatra-modal" id="yatra-modal">
        <div class="yatra-modal-content">
            <button class="yatra-modal-close" onclick="yatraCloseModal()">
                <i class="fas fa-times"></i>
            </button>
            <h2 class="yatra-modal-title" id="yatra-modal-title">Заголовок</h2>
            <div class="yatra-modal-body" id="yatra-modal-body">Контент</div>
        </div>
    </div>

    <header class="yatra-header">
        <div class="yatra-header-left">
            <div class="logo"><i class="fas fa-umbrella-beach"></i></div>
            <div>
                <h1>Yatra CRM</h1>
                <div class="subtitle">Управление турами и бронированиями</div>
            </div>
        </div>
        <div class="yatra-header-right">
            <div class="yatra-user-badge">
                <div class="avatar"><?php echo strtoupper( substr( $user->display_name, 0, 1 ) ); ?></div>
                <div>
                    <div class="user-name"><?php echo $user->display_name; ?></div>
                    <div class="user-email"><?php echo $user->user_email; ?></div>
                </div>
            </div>
            <button class="yatra-btn yatra-btn-outline" onclick="yatraLogout()">
                <i class="fas fa-sign-out-alt"></i> Выйти
            </button>
        </div>
    </header>

    <div class="yatra-tabs">
        <button class="yatra-tab active" data-tab="trips" onclick="yatraSwitchTab('trips')">
            <i class="fas fa-globe"></i> <span>Туры</span>
        </button>
        <button class="yatra-tab" data-tab="account" onclick="yatraSwitchTab('account')">
            <i class="fas fa-user"></i> <span>Аккаунт</span>
        </button>
        <button class="yatra-tab" data-tab="bookings" onclick="yatraSwitchTab('bookings')">
            <i class="fas fa-ticket-alt"></i> <span>Бронирования</span>
        </button>
        <button class="yatra-tab" data-tab="payments" onclick="yatraSwitchTab('payments')">
            <i class="fas fa-credit-card"></i> <span>Платежи</span>
        </button>
        <button class="yatra-tab" data-tab="log" onclick="yatraSwitchTab('log')">
            <i class="fas fa-terminal"></i> <span>Лог</span>
        </button>
    </div>

    <div class="yatra-tab-content active" id="tab-trips">
        <div class="yatra-card">
            <div class="yatra-card-header">
                <h2><i class="fas fa-globe"></i> Все туры</h2>
                <div class="actions">
                    <button class="yatra-btn yatra-btn-primary yatra-btn-sm" onclick="yatraLoadTrips(document.getElementById('status-filter').value, document.getElementById('search-input').value)">
                        <i class="fas fa-sync"></i> Обновить
                    </button>
                </div>
            </div>
            
            <div class="yatra-filters">
                <span class="filter-label"><i class="fas fa-filter"></i> Статус:</span>
                <select id="status-filter" onchange="yatraLoadTrips(this.value, document.getElementById('search-input').value)">
                    <option value="publish">✅ Опубликованные</option>
                    <option value="draft">📝 Черновики</option>
                    <option value="pending">⏳ На модерации</option>
                    <option value="all">📋 Все туры</option>
                </select>
                
                <span class="filter-label"><i class="fas fa-search"></i> Поиск:</span>
                <input type="text" id="search-input" placeholder="Название тура..." onkeyup="if(event.key==='Enter') yatraLoadTrips(document.getElementById('status-filter').value, this.value)">
                
                <button class="yatra-btn yatra-btn-primary yatra-btn-sm" onclick="yatraLoadTrips(document.getElementById('status-filter').value, document.getElementById('search-input').value)">
                    <i class="fas fa-search"></i> Найти
                </button>
            </div>
            
            <div id="trips-list">
                <div class="yatra-loading"><div class="spinner"></div> Загрузка туров...</div>
            </div>
        </div>
    </div>

    <div class="yatra-tab-content" id="tab-account">
        <div class="yatra-card">
            <div class="yatra-card-header">
                <h2><i class="fas fa-user"></i> Данные аккаунта</h2>
                <div class="actions">
                    <button class="yatra-btn yatra-btn-secondary yatra-btn-sm" onclick="yatraLoadAccountData()">
                        <i class="fas fa-sync"></i> Обновить
                    </button>
                </div>
            </div>
            <div id="account-data">
                <div class="yatra-loading"><div class="spinner"></div> Загрузка данных...</div>
            </div>
        </div>
    </div>

    <div class="yatra-tab-content" id="tab-bookings">
        <div class="yatra-card">
            <div class="yatra-card-header">
                <h2><i class="fas fa-ticket-alt"></i> Мои бронирования</h2>
                <div class="actions">
                    <button class="yatra-btn yatra-btn-secondary yatra-btn-sm" onclick="yatraLoadMyBookings()">
                        <i class="fas fa-sync"></i> Обновить
                    </button>
                </div>
            </div>
            <div id="my-bookings">
                <div class="yatra-loading"><div class="spinner"></div> Загрузка бронирований...</div>
            </div>
        </div>
    </div>

    <div class="yatra-tab-content" id="tab-payments">
        <div class="yatra-card">
            <div class="yatra-card-header">
                <h2><i class="fas fa-credit-card"></i> Мои платежи</h2>
                <div class="actions">
                    <button class="yatra-btn yatra-btn-secondary yatra-btn-sm" onclick="yatraLoadMyPayments()">
                        <i class="fas fa-sync"></i> Обновить
                    </button>
                </div>
            </div>
            <div id="my-payments">
                <div class="yatra-loading"><div class="spinner"></div> Загрузка платежей...</div>
            </div>
        </div>
    </div>

    <div class="yatra-tab-content" id="tab-log">
        <div class="yatra-card">
            <div class="yatra-card-header">
                <h2><i class="fas fa-terminal"></i> Лог системы</h2>
                <div class="actions">
                    <button class="yatra-btn yatra-btn-secondary yatra-btn-sm" onclick="document.getElementById('yatra-log').innerHTML = '';">
                        <i class="fas fa-trash"></i> Очистить
                    </button>
                </div>
            </div>
            <div class="yatra-log" id="yatra-log">
                <div class="log-entry">
                    <span class="log-time">[<?php echo date( 'H:i:s' ); ?>]</span>
                    <span class="log-msg info">🚀 CRM инициализирована</span>
                </div>
            </div>
        </div>
    </div>
</div>