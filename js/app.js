document.addEventListener('DOMContentLoaded', async () => {
    // URLから現在のページと対象ユーザーIDを取得
    const isProfilePage = window.location.pathname.includes('profile.html');
    const urlParams = new URLSearchParams(window.location.search);
    const targetUserId = urlParams.get('id') || 'user1'; // デフォルトは user1

    // データの読み込み
    const [usersRes, postsRes, trendsRes] = await Promise.all([
        fetch('data/users.json'),
        fetch('data/posts.json'),
        fetch('data/trends.json')
    ]);

    const users = await usersRes.json();
    const posts = await postsRes.json();
    const trends = await trendsRes.json();

    const userMap = new Map();
    users.forEach(u => userMap.set(u.id, u));

    // プロフィールページ専用のヘッダー構築処理
    if (isProfilePage) {
        const profileUser = userMap.get(targetUserId);
        if (profileUser) {
            document.getElementById('profile-header-name').textContent = profileUser.name;
            document.getElementById('profile-name').textContent = profileUser.name;
            document.getElementById('profile-account').textContent = profileUser.account;
            document.getElementById('profile-icon').textContent = profileUser.icon;
            document.getElementById('profile-bio').textContent = profileUser.bio;
            
            // --- ここから下が変更部分 ---
            const bannerElement = document.querySelector('.profile-banner');
            
            // 画像が指定されていれば画像を表示、なければ色を表示
            if (profileUser.bannerImage && profileUser.bannerImage !== "") {
                bannerElement.style.backgroundImage = `url('${profileUser.bannerImage}')`;
            } else if (profileUser.bannerColor) {
                bannerElement.style.backgroundColor = profileUser.bannerColor;
            }
            // --- ここまで ---
        }
    }

    // タイムラインの生成
    const timeline = document.getElementById('timeline');
    if (timeline) {
        posts.forEach(post => {
            if (!post.visible) return; // フラグによる非表示
            
            // プロフィールページの場合は、そのユーザーの投稿のみ表示
            if (isProfilePage && post.userId !== targetUserId) return;

            const user = userMap.get(post.userId);
            if (!user) return;

            const postElement = document.createElement('div');
            postElement.className = 'post';
            postElement.innerHTML = `
                <div class="post-icon">${user.icon}</div>
                <div class="post-content">
                    <div class="post-header">
                        <span class="post-name">
                            <a href="profile.html?id=${user.id}" class="link-text">${user.name}</a>
                        </span>
                        <span class="post-account">${user.account}</span>
                        <span class="post-time">· ${post.timestamp}</span>
                    </div>
                    <div class="post-text">${post.text}</div>
                    <div class="post-actions">
                        <span>💬 ${post.comments}</span>
                        <span>🔄 ${post.reposts}</span>
                        <span>❤️ ${post.likes}</span>
                    </div>
                </div>
            `;
            timeline.appendChild(postElement);
        });
    }

    // トレンドの生成
    const trendContainer = document.getElementById('trend-list');
    if (trendContainer) {
        trends.forEach(trend => {
            const trendElement = document.createElement('div');
            trendElement.className = 'trend-item';
            trendElement.innerHTML = `
                <span class="trend-keyword">${trend.keyword}</span>
                <span class="trend-count">${trend.postsCount} posts</span>
            `;
            trendContainer.appendChild(trendElement);
        });
    }
});