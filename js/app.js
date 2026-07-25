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

    // リポスト詳細・確認用モーダルのHTMLを自動生成して追加
    if (!document.getElementById('repost-modal')) {
        const repostModalHtml = `
            <div id="repost-modal" style="display:none; position:fixed; z-index:9999; left:0; top:0; width:100%; height:100%; background-color:rgba(0,0,0,0.85); align-items:center; justifyContent:center;">
                <div style="background-color: var(--card-bg); width: 90%; max-width: 500px; border-radius: 16px; border: 1px solid var(--border-color); padding: 20px; position: relative; color: var(--text-main);">
                    <span id="repost-modal-close" style="position: absolute; top: 15px; right: 20px; font-size: 24px; cursor: pointer; color: var(--text-muted);">&times;</span>
                    <h3 style="margin-top: 0; font-size: 16px; border-bottom: 1px solid var(--border-color); padding-bottom: 10px;">リポストの詳細</h3>
                    <div id="repost-modal-body" style="margin-top: 15px;"></div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', repostModalHtml);
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

    // リポストモーダルの閉じる処理
    const repostModal = document.getElementById('repost-modal');
    const repostModalClose = document.getElementById('repost-modal-close');
    if (repostModalClose) {
        repostModalClose.addEventListener('click', () => {
            repostModal.style.display = 'none';
        });
    }
    if (repostModal) {
        repostModal.addEventListener('click', (e) => {
            if (e.target === repostModal) {
                repostModal.style.display = 'none';
            }
        });
    }

    // データの読み込み（ユーザー情報、ポスト、トレンドを分割ファイルからまとめて取得）
    const [usersRes, mobUsersRes, postsRes, mobPostsRes, trendsRes] = await Promise.all([
        fetch('data/users.json'),
        fetch('data/mob_users.json'),
        fetch('data/posts.json'),
        fetch('data/mob_posts.json'),
        fetch('data/trends.json')
    ]);

    const users = await usersRes.json();
    const mobUsers = await mobUsersRes.json();
    const mainPosts = await postsRes.json();
    const mobPosts = await mobPostsRes.json();
    const trends = await trendsRes.json();

    // メインユーザーとモブユーザーを一つのマップに結合
    const userMap = new Map();
    users.forEach(u => userMap.set(u.id, u));
    mobUsers.forEach(u => userMap.set(u.id, u));

    // メインポストとモブポストを一つの配列に結合し、IDや新しい順に並び替え
    const posts = [...mainPosts, ...mobPosts];
    posts.sort((a, b) => b.id - a.id);

    function createIconHtml(user, customStyle = '') {
        if (!user) {
            return `<div class="post-icon" style="${customStyle}">？</div>`;
        }
        if (user.iconImage && user.iconImage !== "") {
            return `<div class="post-icon" style="background-image: url('${user.iconImage}'); ${customStyle}"></div>`;
        } else {
            return `<div class="post-icon" style="${customStyle}">${user.icon || '名'}</div>`;
        }
    }

    // X風アクションバーのHTMLを生成するヘルパー関数（リポストボタンクリック時に詳細を見られるイベントを付与）
    function createActionsHtml(post) {
        return `
            <div class="post-actions" onclick="event.stopPropagation();">
                <div class="post-action-item reply">💬 <span>${post.comments || 0}</span></div>
                <div class="post-action-item repost action-repost-trigger" data-post-id="${post.id}">🔄 <span>${post.reposts || 0}</span></div>
                <div class="post-action-item like">❤️ <span>${post.likes || 0}</span></div>
                <div class="post-action-item view">📊 <span>${post.views || '2.2万'}</span></div>
                <div class="post-action-item bookmark">🔖</div>
                <div class="post-action-item share">⤴</div>
            </div>
        `;
    }

    // リポスト詳細を表示する関数
    function openRepostModal(post) {
        const bodyElem = document.getElementById('repost-modal-body');
        if (!post.repostedPost) {
            // repostedPost が定義されていない場合のフォールバック表示
            bodyElem.innerHTML = `
                <p style="color: var(--text-muted); font-size: 14px; margin-bottom: 10px;">この記事をリポストしたユーザー、またはリポスト元のデータです。</p>
                <div style="padding: 10px; background: var(--bg-color); border-radius: 8px; border: 1px solid var(--border-color);">
                    <p style="margin: 0; font-size: 14px;">このポストのリポスト数は <strong>${post.reposts || 0}</strong> 件です。</p>
                </div>
            `;
        } else {
            const originalUser = userMap.get(post.repostedPost.userId) || { name: '不明なユーザー', account: '@unknown', icon: '？' };
            const origIconHtml = createIconHtml(originalUser, 'width: 36px; height: 36px; margin-right: 10px;');
            bodyElem.innerHTML = `
                <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 10px;">🔄 リポスト元の投稿</p>
                <div style="display: flex; align-items: flex-start; padding: 12px; background: var(--bg-color); border-radius: 8px; border: 1px solid var(--border-color);">
                    ${origIconHtml}
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; margin-bottom: 4px;">
                            <span style="font-weight: bold; margin-right: 6px; font-size: 14px;">${originalUser.name}</span>
                            <span style="color: var(--text-muted); font-size: 12px;">${originalUser.account}</span>
                        </div>
                        <div style="font-size: 14px; line-height: 1.4; white-space: pre-wrap;">${post.repostedPost.text}</div>
                    </div>
                </div>
            `;
        }
        repostModal.style.display = 'flex';
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
                largeIconElem.textContent = profileUser.icon || '名';
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
                
                // リポスト表示用のHTMLブロック（データがある場合）
                let repostHeaderHtml = '';
                if (targetPost.repostedBy) {
                    repostHeaderHtml = `<div style="color: var(--text-muted); font-size: 13px; margin-bottom: 8px;">🔄 ${targetPost.repostedBy}さんがリポストしました</div>`;
                }

                singleContainer.innerHTML = `
                    <div class="single-post" style="padding: 15px 20px;">
                        ${repostHeaderHtml}
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

                // リポストボタンのイベントリスナー設定
                const repostBtn = singleContainer.querySelector('.action-repost-trigger');
                if (repostBtn) {
                    repostBtn.addEventListener('click', () => {
                        openRepostModal(targetPost);
                    });
                }
            }

            // 指定した投稿に対するリプライを抽出して描画
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

                        // リプライ内のリポストボタン
                        const replyRepostBtn = replyElement.querySelector('.action-repost-trigger');
                        if (replyRepostBtn) {
                            replyRepostBtn.addEventListener('click', () => {
                                openRepostModal(replyPost);
                            });
                        }

                        repliesContainer.appendChild(replyElement);
                    });
                } else {
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

            // リポスト情報表示
            let repostHeaderHtml = '';
            if (post.repostedBy) {
                repostHeaderHtml = `<div style="color: var(--text-muted); font-size: 13px; margin-bottom: 6px;">🔄 ${post.repostedBy}さんがリポストしました</div>`;
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
                    ${repostHeaderHtml}
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

            // タイムライン上のリポストボタンクリック時の動作
            const timelineRepostBtn = postElement.querySelector('.action-repost-trigger');
            if (timelineRepostBtn) {
                timelineRepostBtn.addEventListener('click', () => {
                    openRepostModal(post);
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