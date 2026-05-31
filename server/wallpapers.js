const fs = require('fs');
const path = require('path');

let cachedWallpapers = null;

onNet('lone_radio:server:GetWallpapers', () => {
    const src = global.source;
    
    // Read dynamically every time to allow drop-in without restart if desired, or cache it.
    // Let's read it dynamically to satisfy the "dynamically" request perfectly.
    const resourcePath = GetResourcePath(GetCurrentResourceName());
    const wallpapersPath = path.join(resourcePath, 'web', 'dist', 'imgs', 'wallpapers');
    
    let wallpapers = [];
    try {
        if (fs.existsSync(wallpapersPath)) {
            const files = fs.readdirSync(wallpapersPath);
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
        }
    } catch (err) {
        console.error('Error reading wallpapers directory:', err);
    }
    
    emitNet('lone_radio:client:ReceiveWallpapers', src, wallpapers);
});
