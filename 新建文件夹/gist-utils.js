// Gist 配置（需用户自行替换 token 和 gistId）
const GIST_CONFIG = {
    token: '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', // GitHub 个人访问令牌（需有 gist 权限）
    gistId: '700734e27a9b2febc9bcf49ef2dc871a', // 已创建的 Gist ID
    fileName: 'guzi-data.json' // 存储谷子数据的文件名
};

// 从 Gist 获取数据
async function fetchGuziDataFromGist() {
    try {
        const response = await fetch(`https://api.github.com/gists/${GIST_CONFIG.gistId}`, {
            headers: {
                'Authorization': `token ${GIST_CONFIG.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });

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
        alert('获取云端数据失败，将使用本地临时数据！');
        // 降级使用本地存储
        return {
            guziData: JSON.parse(localStorage.getItem('guziData')) || [],
            claimRecords: JSON.parse(localStorage.getItem('claimRecords')) || []
        };
    }
}

// 保存数据到 Gist
async function saveGuziDataToGist(data) {
    try {
        const response = await fetch(`https://api.github.com/gists/${GIST_CONFIG.gistId}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${GIST_CONFIG.token}`,
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

        if (!response.ok) throw new Error(`保存失败：${response.status}`);
        console.log('✅ 数据已同步到 Gist');
        // 同步到本地存储做降级
        localStorage.setItem('guziData', JSON.stringify(data.guziData));
        localStorage.setItem('claimRecords', JSON.stringify(data.claimRecords));
        return true;
    } catch (error) {
        console.error('保存数据到 Gist 失败：', error);
        alert('云端保存失败，仅本地保存！');
        // 降级保存到本地
        localStorage.setItem('guziData', JSON.stringify(data.guziData));
        localStorage.setItem('claimRecords', JSON.stringify(data.claimRecords));
        return false;
    }
}

// 快速同步数据（封装简化调用）
async function syncGuziDataToGist(guziData, claimRecords) {
    return await saveGuziDataToGist({ guziData, claimRecords });
}
