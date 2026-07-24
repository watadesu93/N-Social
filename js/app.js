document.addEventListener('DOMContentLoaded', async () => {
    const isProfilePage = window.location.pathname.includes('profile.html');
    const isSearchPage = window.location.pathname.includes('search.html');
    const isPostPage = window.location.pathname.includes('post.html');
    
    const urlParams = new URLSearchParams(window.location.search);
    const targetUserId = urlParams.get('id') || 'user1';
    const searchQuery = urlParams.get('q') || '';
    const targetPostId = parseInt(urlParams.get('id')) || 1;

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

    // アイコンのHTML/スタイルを生成するヘルパー関数
    function createIconHtml(user, customStyle = '') {
        if (user.iconImage && user.iconImage !== "") {
            return `<div class="post-icon" style="background-image: url('${user.iconImage}'); ${customStyle}"></div>`;
        } else {
            return `<div class="post-icon" style="${customStyle}">${user.icon}</div>`;
        }
    }

    // プロフィールページの処理
    if (isProfilePage) {
        const profileUser = userMap.get(targetUserId);
        if (profileUser) {
            document.getElementById('profile-header-name').textContent = profileUser.name;
            document.getElementById('profile-name').textContent = profileUser.name;
            document.getElementById('profile-account').textContent = profileUser.account;
            document.getElementById('profile-bio').textContent = profileUser.bio;
            
            // フォロー・フォロワー数
            document.getElementById('profile-following').textContent = profileUser.following || 0;
            document.getElementById('profile-followers').textContent = profileUser.followers || 0;
            
            // プロフィール大アイコンの切替
            const largeIconElem = document.getElementById('profile-icon');
            if (profileUser.iconImage && profileUser.iconImage !== "") {
                largeIconElem.textContent = "";
                largeIconElem.style.backgroundImage = `url('${profileUser.iconImage}')`;
                largeIconElem.style.backgroundSize = "cover";
                largeIconElem.style.backgroundPosition = "center";
            } else {
                largeIconElem.textContent = profileUser.icon;
            }
            
            const bannerElement = document.querySelector('.profile-banner');
            if (profileUser.bannerImage && profileUser.bannerImage !== "") {
                bannerElement.style.backgroundImage = `url('${profileUser.bannerImage}')`;
            } else if (profileUser.bannerColor) {
                bannerElement.style.backgroundColor = profileUser.bannerColor;
            }

            // タブ切り替えのイベント設定
            const tabs = document.querySelectorAll('.profile-tab');
            tabs.forEach(tab => {
                tab.addEventListener('click', (e) => {
                    tabs.forEach(t => t.classList.remove('active'));
                    e.target.classList.add('active');

                    const tabType = e.target.getAttribute('data-tab');
                    renderProfileTabContent(tabType, profileUser);
                });
            });
        }
    }

    // プロフィール画面のタブごとのコンテンツ描画
    function renderProfileTabContent(tabType, profileUser) {
        const timeline = document.getElementById('timeline');
        if (!timeline) return;
        timeline.innerHTML = '';

        if (tabType === 'posts') {
            renderTimeline();
        } else if (tabType === 'media') {
            // メディアタブ：画像付きの投稿をグリッド状に識別表示
            const mediaPosts = posts.filter(p => p.visible && p.userId === targetUserId && p.image && p.image !== "");
            
            if (mediaPosts.length === 0) {
                renderEmptyMessage('メディア付きの投稿はありません。');
                return;
            }

            const gridContainer = document.createElement('div');
            gridContainer.className = 'media-grid';

            mediaPosts.forEach(post => {
                const gridItem = document.createElement('div');
                gridItem.className = 'media-grid-item';
                gridItem.style.backgroundImage = `url('${post.image}')`;
                gridItem.addEventListener('click', () => {
                    window.location.href = `post.html?id=${post.id}`;
                });
                gridContainer.appendChild(gridItem);
            });

            timeline.appendChild(gridContainer);
        } else {
            // その他のタブ（返信・ハイライト・いいね）
            const messages = {
                replies: 'まだ返信はありません。',
                highlights: 'ハイライトに登録された投稿はありません。',
                likes: 'いいねした投稿は非公開です。'
            };
            renderEmptyMessage(messages[tabType] || '投稿はありません。');
        }
    }

    function renderEmptyMessage(text) {
        const timeline = document.getElementById('timeline');
        const emptyDiv = document.createElement('div');
        emptyDiv.style.cssText = 'padding: 40px; text-align: center; color: var(--text-muted); font-size: 15px;';
        emptyDiv.textContent = text;
        timeline.appendChild(emptyDiv);
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
                const iconHtml = createIconHtml(user);
                const imageHtml = (targetPost.image && targetPost.image !== "") ? `<div class="post-image-container"><img src="${targetPost.image}" alt="Post image"></div>` : '';
                
                singleContainer.innerHTML = `
                    <div class="single-post">
                        <div class="single-post-header">
                            ${iconHtml}
                            <div>
                                <div class="post-name">
                                    <a href="profile.html?id=${user.id}" class="link-text">${user.name}</a>
                                </div>
                                <div class="post-account">${user.account}</div>
                            </div>
                        </div>
                        <div class="single-post-text">${targetPost.text}</div>
                        ${imageHtml}
                        <div class="single-post-meta">${targetPost.timestamp}</div>
                        <div class="single-post-stats">
                            <span><strong>${targetPost.reposts}</strong> リポスト</span>
                            <span><strong>${targetPost.likes}</strong> いいね</span>
                        </div>
                    </div>
                `;
            }

            if (repliesContainer) {
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

    // タイムライン描画関数（固定ツイートを常に一番上に配置する機能付き）
    function renderTimeline(filterKeyword = '') {
        const timeline = document.getElementById('timeline');
        if (!timeline) return;
        timeline.innerHTML = '';

        // 固定ツイート（pinned: true）を先頭にするため、配列を並び替え
        const sortedPosts = [...posts].sort((a, b) => {
            if (a.pinned) return -1;
            if (b.pinned) return 1;
            return 0;
        });

        sortedPosts.forEach(post => {
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
            postElement.addEventListener('click', (e) => {
                if (e.target.tagName === 'A') return;
                window.location.href = `post.html?id=${post.id}`;
            });

            const iconHtml = createIconHtml(user);
            
            // 固定ツイート用の「ピン留め」表示
            let pinHtml = '';
            if (post.pinned && isProfilePage) {
                pinHtml = `<div class="pin-header">📌 ピン留めされたポスト</div>`;
            }

            // 画像がある場合のHTML生成
            let imageHtml = '';
            if (post.image && post.image !== "") {
                imageHtml = `<div class="post-image-container"><img src="${post.image}" alt="Post image"></div>`;
            }

            postElement.innerHTML = `
                ${iconHtml}
                <div class="post-content">
                    ${pinHtml}
                    <div class="post-header">
                        <span class="post-name">
                            <a href="profile.html?id=${user.id}" class="link-text">${user.name}</a>
                        </span>
                        <span class="post-account">${user.account}</span>
                        <span class="post-time">· ${post.timestamp}</span>
                    </div>
                    <div class="post-text">${post.text}</div>
                    ${imageHtml}
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