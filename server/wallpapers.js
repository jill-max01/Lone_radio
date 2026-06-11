const fs = require('fs');
const path = require('path');

let cachedWallpapers = null;

onNet('lone_radio:server:GetWallpapers', async () => {
    const src = global.source;
    
    // Read dynamically but asynchronously to avoid blocking the main server thread,
    // which prevents server lag spikes on high population servers while maintaining drop-in updates.
    const resourcePath = GetResourcePath(GetCurrentResourceName());
    const wallpapersPath = path.join(resourcePath, 'web', 'dist', 'imgs', 'wallpapers');
    
    let wallpapers = [];
    try {
        const files = await fs.promises.readdir(wallpapersPath);
        files.forEach(file => {
            const ext = path.extname(file).toLowerCase();
            if (ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.gif' || ext === '.webp') {
                wallpapers.push({
                    id: file,
                    name: file.replace(ext, ''),
                    url: `./imgs/wallpapers/${file}`
                });
            }
        });
    } catch (err) {
        if (err.code !== 'ENOENT') {
            console.error('Error reading wallpapers directory:', err);
        }
    }
    
    emitNet('lone_radio:client:ReceiveWallpapers', src, wallpapers);
});
