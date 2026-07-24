document.addEventListener('DOMContentLoaded', async () => {
    const isProfilePage = window.location.pathname.includes('profile.html');
    const isSearchPage = window.location.pathname.includes('search.html');
    const isPostPage = window.location.pathname.includes('post.html');
    
    const urlParams = new URLSearchParams(window.location.search);
    const targetUserId = urlParams.get('id') || 'user1';
    const searchQuery = urlParams.get('q') || '';
    const targetPostId = parseInt(urlParams.get('id')) || 1;

    // 画像拡大用モーダルのHTMLを自動生成して追加
    if (!document.getElementById('image-modal')) {
        const modalHtml = `
            <div id="image-modal">
                <span id="image-modal-close">&times;</span>
                <img id="image-modal-content" src="" alt="Expanded Image">
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    const modal = document.getElementById('image-modal');
    const modalImg = document.getElementById('image-modal-content');
    const modalClose = document.getElementById('image-modal-close');

    if (modalClose) {
        modalClose.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

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

    function createIconHtml(user, customStyle = '') {
        if (user.iconImage && user.iconImage !== "") {
            return `<div class="post-icon" style="background-image: url('${user.iconImage}'); ${customStyle}"></div>`;
        } else {
            return `<div class="post-icon" style="${customStyle}">${user.icon}</div>`;
        }
    }

    // X風アクションバーのHTMLを生成するヘルパー関数
    function createActionsHtml(post) {
        return `
            <div class="post-actions" onclick="event.stopPropagation();">
                <div class="post-action-item reply">💬 <span>${post.comments || 0}</span></div>
                <div class="post-action-item repost">🔄 <span>${post.reposts || 0}</span></div>
                <div class="post-action-item like">❤️ <span>${post.likes || 0}</span></div>
                <div class="post-action-item view">📊 <span>${post.views || '2.2万'}</span></div>
                <div class="post-action-item bookmark">🔖</div>
                <div class="post-action-item share">⤴</div>
            </div>
        `;
    }

    // プロフィールページの処理
    if (isProfilePage) {
        const profileUser = userMap.get(targetUserId);
        if (profileUser) {
            document.getElementById('profile-header-name').textContent = profileUser.name;
            document.getElementById('profile-name').textContent = profileUser.name;
            document.getElementById('profile-account').textContent = profileUser.account;
            document.getElementById('profile-bio').textContent = profileUser.bio;
            
            document.getElementById('profile-following').textContent = profileUser.following || 0;
            document.getElementById('profile-followers').textContent = profileUser.followers || 0;
            
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

    function renderProfileTabContent(tabType, profileUser) {
        const timeline = document.getElementById('timeline');
        if (!timeline) return;
        timeline.innerHTML = '';

        if (tabType === 'posts') {
            renderTimeline();
        } else if (tabType === 'media') {
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
                const imageHtml = (targetPost.image && targetPost.image !== "") ? `<div class="post-image-container" id="detail-img-box"><img src="${targetPost.image}" alt="Post image"></div>` : '';
                
                singleContainer.innerHTML = `
                    <div class="single-post" style="padding: 15px 20px;">
                        <div class="post-header" style="margin-bottom: 12px;">
                            ${iconHtml}
                            <div>
                                <div class="post-name">
                                    <a href="profile.html?id=${user.id}" class="link-text">${user.name}</a>
                                </div>
                                <div class="post-account">${user.account}</div>
                            </div>
                        </div>
                        <div class="post-text" style="font-size: 17px;">${targetPost.text}</div>
                        ${imageHtml}
                        <div style="color: var(--text-muted); font-size: 14px; padding: 12px 0; border-bottom: 1px solid var(--border-color);">${targetPost.timestamp}</div>
                        ${createActionsHtml(targetPost)}
                    </div>
                `;

                // 詳細ページの画像クリックで拡大
                const imgBox = document.getElementById('detail-img-box');
                if (imgBox) {
                    imgBox.addEventListener('click', () => {
                        modalImg.src = targetPost.image;
                        modal.style.display = 'flex';
                    });
                }
            }

            // 指定した投稿（targetPostId）に対するリプライ（replyToが一致するもの）を抽出して描画
            if (repliesContainer) {
                repliesContainer.innerHTML = '';
                const replies = posts.filter(p => p.replyTo === targetPostId && p.visible);

                if (replies.length > 0) {
                    replies.forEach(replyPost => {
                        const replyUser = userMap.get(replyPost.userId);
                        if (!replyUser) return;

                        const replyElement = document.createElement('div');
                        replyElement.className = 'post';
                        replyElement.addEventListener('click', (e) => {
                            if (e.target.tagName === 'A' || e.target.closest('.post-action-item') || e.target.closest('.post-image-container')) return;
                            window.location.href = `post.html?id=${replyPost.id}`;
                        });

                        const replyIconHtml = createIconHtml(replyUser);
                        let replyImageHtml = '';
                        if (replyPost.image && replyPost.image !== "") {
                            replyImageHtml = `
                                <div class="post-image-container timeline-img-trigger">
                                    <img src="${replyPost.image}" alt="Post image">
                                </div>
                            `;
                        }

                        replyElement.innerHTML = `
                            ${replyIconHtml}
                            <div class="post-content">
                                <div class="post-header">
                                    <span class="post-name">
                                        <a href="profile.html?id=${replyUser.id}" class="link-text">${replyUser.name}</a>
                                    </span>
                                    <span class="post-account">${replyUser.account}</span>
                                    <span class="post-time">· ${replyPost.timestamp}</span>
                                </div>
                                <div class="post-text">${replyPost.text}</div>
                                ${replyImageHtml}
                                ${createActionsHtml(replyPost)}
                            </div>
                        `;

                        // リプライ内の画像クリック拡大
                        const imgTrigger = replyElement.querySelector('.timeline-img-trigger');
                        if (imgTrigger && replyPost.image) {
                            imgTrigger.addEventListener('click', (e) => {
                                e.stopPropagation();
                                modalImg.src = replyPost.image;
                                modal.style.display = 'flex';
                            });
                        }

                        repliesContainer.appendChild(replyElement);
                    });
                } else {
                    // 返信が一件もない場合
                    renderEmptyMessage('このポストへの返信はありません。');
                }
            }
        }
    }

    // タイムライン描画関数
    function renderTimeline(filterKeyword = '') {
        const timeline = document.getElementById('timeline');
        if (!timeline) return;
        timeline.innerHTML = '';

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
                if (e.target.tagName === 'A' || e.target.closest('.post-action-item') || e.target.closest('.post-image-container')) return;
                window.location.href = `post.html?id=${post.id}`;
            });

            const iconHtml = createIconHtml(user);
            
            let pinHtml = '';
            if (post.pinned && isProfilePage) {
                pinHtml = `<div class="pin-header">📌 ピン留めされたポスト</div>`;
            }

            let imageHtml = '';
            if (post.image && post.image !== "") {
                imageHtml = `
                    <div class="post-image-container timeline-img-trigger">
                        <img src="${post.image}" alt="Post image">
                    </div>
                `;
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
                    ${createActionsHtml(post)}
                </div>
            `;

            const imgTrigger = postElement.querySelector('.timeline-img-trigger');
            if (imgTrigger && post.image) {
                imgTrigger.addEventListener('click', (e) => {
                    e.stopPropagation();
                    modalImg.src = post.image;
                    modal.style.display = 'flex';
                });
            }

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