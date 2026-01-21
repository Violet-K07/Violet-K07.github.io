// gist-utils.js
// Gist 配置
const GIST_CONFIG = {
    gistId: '1042fb8710e025677ef7db9f416bd68e', // 已创建的 Gist ID
    fileName: 'guzi-data.json' // 存储谷子数据的文件名
};

// 从 localStorage 获取或设置 token
function getGistToken() {
    return localStorage.getItem('gist_token');
}

function setGistToken(token) {
    localStorage.setItem('gist_token', token);
}

// 清除 token
function clearGistToken() {
    localStorage.removeItem('gist_token');
}

// 验证 token 是否有效
async function validateToken(token) {
    if (!token) return false;
    
    try {
        const response = await fetch('https://api.github.com/user', {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            },
            // 添加超时设置
            signal: AbortSignal.timeout(10000) // 10秒超时
        });
        
        return response.ok;
    } catch (error) {
        console.error('验证 token 失败:', error);
        
        // 处理超时错误
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            throw new Error('网络连接超时，请检查网络连接');
        }
        
        // 处理其他错误
        if (error.message.includes('Failed to fetch')) {
            throw new Error('网络连接失败，请检查网络连接');
        }
        
        return false;
    }
}

// 从 Gist 获取数据
async function fetchGuziDataFromGist() {
    try {
        // 获取 token
        const token = getGistToken();
        if (!token) {
            throw new Error('未找到 GitHub Token，请先登录');
        }
        
        const response = await fetch(`https://api.github.com/gists/${GIST_CONFIG.gistId}`, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            },
            signal: AbortSignal.timeout(15000) // 15秒超时
        });

        if (response.status === 401 || response.status === 403) {
            throw new Error('GitHub Token 无效或已过期，请重新登录');
        }

        if (response.status === 404) {
            throw new Error('找不到指定的 Gist，请检查配置');
        }

        if (!response.ok) {
            throw new Error(`GitHub API 请求失败：${response.status}`);
        }
        
        const gist = await response.json();
        const fileContent = gist.files[GIST_CONFIG.fileName]?.content;
        
        if (!fileContent) {
            // 首次无数据时初始化空结构
            await saveGuziDataToGist({ guziData: [], claimRecords: [] });
            return { guziData: [], claimRecords: [] };
        }

        return JSON.parse(fileContent);
    } catch (error) {
        console.error('从 Gist 获取数据失败：', error);
        
        // 重新抛出错误，让调用方处理
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            throw new Error('数据加载超时，请检查网络连接');
        }
        
        if (error.message.includes('Failed to fetch')) {
            throw new Error('网络连接失败，无法加载数据');
        }
        
        throw error;
    }
}

// 保存数据到 Gist
async function saveGuziDataToGist(data) {
    const token = getGistToken();
    
    if (!token) {
        throw new Error('未登录，请先登录才能保存数据');
    }
    
    try {
        const response = await fetch(`https://api.github.com/gists/${GIST_CONFIG.gistId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                files: {
                    [GIST_CONFIG.fileName]: {
                        content: JSON.stringify(data, null, 2)
                    }
                }
            }),
            signal: AbortSignal.timeout(15000) // 15秒超时
        });

        if (response.status === 401 || response.status === 403) {
            throw new Error('GitHub Token 已过期，请重新登录');
        }

        if (!response.ok) {
            throw new Error(`保存失败：${response.status}`);
        }
        
        console.log('✅ 数据已同步到 Gist');
        
        // 同步到本地存储做降级
        try {
            localStorage.setItem('guziData_backup', JSON.stringify(data.guziData));
            localStorage.setItem('claimRecords_backup', JSON.stringify(data.claimRecords));
        } catch (e) {
            console.warn('本地备份失败：', e);
        }
        
        return true;
    } catch (error) {
        console.error('保存数据到 Gist 失败：', error);
        
        // 重新抛出错误
        if (error.name === 'AbortError' || error.name === 'TimeoutError') {
            throw new Error('保存超时，请检查网络连接');
        }
        
        throw error;
    }
}

// 快速同步数据
async function syncGuziDataToGist(guziData, claimRecords) {
    return await saveGuziDataToGist({ guziData, claimRecords });
}

// 暴露全局函数
window.getGistToken = getGistToken;
window.setGistToken = setGistToken;
window.clearGistToken = clearGistToken;
window.validateToken = validateToken;
window.fetchGuziDataFromGist = fetchGuziDataFromGist;
window.saveGuziDataToGist = saveGuziDataToGist;
window.syncGuziDataToGist = syncGuziDataToGist;