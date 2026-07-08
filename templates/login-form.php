<div style="max-width:420px;margin:60px auto;padding:20px;font-family:'Inter',sans-serif;">
    <div style="background:white;border-radius:16px;padding:40px;box-shadow:0 20px 60px rgba(0,0,0,0.1);">
        <div style="text-align:center;margin-bottom:32px;">
            <div style="width:64px;height:64px;background:linear-gradient(135deg,#4F46E5,#7C3AED);border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:32px;margin:0 auto 16px;color:white;">
                <i class="fas fa-umbrella-beach"></i>
            </div>
            <h1 style="font-size:24px;font-weight:800;color:#1F2937;margin:0;">Yatra CRM</h1>
            <p style="color:#6B7280;margin:4px 0 0;">Войдите в систему</p>
        </div>
        
        <?php if ( isset( $_GET['login'] ) && $_GET['login'] == 'failed' ) : ?>
            <div style="background:#FEE2E2;color:#991B1B;padding:12px 16px;border-radius:8px;margin-bottom:20px;border-left:4px solid #EF4444;display:flex;align-items:center;gap:8px;">
                <i class="fas fa-exclamation-circle"></i> Неверный email или пароль
            </div>
        <?php endif; ?>

        <form method="post" action="<?php echo admin_url( 'admin-post.php' ); ?>">
            <input type="hidden" name="action" value="yatra_login">
            <?php wp_nonce_field( 'yatra_login_nonce' ); ?>
            
            <div style="margin-bottom:16px;">
                <label style="display:block;font-weight:600;font-size:14px;color:#374151;margin-bottom:4px;">Email</label>
                <input type="email" name="login_email" placeholder="artem@tour5.ru" required style="width:100%;padding:12px 16px;border:2px solid #E5E7EB;border-radius:8px;font-size:14px;font-family:inherit;transition:border-color 0.3s;">
            </div>
            
            <div style="margin-bottom:24px;">
                <label style="display:block;font-weight:600;font-size:14px;color:#374151;margin-bottom:4px;">Пароль</label>
                <input type="password" name="login_password" placeholder="Введите пароль" required style="width:100%;padding:12px 16px;border:2px solid #E5E7EB;border-radius:8px;font-size:14px;font-family:inherit;transition:border-color 0.3s;">
            </div>
            
            <button type="submit" style="width:100%;padding:14px;background:linear-gradient(135deg,#4F46E5,#7C3AED);color:white;border:none;border-radius:8px;font-size:16px;font-weight:700;cursor:pointer;transition:transform 0.3s,box-shadow 0.3s;font-family:inherit;">
                <i class="fas fa-sign-in-alt"></i> Войти
            </button>
        </form>
    </div>
</div>
<style>
    input:focus { outline:none; border-color:#4F46E5 !important; box-shadow:0 0 0 3px rgba(79,70,229,0.1); }
</style>