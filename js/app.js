document.addEventListener('DOMContentLoaded', async () => {
    const isProfilePage = window.location.pathname.includes('profile.html');
    const isSearchPage = window.location.pathname.includes('search.html');
    const isPostPage = window.location.pathname.includes('post.html');
    
    const urlParams = new URLSearchParams(window.location.search);
    const targetUserId = urlParams.get('id') || 'user1';
    const searchQuery = urlParams.get('q') || '';
    const targetPostId = parseInt(urlParams.get('id')) || 1;

    setupModals();

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

    const posts = [...mainPosts, ...mobPosts];
    posts.sort((a, b) => b.id - a.id);
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
            <div class="post-action-item bookmark">🔖</div>
            <div class="post-action-item share">⤴</div>
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
        bodyElem.innerHTML = `
            <div style="display: flex; align-items: flex-start; padding: 12px; background: #16181c; border-radius: 8px; border: 1px solid #2f3336; cursor: pointer;" onclick="window.location.href='post.html?id=${targetOriginal.id}'">
                ${createIconHtml(origUser, 'width: 36px; height: 36px; margin-right: 10px;')}
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; margin-bottom: 4px;">
                        <span style="font-weight: bold; margin-right: 6px; font-size: 14px;">${origUser.name}</span>
                        <span style="color: #71767b; font-size: 12px;">${origUser.account}</span>
                    </div>
                    <div style="font-size: 14px; line-height: 1.4;">${targetOriginal.text}</div>
                </div>
            </div>
        `;
    }
    repostModal.style.display = 'flex';
}

function renderPost(post, userMap, postMap) {
    const user = userMap.get(post.userId);
    if (!user) return null;

    const postElement = document.createElement('div');
    postElement.className = 'post';
    postElement.addEventListener('click', (e) => {
        if (e.target.tagName === 'A' || e.target.closest('.post-action-item') || e.target.closest('.post-image-container') || e.target.closest('.quoted-post')) return;
        window.location.href = `post.html?id=${post.id}`;
    });

    if (post.type === 'repost') {
        const originalPost = postMap.get(post.repostPostId);
        const origUser = originalPost ? userMap.get(originalPost.userId) : null;
        
        let originalContentHtml = `<div style="color: #71767b; font-size: 14px;">元投稿が削除されたか存在しません。</div>`;
        if (originalPost && origUser) {
            const origImageHtml = originalPost.image ? `<div class="post-image-container timeline-img-trigger" data-img="${originalPost.image}"><img src="${originalPost.image}" alt="Post image"></div>` : '';
            originalContentHtml = `
                <div style="display: flex; align-items: flex-start; margin-bottom: 8px;">
                    ${createIconHtml(origUser, 'width: 32px; height: 32px; margin-right: 10px;')}
                    <div>
                        <span style="font-weight: bold; font-size: 15px;"><a href="profile.html?id=${origUser.id}" class="link-text">${origUser.name}</a></span>
                        <span style="color: #71767b; font-size: 14px;">${origUser.account} · ${originalPost.timestamp}</span>
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
        let pinHtml = post.pinned ? `<div class="pin-header">📌 ピン留めされたポスト</div>` : '';
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
                    <span class="post-time">· ${post.timestamp}</span>
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

    const sortedPosts = [...posts].sort((a, b) => {
        if (a.pinned) return -1;
        if (b.pinned) return 1;
        return 0;
    });

    sortedPosts.forEach(post => {
        if (!post.visible) return;
        if (filterUserId && post.userId !== filterUserId) return;

        if (filterKeyword !== '') {
            const user = userMap.get(post.userId);
            const textMatch = post.text.toLowerCase().includes(filterKeyword);
            const nameMatch = user && user.name.toLowerCase().includes(filterKeyword);
            const accountMatch = user && user.account.toLowerCase().includes(filterKeyword);
            if (!textMatch && !nameMatch && !accountMatch) return;
        }

        const el = renderPost(post, userMap, postMap);
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

    renderTimeline(userMap, new Map(posts.map(p => [p.id, p])), posts, targetUserId);

    const tabs = document.querySelectorAll('.profile-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            tabs.forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            const tabType = e.target.getAttribute('data-tab');
            const timeline = document.getElementById('timeline');
            timeline.innerHTML = '';

            if (tabType === 'posts') {
                renderTimeline(userMap, new Map(posts.map(p => [p.id, p])), posts, targetUserId);
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
                    const el = renderPost(p, userMap, postMap);
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
            const parentEl = renderPost(parentPost, userMap, postMap);
            if (parentEl) parentContainer.appendChild(parentEl);
        }
    }

    if (singleContainer) {
        const el = renderPost(targetPost, userMap, postMap);
        if (el) singleContainer.appendChild(el);
    }

    if (repliesContainer) {
        repliesContainer.innerHTML = '';
        const replies = posts.filter(p => p.replyTo === targetPostId && p.visible);
        if (replies.length > 0) {
            replies.forEach(reply => {
                const el = renderPost(reply, userMap, postMap);
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