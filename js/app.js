document.addEventListener('DOMContentLoaded', async () => {
    // データの読み込み
    const [usersRes, postsRes, trendsRes] = await Promise.all([
        fetch('data/users.json'),
        fetch('data/posts.json'),
        fetch('data/trends.json')
    ]);

    const users = await usersRes.json();
    const posts = await postsRes.json();
    const trends = await trendsRes.json();

    // ユーザーデータをMapにして検索しやすくする
    const userMap = new Map();
    users.forEach(u => userMap.set(u.id, u));

    // タイムラインの生成
    const timeline = document.getElementById('timeline');
    posts.forEach(post => {
        // visibleがfalseのものはスキップ（ゲーム進行による制御）
        if (!post.visible) return;

        const user = userMap.get(post.userId);
        if (!user) return;

        const postElement = document.createElement('div');
        postElement.className = 'post';
        
        postElement.innerHTML = `
            <div class="post-icon">${user.icon}</div>
            <div class="post-content">
                <div class="post-header">
                    <span class="post-name">${user.name}</span>
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

    // トレンドの生成
    const trendContainer = document.getElementById('trend-list');
    trends.forEach(trend => {
        const trendElement = document.createElement('div');
        trendElement.className = 'trend-item';
        
        trendElement.innerHTML = `
            <span class="trend-keyword">${trend.keyword}</span>
            <span class="trend-count">${trend.postsCount} posts</span>
        `;
        trendContainer.appendChild(trendElement);
    });
});