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
// (以降の関数はそのまま)