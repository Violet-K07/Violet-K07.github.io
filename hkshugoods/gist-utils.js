// gist-utils.js
// Gist 配置（移除了硬编码的 token）
const GIST_CONFIG = {
    gistId: '700734e27a9b2febc9bcf49ef2dc871a', // 已创建的 Gist ID
    fileName: 'guzi-data.json' // 存储谷子数据的文件名
};

// 从 localStorage 获取或设置 token
function getGistToken() {
    return localStorage.getItem('gist_token');
}

function setGistToken(token) {
    localStorage.setItem('gist_token', token);
}

// 清除 token（用于重新登录）
function clearGistToken() {
    localStorage.removeItem('gist_token');
}

// 验证 token 是否有效
async function validateToken(token) {
    if (!token) return false;
    
    try {
        const response = await fetch('https://api.github.com/gists', {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        return response.ok;
    } catch (error) {
        console.error('验证 token 失败:', error);
        return false;
    }
}

// 从 Gist 获取数据
async function fetchGuziDataFromGist() {
    try {
        // 获取 token
        const token = getGistToken();
        if (!token) {
            throw new Error('未找到 token，需要用户登录');
        }
        
        const response = await fetch(`https://api.github.com/gists/${GIST_CONFIG.gistId}`, {
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (response.status === 401 || response.status === 403) {
            // token 无效
            clearGistToken();
            throw new Error('Token 无效或已过期');
        }

        if (!response.ok) throw new Error(`请求失败：${response.status}`);
        
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
        
        // 抛出错误，由调用方处理
        throw error;
    }
}

// 保存数据到 Gist
async function saveGuziDataToGist(data) {
    const token = getGistToken();
    
    if (!token) {
        console.error('没有可用的 token，无法保存到云端');
        // 降级保存到本地
        localStorage.setItem('guziData', JSON.stringify(data.guziData));
        localStorage.setItem('claimRecords', JSON.stringify(data.claimRecords));
        return false;
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
            })
        });

        if (response.status === 401 || response.status === 403) {
            // token 无效
            clearGistToken();
            throw new Error('Token 已过期，请重新登录');
        }

        if (!response.ok) throw new Error(`保存失败：${response.status}`);
        
        console.log('✅ 数据已同步到 Gist');
        // 同步到本地存储做降级
        localStorage.setItem('guziData', JSON.stringify(data.guziData));
        localStorage.setItem('claimRecords', JSON.stringify(data.claimRecords));
        return true;
    } catch (error) {
        console.error('保存数据到 Gist 失败：', error);
        // 降级保存到本地
        localStorage.setItem('guziData', JSON.stringify(data.guziData));
        localStorage.setItem('claimRecords', JSON.stringify(data.claimRecords));
        throw error;
    }
}

// 快速同步数据（封装简化调用）
async function syncGuziDataToGist(guziData, claimRecords) {
    return await saveGuziDataToGist({ guziData, claimRecords });
}

// 重新登录功能
async function reEnterToken(newToken) {
    try {
        // 验证新 token
        const isValid = await validateToken(newToken);
        if (!isValid) {
            throw new Error('Token 无效');
        }
        
        // 保存新 token
        setGistToken(newToken);
        return true;
    } catch (error) {
        console.error('重新登录失败:', error);
        throw error;
    }
}

// 初始化本地数据（如果没有云端数据时使用）
function initLocalData() {
    const localGuziData = JSON.parse(localStorage.getItem('guziData')) || [];
    const localClaimRecords = JSON.parse(localStorage.getItem('claimRecords')) || [];
    
    // 如果没有本地数据，使用示例数据初始化
    if (localGuziData.length === 0) {
        const sampleData = [
            {
                category: "示例谷子A",
                stock: 10,
                price: 25.5,
                kunxu: "捆序1",
                imgSrc: "https://via.placeholder.com/180",
                claimers: []
            },
            {
                category: "示例谷子B",
                stock: 5,
                price: 35.0,
                kunxu: "不捆",
                imgSrc: "https://via.placeholder.com/180",
                claimers: []
            }
        ];
        
        localStorage.setItem('guziData', JSON.stringify(sampleData));
        localStorage.setItem('claimRecords', JSON.stringify([]));
        
        return {
            guziData: sampleData,
            claimRecords: []
        };
    }
    
    return {
        guziData: localGuziData,
        claimRecords: localClaimRecords
    };
}

// 导出函数供外部调用
window.gistUtils = {
    getGistToken,
    setGistToken,
    clearGistToken,
    validateToken,
    fetchGuziDataFromGist,
    saveGuziDataToGist,
    syncGuziDataToGist,
    reEnterToken,
    initLocalData
};