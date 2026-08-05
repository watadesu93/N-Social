document.addEventListener('DOMContentLoaded', async () => {
    const isProfilePage = window.location.pathname.includes('profile.html');
    const isSearchPage = window.location.pathname.includes('search.html');
    const isPostPage = window.location.pathname.includes('post.html');
    
    const urlParams = new URLSearchParams(window.location.search);
    const targetUserId = urlParams.get('id') || 'user1';
    const searchQuery = urlParams.get('q') || '';
    const targetPostId = parseInt(urlParams.get('id')) || 1;

    setupModals();

    try {
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

        const userMap = new Map();
        users.forEach(u => userMap.set(u.id, u));
        mobUsers.forEach(u => userMap.set(u.id, u));

        let posts = [...mainPosts, ...mobPosts];
        const mobUserIds = mobUsers.map(u => u.id);
        
        const replyTexts = [
            "初配信楽しみにしてます！絶対見ますね✨",
            "通知オンにして待機してます…！",
            "推しが増えてしまう予感しかしません…",
            "ビジュ良すぎませんか？最高です！",
            "お迎え失礼します！これから応援させてください🙌",
            "待ちに待ったデビューだぁぁぁ！",
            "初配信の準備バッチリです👍頑張ってください！"
        ];

        // 基準となる現在日時（2026年8月5日をベース）
        const baseNow = new Date('2026-08-05T10:46:30').getTime();

        // VTuberの主要な自己紹介ポスト（ID 1, 101〜107など、または画像付き・主要なもの）の日付を半年前〜1年前に分散
        posts.forEach(post => {
            if (post.type !== 'repost' && post.type !== 'reply') {
                // IDをシードにして1年前〜半年前（180日〜365日前）のランダムな日数を算出
                const daysAgo = 180 + ((post.id * 37) % 185); 
                const postTime = new Date(baseNow - daysAgo * 24 * 60 * 60 * 1000);
                
                // 日付フォーマット（例: 2025年11月15日）
                const year = postTime.getFullYear();
                const month = postTime.getMonth() + 1;
                const day = postTime.getDate();
                post.timestamp = `${year}年${month}月${day}日`;
                post._exactTime = postTime.getTime(); // 後の返信日時計算用
            }
        });

        // 返信データの数（3〜7個）と日付（自己紹介から2週間以内）を同期・生成
        let maxPostId = Math.max(...posts.map(p => p.id), 1000);
        posts.forEach(post => {
            if (post.type !== 'repost' && post.type !== 'reply') {
                const parentTime = post._exactTime || (baseNow - 200 * 24 * 60 * 60 * 1000);
                const currentReplies = posts.filter(p => p.replyTo === post.id && p.visible);
                
                let targetCount = currentReplies.length;
                if (targetCount < 3 || targetCount > 7) {
                    targetCount = 3 + (post.id % 5); // 3〜7の範囲
                }
                post.comments = targetCount;

                // 足りない分の返信を作成
                if (currentReplies.length < targetCount) {
                    const needed = targetCount - currentReplies.length;
                    for (let i = 0; i < needed; i++) {
                        maxPostId++;
                        const randomUser = mobUserIds[(maxPostId + post.id) % mobUserIds.length];
                        const randomText = replyTexts[(maxPostId) % replyTexts.length];
                        
                        // 返信日時は、親ポストの日付から0日〜14日（2週間以内）のランダムな後
                        const replyOffsetHours = ((maxPostId * 13) % (14 * 24));
                        const replyTime = new Date(parentTime + replyOffsetHours * 60 * 60 * 1000);
                        const rYear = replyTime.getFullYear();
                        const rMonth = replyTime.getMonth() + 1;
                        const rDay = replyTime.getDate();

                        posts.push({
                            id: maxPostId,
                            userId: randomUser,
                            text: randomText,
                            timestamp: `${rYear}年${rMonth}月${rDay}日`,
                            likes: (maxPostId % 15),
                            reposts: 0,
                            comments: 0,
                            views: "1.0千",
                            replyTo: post.id,
                            visible: true,
                            type: "reply",
                            _exactTime: replyTime.getTime()
                        });
                    }
                }
            }
        });

        // タイムラインの塊を解消するため、ID順だけでなく微小なランダム要素（またはIDのシャッフル感）を加えてソート
        posts.sort((a, b) => {
            const timeA = a._exactTime || (baseNow - a.id * 100000);
            const timeB = b._exactTime || (baseNow - b.id * 100000);
            if (timeB !== timeA) {
                return timeB - timeA;
            }
            return b.id - a.id;
        });

        const postMap = new Map();
        posts.forEach(p => postMap.set(p.id, p));

        setupGlobalSearch();
        setupTrends(trends, isSearchPage);

        if (isProfilePage) {
            renderProfile(targetUserId, userMap, posts);
        } else if (isSearchPage) {
            setupSearchPage(searchQuery, userMap, posts);
        } else if (isPostPage) {
            renderPostDetailPage(targetPostId, userMap, postMap, posts);
        } else {
            renderTimeline(userMap, postMap, posts);
        }
    } catch (error) {
        console.error('データの読み込みに失敗しました:', error);
    }
});

function setupModals() {
    if (!document.getElementById('image-modal')) {
        document.body.insertAdjacentHTML('beforeend', `
            <div id="image-modal">
                <span id="image-modal-close">&times;</span>
                <img id="image-modal-content" src="" alt="Expanded Image">
            </div>
        `);
    }

    if (!document.getElementById('repost-modal')) {
        document.body.insertAdjacentHTML('beforeend', `
            <div id="repost-modal">
                <div style="background-color: #000; width: 90%; max-width: 500px; border-radius: 16px; border: 1px solid #2f3336; padding: 20px; position: relative; color: #e7e9ea;">
                    <span id="repost-modal-close" style="position: absolute; top: 15px; right: 20px; font-size: 24px; cursor: pointer; color: #71767b;">&times;</span>
                    <h3 style="margin-top: 0; font-size: 16px; border-bottom: 1px solid #2f3336; padding-bottom: 10px;">リポストの詳細</h3>
                    <div id="repost-modal-body" style="margin-top: 15px;"></div>
                </div>
            </div>
        `);
    }

    const modal = document.getElementById('image-modal');
    const modalClose = document.getElementById('image-modal-close');
    if (modalClose) modalClose.addEventListener('click', () => modal.style.display = 'none');
    if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

    const repostModal = document.getElementById('repost-modal');
    const repostModalClose = document.getElementById('repost-modal-close');
    if (repostModalClose) repostModalClose.addEventListener('click', () => repostModal.style.display = 'none');
    if (repostModal) repostModal.addEventListener('click', (e) => { if (e.target === repostModal) repostModal.style.display = 'none'; });
}

function showImageModal(src) {
    const modal = document.getElementById('image-modal');
    const modalImg = document.getElementById('image-modal-content');
    modalImg.src = src;
    modal.style.display = 'flex';
}

function createIconHtml(user, customStyle = '') {
    if (!user) return `<div class="post-icon" style="${customStyle}">？</div>`;
    if (user.iconImage && user.iconImage !== "") {
        return `<div class="post-icon" style="background-image: url('${user.iconImage}'); ${customStyle}"></div>`;
    } else {
        return `<div class="post-icon" style="${customStyle}">${user.icon || '名'}</div>`;
    }
}

function createActionsHtml(post) {
    return `
        <div class="post-actions" onclick="event.stopPropagation();">
            <div class="post-action-item reply">💬 <span>${post.comments || 0}</span></div>
            <div class="post-action-item repost action-repost-trigger" data-post-id="${post.id}">🔄 <span>${post.reposts || 0}</span></div>
            <div class="post-action-item like">❤️ <span>${post.likes || 0}</span></div>
            <div class="post-action-item view">📊 <span>${post.views || '2.2万'}</span></div>
        </div>
    `;
}

function openRepostModal(post, userMap, postMap) {
    const repostModal = document.getElementById('repost-modal');
    const bodyElem = document.getElementById('repost-modal-body');
    const targetOriginal = postMap.get(post.repostPostId);

    if (!targetOriginal) {
        bodyElem.innerHTML = `<p style="color: #71767b; font-size: 14px;">元投稿が見つかりません。</p>`;
    } else {
        const origUser = userMap.get(targetOriginal.userId) || { name: '不明', account: '@unknown', icon: '？' };
        let cleanText = targetOriginal.text.replace(/固定されたポスト/g, '').replace(/·\s*固定されたポスト/g, '');
        bodyElem.innerHTML = `
            <div style="display: flex; align-items: flex-start; padding: 12px; background: #16181c; border-radius: 8px; border: 1px solid #2f3336; cursor: pointer;" onclick="window.location.href='post.html?id=${targetOriginal.id}'">
                ${createIconHtml(origUser, 'width: 36px; height: 36px; margin-right: 10px;')}
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; margin-bottom: 4px;">
                        <span style="font-weight: bold; margin-right: 6px; font-size: 14px;">${origUser.name}</span>
                        <span style="color: #71767b; font-size: 12px;">${origUser.account}</span>
                    </div>
                    <div style="font-size: 14px; line-height: 1.4;">${cleanText}</div>
                </div>
            </div>
        `;
    }
    repostModal.style.display = 'flex';
}

function renderPost(post, userMap, postMap, showPinHeader = false) {
    const user = userMap.get(post.userId);
    if (!user) return null;

    const postElement = document.createElement('div');
    postElement.className = 'post';
    postElement.addEventListener('click', (e) => {
        if (e.target.tagName === 'A' || e.target.closest('.post-action-item') || e.target.closest('.post-image-container') || e.target.closest('.quoted-post')) return;
        window.location.href = `post.html?id=${post.id}`;
    });

    let postTimestamp = (post.timestamp || '').replace(/固定されたポスト/g, '').replace(/·/g, '').trim();

    if (post.type === 'repost') {
        const originalPost = postMap.get(post.repostPostId);
        const origUser = originalPost ? userMap.get(originalPost.userId) : null;
        
        let originalContentHtml = `<div style="color: #71767b; font-size: 14px;">元投稿が削除されたか存在しません。</div>`;
        if (originalPost && origUser) {
            let origTime = (originalPost.timestamp || '').replace(/固定されたポスト/g, '').replace(/·/g, '').trim();
            const origImageHtml = originalPost.image ? `<div class="post-image-container timeline-img-trigger" data-img="${originalPost.image}"><img src="${originalPost.image}" alt="Post image"></div>` : '';
            originalContentHtml = `
                <div style="display: flex; align-items: flex-start; margin-bottom: 8px;">
                    ${createIconHtml(origUser, 'width: 32px; height: 32px; margin-right: 10px;')}
                    <div>
                        <span style="font-weight: bold; font-size: 15px;"><a href="profile.html?id=${origUser.id}" class="link-text">${origUser.name}</a></span>
                        <span style="color: #71767b; font-size: 14px;">${origUser.account} · ${origTime}</span>
                    </div>
                </div>
                <div class="post-text">${originalPost.text}</div>
                ${origImageHtml}
            `;
        }

        postElement.innerHTML = `
            ${createIconHtml(user)}
            <div class="post-content">
                <div class="repost-indicator">🔄 ${user.name}さんがリポストしました</div>
                <div class="quoted-post" onclick="window.location.href='post.html?id=${originalPost ? originalPost.id : post.id}'">
                    ${originalContentHtml}
                </div>
                ${createActionsHtml(post)}
            </div>
        `;

        const quotedImg = postElement.querySelector('.timeline-img-trigger');
        if (quotedImg) {
            quotedImg.addEventListener('click', (e) => {
                e.stopPropagation();
                showImageModal(quotedImg.getAttribute('data-img'));
            });
        }
    } else {
        let pinHtml = (showPinHeader && post.pinned) ? `<div class="pin-header">\uD83D\uDCCC ピン留めされたポスト</div>` : '';
        let imageHtml = post.image ? `<div class="post-image-container timeline-img-trigger" data-img="${post.image}"><img src="${post.image}" alt="Post image"></div>` : '';
        
        let quoteHtml = '';
        if (post.type === 'quote' && post.quotePostId) {
            const qPost = postMap.get(post.quotePostId);
            const qUser = qPost ? userMap.get(qPost.userId) : null;
            if (qPost && qUser) {
                quoteHtml = `
                    <div class="quoted-post" onclick="window.location.href='post.html?id=${qPost.id}'">
                        <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                            <span style="font-weight: bold; font-size: 14px;">${qUser.name}</span>
                            <span style="color: #71767b; font-size: 13px;">${qUser.account}</span>
                        </div>
                        <div style="font-size: 14px; margin-bottom: 0;">${qPost.text}</div>
                    </div>
                `;
            }
        }

        postElement.innerHTML = `
            ${createIconHtml(user)}
            <div class="post-content">
                ${pinHtml}
                <div class="post-header">
                    <span class="post-name"><a href="profile.html?id=${user.id}" class="link-text">${user.name}</a></span>
                    <span class="post-account">${user.account}</span>
                    <span class="post-time">· ${postTimestamp}</span>
                </div>
                <div class="post-text">${post.text}</div>
                ${quoteHtml}
                ${imageHtml}
                ${createActionsHtml(post)}
            </div>
        `;

        const imgTrigger = postElement.querySelector('.timeline-img-trigger');
        if (imgTrigger) {
            imgTrigger.addEventListener('click', (e) => {
                e.stopPropagation();
                showImageModal(post.image);
            });
        }
    }

    const repostBtn = postElement.querySelector('.action-repost-trigger');
    if (repostBtn) {
        repostBtn.addEventListener('click', () => openRepostModal(post, userMap, postMap));
    }

    return postElement;
}

function renderTimeline(userMap, postMap, posts, filterUserId = null, filterKeyword = '') {
    const timeline = document.getElementById('timeline');
    if (!timeline) return;
    timeline.innerHTML = '';

    posts.forEach(post => {
        if (!post.visible) return;
        if (filterUserId && post.userId !== filterUserId) return;

        if (filterKeyword !== '') {
            const user = userMap.get(post.userId);
            const textMatch = post.text.toLowerCase().includes(filterKeyword);
            const nameMatch = user && user.name.toLowerCase().includes(filterKeyword);
            const accountMatch = user && user.account.toLowerCase().includes(filterKeyword);
            if (!textMatch && !nameMatch && !accountMatch) return;
        }

        const el = renderPost(post, userMap, postMap, false);
        if (el) timeline.appendChild(el);
    });
}

function renderProfile(targetUserId, userMap, posts) {
    const profileUser = userMap.get(targetUserId);
    if (!profileUser) return;

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
    } else {
        largeIconElem.textContent = profileUser.icon || '名';
    }
    
    const bannerElement = document.querySelector('.profile-banner');
    if (profileUser.bannerImage && profileUser.bannerImage !== "") {
        bannerElement.style.backgroundImage = `url('${profileUser.bannerImage}')`;
    } else if (profileUser.bannerColor) {
        bannerElement.style.backgroundColor = profileUser.bannerColor;
    }

    const profilePosts = posts.filter(p => p.userId === targetUserId);
    profilePosts.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        const timeA = a._exactTime || 0;
        const timeB = b._exactTime || 0;
        return timeB - timeA;
    });

    const timeline = document.getElementById('timeline');
    if (timeline) {
        timeline.innerHTML = '';
        profilePosts.forEach(post => {
            if (!post.visible) return;
            const el = renderPost(post, userMap, new Map(posts.map(p => [p.id, p])), true);
            if (el) timeline.appendChild(el);
        });
    }

    const tabs = document.querySelectorAll('.profile-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            tabs.forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            const tabType = e.target.getAttribute('data-tab');
            const timeline = document.getElementById('timeline');
            timeline.innerHTML = '';

            if (tabType === 'posts') {
                const pPosts = posts.filter(p => p.userId === targetUserId);
                pPosts.sort((a, b) => {
                    if (a.pinned && !b.pinned) return -1;
                    if (!a.pinned && b.pinned) return 1;
                    const timeA = a._exactTime || 0;
                    const timeB = b._exactTime || 0;
                    return timeB - timeA;
                });
                pPosts.forEach(post => {
                    if (!post.visible) return;
                    const el = renderPost(post, userMap, new Map(posts.map(p => [p.id, p])), true);
                    if (el) timeline.appendChild(el);
                });
            } else if (tabType === 'media') {
                const mediaPosts = posts.filter(p => p.visible && p.userId === targetUserId && p.image && p.image !== "");
                if (mediaPosts.length === 0) {
                    timeline.innerHTML = `<div style="padding: 40px; text-align: center; color: #71767b;">メディア付きの投稿はありません。</div>`;
                    return;
                }
                const gridContainer = document.createElement('div');
                gridContainer.className = 'media-grid';
                mediaPosts.forEach(post => {
                    const gridItem = document.createElement('div');
                    gridItem.className = 'media-grid-item';
                    gridItem.style.backgroundImage = `url('${post.image}')`;
                    gridItem.addEventListener('click', () => window.location.href = `post.html?id=${post.id}`);
                    gridContainer.appendChild(gridItem);
                });
                timeline.appendChild(gridContainer);
            } else if (tabType === 'replies') {
                const replyPosts = posts.filter(p => p.visible && p.userId === targetUserId && p.type === 'reply');
                if (replyPosts.length === 0) {
                    timeline.innerHTML = `<div style="padding: 40px; text-align: center; color: #71767b;">まだ返信はありません。</div>`;
                    return;
                }
                const postMap = new Map(posts.map(p => [p.id, p]));
                replyPosts.forEach(p => {
                    const el = renderPost(p, userMap, postMap, false);
                    if (el) timeline.appendChild(el);
                });
            }
        });
    });
}

function setupSearchPage(searchQuery, userMap, posts) {
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.value = searchQuery;
        renderTimeline(userMap, new Map(posts.map(p => [p.id, p])), posts, null, searchQuery.toLowerCase());
        searchInput.addEventListener('input', (e) => {
            renderTimeline(userMap, new Map(posts.map(p => [p.id, p])), posts, null, e.target.value.toLowerCase());
        });
    }
}

function renderPostDetailPage(targetPostId, userMap, postMap, posts) {
    const targetPost = postMap.get(targetPostId);
    const parentContainer = document.getElementById('parent-container');
    const singleContainer = document.getElementById('single-post-container');
    const repliesContainer = document.getElementById('replies-container');

    if (!targetPost) return;

    if (targetPost.replyTo) {
        const parentPost = postMap.get(targetPost.replyTo);
        if (parentPost && parentContainer) {
            const parentEl = renderPost(parentPost, userMap, postMap, false);
            if (parentEl) parentContainer.appendChild(parentEl);
        }
    }

    if (singleContainer) {
        const el = renderPost(targetPost, userMap, postMap, false);
        if (el) singleContainer.appendChild(el);
    }

    if (repliesContainer) {
        repliesContainer.innerHTML = '';
        const replies = posts.filter(p => p.replyTo === targetPostId && p.visible);
        if (replies.length > 0) {
            replies.forEach(reply => {
                const el = renderPost(reply, userMap, postMap, false);
                if (el) repliesContainer.appendChild(el);
            });
        } else {
            repliesContainer.innerHTML = `<div style="padding: 40px; text-align: center; color: #71767b;">このポストへの返信はありません。</div>`;
        }
    }
}

function setupGlobalSearch() {
    const globalInput = document.getElementById('global-search-input');
    if (globalInput) {
        globalInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && globalInput.value.trim() !== '') {
                window.location.href = `search.html?q=${encodeURIComponent(globalInput.value.trim())}`;
            }
        });
    }
}

function setupTrends(trends, isSearchPage) {
    const trendContainer = document.getElementById('trend-list');
    if (!trendContainer) return;
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
                searchInput.dispatchEvent(new Event('input'));
            } else {
                window.location.href = `search.html?q=${encodeURIComponent(trend.keyword)}`;
            }
        });
        trendContainer.appendChild(trendElement);
    });
}