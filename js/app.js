document.addEventListener('DOMContentLoaded', async () => {
    const isProfilePage = window.location.pathname.includes('profile.html');
    const isSearchPage = window.location.pathname.includes('search.html');
    const isPostPage = window.location.pathname.includes('post.html');
    
    const urlParams = new URLSearchParams(window.location.search);
    const targetUserId = urlParams.get('id') || 'user1';
    const searchQuery = urlParams.get('q') || '';
    const targetPostId = parseInt(urlParams.get('id')) || 1; // 投稿詳細用ID

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

    // プロフィールページの処理
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

    // 検索ページの処理
    if (isSearchPage) {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.value = searchQuery;
            searchInput.addEventListener('input', (e) => {
                renderTimeline(e.target.value.toLowerCase());
            });
        }
    }

    // 投稿詳細ページの処理
    if (isPostPage) {
        const targetPost = posts.find(p => p.id === targetPostId);
        const singleContainer = document.getElementById('single-post-container');
        const repliesContainer = document.getElementById('replies-container');

        if (targetPost) {
            const user = userMap.get(targetPost.userId);
            if (user && singleContainer) {
                singleContainer.innerHTML = `
                    <div class="single-post">
                        <div class="single-post-header">
                            <div class="post-icon">${user.icon}</div>
                            <div>
                                <div class="post-name">
                                    <a href="profile.html?id=${user.id}" class="link-text">${user.name}</a>
                                </div>
                                <div class="post-account">${user.account}</div>
                            </div>
                        </div>
                        <div class="single-post-text">${targetPost.text}</div>
                        <div class="single-post-meta">${targetPost.timestamp}</div>
                        <div class="single-post-stats">
                            <span><strong>${targetPost.reposts}</strong> リポスト</span>
                            <span><strong>${targetPost.likes}</strong> いいね</span>
                        </div>
                    </div>
                `;
            }

            // 返信（フェイクのリプライや紐づくコメントの表示）
            if (repliesContainer) {
                // サンプルとして、同じユーザーや別ユーザーからのリプライを表示
                repliesContainer.innerHTML = `
                    <div class="reply-post">
                        <div class="post-icon" style="width:38px; height:38px; font-size:14px;">N</div>
                        <div class="post-content">
                            <div class="post-header">
                                <span class="post-name">名無しさん</span>
                                <span class="post-account">@nanashi_774</span>
                                <span class="post-time">· 11:10 AM</span>
                            </div>
                            <div class="post-text">これ本当に対策したほうがいいよ……。</div>
                        </div>
                    </div>
                `;
            }
        }
    }

    // タイムライン描画関数（ホーム・プロフィール・検索用）
    function renderTimeline(filterKeyword = '') {
        const timeline = document.getElementById('timeline');
        if (!timeline) return;
        timeline.innerHTML = '';

        posts.forEach(post => {
            if (!post.visible) return;

            const user = userMap.get(post.userId);
            if (!user) return;

            if (isProfilePage && post.userId !== targetUserId) return;

            if (isSearchPage && filterKeyword !== '') {
                const textMatch = post.text.toLowerCase().includes(filterKeyword);
                const nameMatch = user.name.toLowerCase().includes(filterKeyword);
                const accountMatch = user.account.toLowerCase().includes(filterKeyword);
                if (!textMatch && !nameMatch && !accountMatch) return;
            }

            const postElement = document.createElement('div');
            postElement.className = 'post';
            // 投稿をクリックしたら詳細ページへ飛ぶようにする
            postElement.addEventListener('click', (e) => {
                // 名前部分（プロフィールリンク）をクリックしたときは詳細ページに飛ばないようにする
                if (e.target.tagName === 'A') return;
                window.location.href = `post.html?id=${post.id}`;
            });

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

    if (!isPostPage) {
        renderTimeline(searchQuery.toLowerCase());
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