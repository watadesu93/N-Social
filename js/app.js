document.addEventListener('DOMContentLoaded', async () => {
    const isProfilePage = window.location.pathname.includes('profile.html');
    const isSearchPage = window.location.pathname.includes('search.html');
    const urlParams = new URLSearchParams(window.location.search);
    const targetUserId = urlParams.get('id') || 'user1';
    const searchQuery = urlParams.get('q') || ''; // 検索クエリ

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

    // プロフィールページ専用の処理
    if (isProfilePage) {
        const profileUser = userMap.get(targetUserId);
        if (profileUser) {
            document.getElementById('profile-header-name').textContent = profileUser.name;
            document.getElementById('profile-name').textContent = profileUser.name;
            document.getElementById('profile-account').textContent = profileUser.account;
            document.getElementById('profile-icon').textContent = profileUser.icon;
            document.getElementById('profile-bio').textContent = profileUser.bio;
            
            const bannerElement = document.querySelector('.profile-banner');
            if (profileUser.bannerImage && profileUser.bannerImage !== "") {
                bannerElement.style.backgroundImage = `url('${profileUser.bannerImage}')`;
            } else if (profileUser.bannerColor) {
                bannerElement.style.backgroundColor = profileUser.bannerColor;
            }
        }
    }

    // 検索ページの場合、入力欄に初期値をセット
    if (isSearchPage) {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = searchQuery;
            // 入力時のリアルタイム絞り込み
            searchInput.addEventListener('input', (e) => {
                renderTimeline(e.target.value.toLowerCase());
            });
        }
    }

    // タイムライン描画関数
    function renderTimeline(filterKeyword = '') {
        const timeline = document.getElementById('timeline');
        if (!timeline) return;
        timeline.innerHTML = ''; // 一度クリア

        posts.forEach(post => {
            if (!post.visible) return; // フラグによる非表示

            const user = userMap.get(post.userId);
            if (!user) return;

            // プロフィールページの場合はそのユーザーの投稿のみ
            if (isProfilePage && post.userId !== targetUserId) return;

            // 検索ページの場合はキーワード一致をチェック（本文またはユーザー名）
            if (isSearchPage && filterKeyword !== '') {
                const textMatch = post.text.toLowerCase().includes(filterKeyword);
                const nameMatch = user.name.toLowerCase().includes(filterKeyword);
                const accountMatch = user.account.toLowerCase().includes(filterKeyword);
                if (!textMatch && !nameMatch && !accountMatch) return;
            }

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

    // 初回描画
    renderTimeline(searchQuery.toLowerCase());

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
            // トレンドをクリックしたら検索欄にキーワードが入るようにする
            trendElement.addEventListener('click', () => {
                if (isSearchPage) {
                    const searchInput = document.getElementById('search-input');
                    searchInput.value = trend.keyword;
                    renderTimeline(trend.keyword.toLowerCase());
                } else {
                    window.location.href = `search.html?q=${encodeURIComponent(trend.keyword)}`;
                }
            });
            trendContainer.appendChild(trendElement);
        });
    }
});