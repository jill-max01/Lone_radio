import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import './index.css';

interface Radio {
    name: string;
    url: string;
    freq?: number;
    genre?: string;
}

interface Wallpaper {
    id: string;
    name: string;
    url: string;
}

// Custom hook to sync state with localStorage
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.warn(`Error reading localStorage key "${key}":`, error);
            return initialValue;
        }
    });

    const setValue = useCallback((value: T | ((val: T) => T)) => {
        setStoredValue(prev => {
            const valueToStore = value instanceof Function ? value(prev) : value;
            try {
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
            } catch (error) {
                console.warn(`Error setting localStorage key "${key}":`, error);
            }
            return valueToStore;
        });
    }, [key]);

    return [storedValue, setValue];
}

// Draggable hook — stable refs, no re-renders during drag
function useDraggableRadio() {
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const isDragging = useRef(false);
    const dragStartCursor = useRef({ x: 0, y: 0 });

    const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        isDragging.current = true;
        dragStartCursor.current = {
            x: e.clientX - offset.x,
            y: e.clientY - offset.y
        };
    }, [offset.x, offset.y]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging.current) return;
            e.preventDefault();
            setOffset({
                x: e.clientX - dragStartCursor.current.x,
                y: e.clientY - dragStartCursor.current.y
            });
        };

        const handleMouseUp = () => {
            isDragging.current = false;
        };

        window.addEventListener('mousemove', handleMouseMove, { passive: false });
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, []);

    return { offset, handleMouseDown };
}

// Default fallback wallpapers if none provided
const DEFAULT_WALLPAPERS: Wallpaper[] = [
    { id: 'dark', name: 'Classic Dark', url: '' },
    { id: 'wp1', name: 'Neon Drift', url: './imgs/wallpapers/wp1.jpg' }
];

// Memoized Station Icon component — prevents re-render of entire grid
const StationIcon = memo(({ radio, isActive, onSelect, initials, isFavorite, onToggleFavorite }: {
    radio: Radio;
    isActive: boolean;
    onSelect: (name: string, url: string) => void;
    initials: string;
    isFavorite: boolean;
    onToggleFavorite: (name: string, e: React.MouseEvent) => void;
}) => (
    <div className="app-icon-wrapper" onClick={() => onSelect(radio.name, radio.url)}>
        <div className={`app-icon ${isActive ? 'active' : ''}`}>
            {initials}
            <div 
                className={`favorite-btn ${isFavorite ? 'active' : ''}`}
                onClick={(e) => onToggleFavorite(radio.name, e)}
            >
                <i className="fa-solid fa-star"></i>
            </div>
        </div>
        <div className="app-title">{radio.name}</div>
        {radio.genre && <div className="app-genre">{radio.genre}</div>}
    </div>
));
StationIcon.displayName = 'StationIcon';

function App() {
    const [isVisible, setIsVisible] = useState(false);
    const [radios, setRadios] = useState<Radio[]>([]);
    const [wallpapers, setWallpapers] = useState<Wallpaper[]>(DEFAULT_WALLPAPERS);
    const [currentVolume, setCurrentVolume] = useState(50);
    const [currentlyPlayingRadio, setCurrentlyPlayingRadio] = useState(false);
    
    // Persist radio config from server
    const [persistRadio, setPersistRadio] = useState(false);
    const [playerPersistOverride, setPlayerPersistOverride] = useLocalStorage<boolean>('lone_persistOverride', true);
    const [favorites, setFavorites] = useLocalStorage<string[]>('lone_favorites', []);

    // Search & Filter
    const [searchQuery, setSearchQuery] = useState("");
    const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
    const [selectedGenre, setSelectedGenre] = useState<string>("All");

    // Stream metadata (simulated or fetched)
    const [streamMeta, setStreamMeta] = useState<string>("Live Broadcast");

    // UI states (Persistent via useLocalStorage)
    const [activeTab, setActiveTab] = useState<'radios'|'settings'>('radios');
    const [radioScale, setRadioScale] = useLocalStorage<number>('lone_radioScale', 1.0);
    const [overlayEnabled, setOverlayEnabled] = useLocalStorage<boolean>('lone_overlayEnabled', true);
    const [showRadioDisplay, setShowRadioDisplay] = useLocalStorage<boolean>('lone_showRadioDisplay', true);
    
    // Infotainment Wallpaper logic
    const [wallpaperUrl, setWallpaperUrl] = useLocalStorage<string>('lone_wallpaperUrl', '');
    const [wallpaperBlur, setWallpaperBlur] = useLocalStorage<boolean>('lone_wallpaperBlur', true);

    // Mini display state
    const [showMiniRadio, setShowMiniRadio] = useState(false);
    const [currentRadioName, setCurrentRadioName] = useState('...');
    
    // Mini-Radio Customization States
    const [widgetAccentColor, setWidgetAccentColor] = useLocalStorage<string>('lone_widgetColor', '#00e5ff');
    const [widgetFrameStyle, setWidgetFrameStyle] = useLocalStorage<string>('lone_widgetFrame', 'hardware'); 
    const [widgetWallpaper, setWidgetWallpaper] = useLocalStorage<boolean>('lone_widgetWallpaper', false);
    const [widgetWallpaperBlur, setWidgetWallpaperBlur] = useLocalStorage<boolean>('lone_widgetWallpaperBlur', true);
    const [oledWallpaperUrl, setOledWallpaperUrl] = useLocalStorage<string>('lone_oledWallpaperUrl', '');

    // Tuning Mode States
    const [tuningModeEnabled, setTuningModeEnabled] = useLocalStorage<boolean>('lone_tuningModeEnabled', false);
    const [currentFreq, setCurrentFreq] = useState(87.5);
    const tunerDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Web Audio API for Static
    const audioCtxRef = useRef<AudioContext | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);

    const initStaticAudio = useCallback(() => {
        if (!audioCtxRef.current) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContextClass) return;
            
            const ctx = new AudioContextClass();
            const bufferSize = ctx.sampleRate * 2;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            noise.loop = true;
            
            const gain = ctx.createGain();
            gain.gain.value = 0;
            
            noise.connect(gain);
            gain.connect(ctx.destination);
            noise.start();
            
            audioCtxRef.current = ctx;
            gainNodeRef.current = gain;
        } else if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
        }
    }, []);

    // Audio element ref
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Draggable hook for the mini widget
    const { offset: radioOffset, handleMouseDown: handleRadioDrag } = useDraggableRadio();

    // Stable sendData callback
    const sendData = useCallback((eventName: string, data: any) => {
        if (!(window as any).GetParentResourceName) return;
        const resourceName = (window as any).GetParentResourceName();
        fetch(`https://${resourceName}/${eventName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify(data),
        }).catch(() => {});
    }, []);

    const sendRadioSelection = useCallback((name: string, url: string) => {
        sendData('playRadio', { radioname: name, url, volume: currentVolume });
        setShowMiniRadio(true);
        setCurrentRadioName(name);
        setCurrentlyPlayingRadio(true);
        
        // Attempt to extract some info from URL as "metadata" since direct ICY fetch is blocked by CORS in browser
        try {
            const parsedUrl = new URL(url);
            setStreamMeta(`${parsedUrl.hostname} - Live Stream`);
        } catch (e) {
            setStreamMeta("Live Broadcast");
        }
    }, [sendData, currentVolume]);

    const sendStopRadio = useCallback(() => {
        sendData('stopRadio', {});
        setCurrentlyPlayingRadio(false); 
        setShowMiniRadio(false);
    }, [sendData]);

    // NUI Message Listener
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const data = event.data;

            if (data.openRadioMenu) {
                setRadios(data.radios || []);
                setCurrentlyPlayingRadio(!!data.currentlyPlayingRadio);
                if (data.persistRadio !== undefined) setPersistRadio(data.persistRadio);
                if (data.playerPersistOverride !== undefined) setPlayerPersistOverride(data.playerPersistOverride);
                setActiveTab('radios');
                setIsVisible(true);
            }
            if (data.updateWallpapers) {
                if (data.wallpapers && data.wallpapers.length > 0) {
                    setWallpapers(data.wallpapers);
                }
            }
            if (data.close === true) {
                setIsVisible(false);
                if (data.closeall) {
                    setShowMiniRadio(false);
                    setCurrentlyPlayingRadio(false);
                }
            }
            if (data.showradio === true) {
                setShowMiniRadio(true);
                setCurrentRadioName(data.name || 'Unknown Station');
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // Status Bar Clock — update every minute only
    const [currentTime, setCurrentTime] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    // Escape key handler
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsVisible(false);
                if ((window as any).GetParentResourceName) {
                    const resourceName = (window as any).GetParentResourceName();
                    fetch(`https://${resourceName}/closeradio`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json; charset=utf-8' },
                        body: JSON.stringify({}),
                    }).catch(() => {});
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Tuning mode static + station snapping
    useEffect(() => {
        if (!tuningModeEnabled) {
            if (gainNodeRef.current) gainNodeRef.current.gain.value = 0;
            return;
        }

        let nearestRadio: Radio | null = null;
        let minDiff = Infinity;
        
        for (const r of radios) {
            if (r.freq) {
                const diff = Math.abs(r.freq - currentFreq);
                if (diff < minDiff) {
                    minDiff = diff;
                    nearestRadio = r;
                }
            }
        }

        if (gainNodeRef.current) {
            if (minDiff < 0.2) {
                gainNodeRef.current.gain.value = Math.max(0, (minDiff * 5) * 0.05); 
            } else {
                gainNodeRef.current.gain.value = 0.08;
            }
        }

        if (tunerDebounceRef.current) clearTimeout(tunerDebounceRef.current);
        
        if (minDiff < 0.1 && nearestRadio) {
            const radName = nearestRadio.name;
            const radUrl = nearestRadio.url;
            tunerDebounceRef.current = setTimeout(() => {
                if (currentRadioName !== radName || !currentlyPlayingRadio) {
                    sendRadioSelection(radName, radUrl);
                }
            }, 800);
        } else {
            if (currentlyPlayingRadio) {
                sendStopRadio();
                setCurrentRadioName('Tuning...');
            }
        }
    }, [currentFreq, tuningModeEnabled, radios]);

    const updateVolume = useCallback((vol: number) => {
        setCurrentVolume(vol);
        sendData('updateVolume', { volume: vol });
    }, [sendData]);

    // Stable initials helper
    const getInitials = useCallback((name: string) => {
        const words = name.trim().split(' ');
        if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    }, []);

    const hexToRgb = useCallback((hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '0, 229, 255';
    }, []);

    const toggleFavorite = useCallback((name: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setFavorites(prev => {
            if (prev.includes(name)) return prev.filter(f => f !== name);
            return [...prev, name];
        });
    }, [setFavorites]);

    // Memoize filtered radios to avoid recalculation
    const filteredRadios = useMemo(() => {
        let result = radios.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()));
        if (showOnlyFavorites) {
            result = result.filter(r => favorites.includes(r.name));
        }
        if (selectedGenre !== "All") {
            result = result.filter(r => r.genre === selectedGenre);
        }
        return result;
    }, [radios, searchQuery, showOnlyFavorites, favorites, selectedGenre]);

    // Unique genres for filter
    const availableGenres = useMemo(() => {
        const genres = new Set<string>();
        radios.forEach(r => { if (r.genre) genres.add(r.genre); });
        return ["All", ...Array.from(genres)];
    }, [radios]);

    // Memoize initials map to avoid recalculation on every render
    const initialsMap = useMemo(() => {
        const map = new Map<string, string>();
        for (const r of radios) {
            map.set(r.name, getInitials(r.name));
        }
        return map;
    }, [radios, getInitials]);

    // Memoize chassis style to reduce inline object creation
    const chassisStyle = useMemo(() => {
        const baseStyle = (bg: string, border: string) => ({ background: bg, border });
        
        const getWpBg = (baseBg: string) => {
            if (widgetWallpaper && wallpaperUrl) {
                return `linear-gradient(${baseBg}, ${baseBg}), url('${wallpaperUrl}') center/cover`;
            }
            return baseBg;
        };

        switch (widgetFrameStyle) {
            case 'glass':
                return baseStyle(
                    getWpBg('rgba(20,20,25,0.9)'),
                    '1px solid rgba(255,255,255,0.1)'
                );
            case 'solid':
                return baseStyle(
                    widgetWallpaper && wallpaperUrl
                        ? `linear-gradient(rgba(10,10,10,0.95), rgba(10,10,10,0.95)), url('${wallpaperUrl}') center/cover`
                        : '#0a0a0c',
                    `1px solid ${widgetAccentColor}`
                );
            case 'transparent':
                return baseStyle(
                    getWpBg('rgba(0,0,0,0.6)'),
                    '1px solid rgba(255,255,255,0.05)'
                );
            case 'neon':
                return baseStyle(
                    widgetWallpaper && wallpaperUrl
                        ? `linear-gradient(rgba(5,5,10,0.9), rgba(5,5,10,0.9)), url('${wallpaperUrl}') center/cover`
                        : '#05050a',
                    `2px solid ${widgetAccentColor}`
                );
            default: // hardware
                return baseStyle(
                    widgetWallpaper && wallpaperUrl
                        ? `linear-gradient(rgba(28,28,30,0.95), rgba(17,17,19,0.95)), url('${wallpaperUrl}') center/cover`
                        : 'linear-gradient(145deg, #1c1c1e, #111113)',
                    '1px solid rgba(255,255,255,0.04)'
                );
        }
    }, [widgetFrameStyle, widgetAccentColor, widgetWallpaper, wallpaperUrl]);

    // Formatted time — avoids new Date formatting on every render
    const formattedTime = useMemo(
        () => currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        [currentTime]
    );

    return (
        <>
            <audio ref={audioRef} style={{ display: 'none' }} />

            {isVisible && (
                <div className="infotainment-wrapper">
                    <div id="radioMenu" style={wallpaperUrl ? { backgroundImage: `url('${wallpaperUrl}')` } : {}}>
                        {wallpaperUrl && (
                            <div 
                                className="wallpaper-overlay" 
                                style={{ 
                                    background: wallpaperBlur ? 'rgba(10, 10, 14, 0.78)' : 'rgba(10, 10, 14, 0.4)'
                                }}
                            ></div>
                        )}
                        <div className="infotainment-content">
                            
                            {/* Status Bar */}
                            <div className="oled-status-bar">
                                <div className="status-left">
                                    <span className="status-time">{formattedTime}</span>
                                </div>
                                <div className="status-center">
                                    <div className="segmented-control">
                                        <div 
                                            className={`segment ${activeTab === 'radios' ? 'active' : ''}`} 
                                            onClick={(e) => { e.stopPropagation(); setActiveTab('radios'); }}
                                        >STATIONS</div>
                                        <div 
                                            className={`segment ${activeTab === 'settings' ? 'active' : ''}`} 
                                            onClick={(e) => { e.stopPropagation(); setActiveTab('settings'); }}
                                        >SETTINGS</div>
                                    </div>
                                </div>
                                <div className="status-right">
                                    <span className="status-carrier" style={{marginRight: '4px'}}>LONE 5G</span>
                                    <svg className="status-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C7 3 2.5 5.5 0 9l12 15 12-15C21.5 5.5 17 3 12 3zm0 4.5c3.5 0 6.5 1.5 8.5 4l-8.5 10.5L3.5 11.5c2-2.5 5-4 8.5-4z"/></svg>
                                    <svg className="status-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M21 4H3c-1.1  0-2 .9-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-1 14H4V6h16v12z"/><path d="M6 10h2v6H6zM10 8h2v8h-2zM14 12h2v4h-2z"/></svg>
                                    <svg className="status-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/></svg>
                                </div>
                            </div>
                            
                            <div className="oled-app-area">

                                {activeTab === 'radios' && !tuningModeEnabled && (
                                    <div className="app-pane">
                                        <div className="search-container">
                                            <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                                                <input 
                                                    type="text"
                                                    className="search-bar"
                                                    placeholder="Search stations..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    style={{flex: 1}}
                                                />
                                                <button 
                                                    className={`tuner-toggle-btn ${showOnlyFavorites ? 'active-filter' : ''}`} 
                                                    onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                                                    title="Favorites"
                                                >
                                                    <i className="fa-solid fa-star"></i>
                                                </button>
                                                <button className="tuner-toggle-btn" onClick={() => setTuningModeEnabled(true)}>
                                                    <i className="fa-solid fa-radio"></i>
                                                    Tuner
                                                </button>
                                            </div>
                                            
                                            {/* Genre Filters */}
                                            <div className="genre-filters">
                                                {availableGenres.map(genre => (
                                                    <div 
                                                        key={genre} 
                                                        className={`genre-pill ${selectedGenre === genre ? 'active' : ''}`}
                                                        onClick={() => setSelectedGenre(genre)}
                                                    >
                                                        {genre}
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="station-grid">
                                                {filteredRadios.map((radio, idx) => (
                                                    <StationIcon
                                                        key={idx}
                                                        radio={radio}
                                                        isActive={currentRadioName === radio.name}
                                                        onSelect={sendRadioSelection}
                                                        initials={initialsMap.get(radio.name) || '??'}
                                                        isFavorite={favorites.includes(radio.name)}
                                                        onToggleFavorite={toggleFavorite}
                                                    />
                                                ))}
                                                {filteredRadios.length === 0 && (
                                                    <div style={{color: '#8e8e93', gridColumn: '1 / -1', textAlign: 'center', marginTop: '30px', fontSize: '13px'}}>
                                                        No stations found matching "{searchQuery}"
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'radios' && tuningModeEnabled && (
                                    <div className="app-pane tuning-pane">
                                        
                                        <div className="tuner-header">
                                            <button className="tuner-toggle-btn back" onClick={() => setTuningModeEnabled(false)}>
                                                &larr; Stations
                                            </button>
                                            <div className="tuner-vol-widget">
                                                <label>VOL</label>
                                                <input 
                                                    type="range" 
                                                    min="0" max="100" step="1" 
                                                    value={currentVolume} 
                                                    onChange={(e) => updateVolume(Number(e.target.value))}
                                                />
                                            </div>
                                        </div>

                                        <div className="tuner-container">
                                            <div className="tuner-digital-readout">
                                                <div className="tuner-number">{currentFreq.toFixed(1)}</div>
                                                <div className="tuner-mhz">MHz</div>
                                            </div>
                                            <div className="tuner-instructions">Scroll the dial to find a station</div>
                                            
                                            <div className="tuner-dial-wrapper">
                                                <input 
                                                    type="range" 
                                                    className="tuner-slider"
                                                    min="87.5" 
                                                    max="108.0" 
                                                    step="0.1" 
                                                    value={currentFreq}
                                                    onMouseDown={initStaticAudio}
                                                    onTouchStart={initStaticAudio}
                                                    onChange={(e) => setCurrentFreq(parseFloat(e.target.value))}
                                                />
                                                <div className="tuner-ticks-container">
                                                    {Array.from({length: 42}).map((_, i) => (
                                                        <div key={i} className={`tuner-tick ${i % 5 === 0 ? 'major' : ''}`}></div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="tuner-station-name">
                                                {currentlyPlayingRadio ? currentRadioName : "Static Noise"}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'settings' && (
                                    <div className="app-pane">
                                        <div className="settings-list" style={{paddingTop: '16px'}}>
                                    <div className="settings-group">
                                        <label>Custom Wallpaper</label>
                                        <p style={{margin: 0, color: '#8e8e93', fontSize: '12px'}}>Select a preset or paste a custom image URL.</p>
                                        
                                        <div className="wallpaper-gallery">
                                            {wallpapers.map((wp) => (
                                                <div 
                                                    key={wp.id}
                                                    className={`wallpaper-thumb ${wallpaperUrl === wp.url ? 'active' : ''}`}
                                                    style={wp.url ? { backgroundImage: `url('${wp.url}')` } : { background: '#111' }}
                                                    onClick={() => setWallpaperUrl(wp.url)}
                                                    title={wp.name}
                                                >
                                                    {!wp.url && <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', color:'#8e8e93'}}>{wp.name}</div>}
                                                </div>
                                            ))}
                                        </div>

                                        <input 
                                            type="text" 
                                            className="custom-input" 
                                            placeholder="Paste custom Image URL here..." 
                                            value={wallpaperUrl}
                                            onChange={(e) => setWallpaperUrl(e.target.value)}
                                            style={{ marginTop: '10px' }}
                                        />
                                    </div>
                                    
                                    <div className="settings-group toggle-container">
                                        <div>
                                            <label style={{marginBottom: '3px'}}>Immersive Tuning Mode</label>
                                            <p style={{margin: 0, color: '#8e8e93', fontSize: '12px'}}>Interactive frequency dial with realistic static noise.</p>
                                        </div>
                                        <div 
                                            className={`toggle-switch ${tuningModeEnabled ? 'on' : ''}`}
                                            onClick={() => setTuningModeEnabled(!tuningModeEnabled)}
                                        ></div>
                                    </div>

                                    {persistRadio && (
                                        <div className="settings-group toggle-container">
                                            <div>
                                                <label style={{marginBottom: '3px'}}>Keep Radio Between Vehicles</label>
                                                <p style={{margin: 0, color: '#8e8e93', fontSize: '12px'}}>Auto-play your station in the next vehicle you enter.</p>
                                            </div>
                                            <div 
                                                className={`toggle-switch ${playerPersistOverride ? 'on' : ''}`}
                                                onClick={() => {
                                                    const newVal = !playerPersistOverride;
                                                    setPlayerPersistOverride(newVal);
                                                    sendData('togglePersist', { enabled: newVal });
                                                }}
                                            ></div>
                                        </div>
                                    )}
                                    
                                    <div className="settings-group toggle-container">
                                        <div>
                                            <label style={{marginBottom: '3px'}}>Wallpaper Glass Blur</label>
                                            <p style={{margin: 0, color: '#8e8e93', fontSize: '12px'}}>Frosted glass blur over the background image.</p>
                                        </div>
                                        <div 
                                            className={`toggle-switch ${wallpaperBlur ? 'on' : ''}`}
                                            onClick={() => setWallpaperBlur(!wallpaperBlur)}
                                        ></div>
                                    </div>

                                    <div className="settings-group">
                                        <label>Widget Accent Color</label>
                                        <p style={{margin: 0, color: '#8e8e93', fontSize: '12px', marginBottom: '6px'}}>Color of the mini-radio glowing text.</p>
                                        <div style={{display: 'flex', gap: '6px'}}>
                                            {['#00e5ff', '#ff2a5f', '#32d74b', '#ff7b00', '#bf55ff', '#ffffff'].map(c => (
                                                <div 
                                                    key={c}
                                                    onClick={() => setWidgetAccentColor(c)}
                                                    style={{
                                                        width: '22px', height: '22px', borderRadius: '50%', backgroundColor: c, 
                                                        cursor: 'pointer', border: widgetAccentColor === c ? '2px solid white' : '2px solid transparent',
                                                        boxShadow: widgetAccentColor === c ? `0 0 8px ${c}` : 'none',
                                                        transition: 'box-shadow 0.15s'
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <div className="settings-group">
                                        <label>Widget Frame Style</label>
                                        <p style={{margin: 0, color: '#8e8e93', fontSize: '12px', marginBottom: '6px'}}>Change the look of the floating radio.</p>
                                        <div style={{display: 'flex', gap: '6px', flexWrap: 'wrap'}}>
                                            {['hardware', 'glass', 'solid', 'transparent', 'neon'].map(style => (
                                                <button 
                                                    key={style}
                                                    className={`tuner-toggle-btn ${widgetFrameStyle === style ? '' : 'back'}`}
                                                    onClick={() => setWidgetFrameStyle(style)}
                                                    style={{padding: '5px 8px', fontSize: '10px', flex: '1 1 auto'}}
                                                >
                                                    {style.toUpperCase()}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="settings-group toggle-container">
                                        <div>
                                            <label style={{marginBottom: '3px'}}>Widget Wallpaper Sync</label>
                                            <p style={{margin: 0, color: '#8e8e93', fontSize: '12px'}}>Apply main wallpaper to the mini-radio background.</p>
                                        </div>
                                        <div 
                                            className={`toggle-switch ${widgetWallpaper ? 'on' : ''}`}
                                            onClick={() => setWidgetWallpaper(!widgetWallpaper)}
                                        ></div>
                                    </div>

                                    <div className="settings-group toggle-container">
                                        <div>
                                            <label style={{marginBottom: '3px'}}>Widget Wallpaper Blur</label>
                                            <p style={{margin: 0, color: '#8e8e93', fontSize: '12px'}}>Glass blur on mini-radio when Wallpaper Sync is active.</p>
                                        </div>
                                        <div 
                                            className={`toggle-switch ${widgetWallpaperBlur ? 'on' : ''}`}
                                            onClick={() => setWidgetWallpaperBlur(!widgetWallpaperBlur)}
                                        ></div>
                                    </div>

                                    <div className="settings-group">
                                        <label>OLED Screen Custom Image</label>
                                        <p style={{margin: 0, color: '#8e8e93', fontSize: '12px'}}>Custom background for the OLED mini screen.</p>
                                        
                                        <div className="wallpaper-gallery" style={{marginTop: '8px'}}>
                                            {wallpapers.map(wp => (
                                                <div 
                                                    key={wp.id} 
                                                    className={`wallpaper-thumb ${oledWallpaperUrl === wp.url ? 'active' : ''}`}
                                                    onClick={() => setOledWallpaperUrl(wp.url)}
                                                    style={{ backgroundImage: wp.url ? `url('${wp.url}')` : 'none', backgroundColor: '#000' }}
                                                >
                                                    {!wp.url && <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'11px', color:'#8e8e93'}}>Black</div>}
                                                </div>
                                            ))}
                                        </div>

                                        <input 
                                            type="text" 
                                            className="custom-input" 
                                            placeholder="Custom inner OLED Image URL..." 
                                            value={oledWallpaperUrl}
                                            onChange={(e) => setOledWallpaperUrl(e.target.value)}
                                            style={{ marginTop: '8px' }}
                                        />
                                    </div>

                                    <div className="settings-group">
                                        <label>Widget Overlay Scale ({radioScale.toFixed(1)}x)</label>
                                        <input 
                                            type="range"
                                            min="0.5" max="2.0" step="0.1"
                                            value={radioScale}
                                            onChange={(e) => setRadioScale(Number(e.target.value))}
                                        />
                                        <p style={{color: '#8e8e93', fontSize: '12px', marginTop: '4px', marginBottom: 0}}>Size of the mini-radio overlay.</p>
                                    </div>
                                    
                                    <div className="settings-group toggle-container">
                                        <div>
                                            <label style={{marginBottom: '3px'}}>Enable Mini Radio Overlay</label>
                                            <p style={{margin: 0, color: '#8e8e93', fontSize: '12px'}}>Show or hide the visual car stereo widget.</p>
                                        </div>
                                        <div 
                                            className={`toggle-switch ${overlayEnabled ? 'on' : ''}`}
                                            onClick={() => setOverlayEnabled(!overlayEnabled)}
                                        ></div>
                                    </div>
                                    
                                    <div className="settings-group toggle-container">
                                        <div>
                                            <label style={{marginBottom: '3px'}}>Show Active Radio Text</label>
                                            <p style={{margin: 0, color: '#8e8e93', fontSize: '12px'}}>Display station name on the mini-radio LCD.</p>
                                        </div>
                                        <div 
                                            className={`toggle-switch ${showRadioDisplay ? 'on' : ''}`}
                                            onClick={() => setShowRadioDisplay(!showRadioDisplay)}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        )}
                        </div>

                        {currentlyPlayingRadio && (
                                <div id="controls">
                                    <div className="now-playing-info">
                                        <div className="now-playing-cover">
                                            {getInitials(currentRadioName !== '...' ? currentRadioName : 'ON')}
                                        </div>
                                        <div className="now-playing-text">
                                            <h4>{currentRadioName !== '...' ? currentRadioName : 'Playing'}</h4>
                                            <p>{streamMeta}</p>
                                        </div>
                                    </div>
                                    
                                    <div id="volumeControl">
                                        <label htmlFor="volumeSlider">Vol</label>
                                        <input 
                                            type="range" 
                                            id="volumeSlider" 
                                            min="0" max="100" step="1" 
                                            value={currentVolume} 
                                            onChange={(e) => updateVolume(Number(e.target.value))}
                                        />
                                        <span id="volumeValue">{currentVolume}%</span>
                                    </div>
                                    
                                    <button id="stopRadio" onClick={sendStopRadio}>Pause</button>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="lonedev-brand">LONE OS</div>
                </div>
            )}

            {/* Mini Radio Widget Overlay */}
            {showMiniRadio && overlayEnabled && (
                <div id="radioIcon" style={{ transform: `translate(${radioOffset.x}px, ${radioOffset.y}px) scale(${radioScale})` }}>
                    <div 
                        className="css-radio-chassis" 
                        onMouseDown={handleRadioDrag}
                        style={chassisStyle}
                    >
                        
                        <div className="radio-hardware-brand">LONE AUDIO <span style={{color: widgetAccentColor}}>{widgetFrameStyle.toUpperCase()}</span></div>

                        <div className="radio-oled-screen" style={{
                            borderColor: widgetAccentColor === '#ffffff' ? '#333' : `rgba(${hexToRgb(widgetAccentColor)}, 0.15)`,
                            ...(oledWallpaperUrl ? {
                                background: `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.8)), url('${oledWallpaperUrl}') center/cover`
                            } : {})
                        }}>
                            <div className="radio-widget-info" style={{visibility: showRadioDisplay ? 'visible' : 'hidden'}}>
                                <div className="radio-widget-title" style={{color: widgetAccentColor, textShadow: `0 0 6px ${widgetAccentColor}80`}}>
                                    {currentRadioName !== '...' ? currentRadioName : 'TUNING'}
                                </div>
                                <div className="radio-widget-subtitle" style={{color: widgetAccentColor, textShadow: `0 0 4px ${widgetAccentColor}40`}}>
                                    {currentlyPlayingRadio ? <><div className="live-dot" style={{backgroundColor: widgetAccentColor, boxShadow: `0 0 4px ${widgetAccentColor}`}}></div> {streamMeta}</> : "STANDBY"}
                                </div>
                            </div>

                            {currentlyPlayingRadio && showRadioDisplay && (
                                <div className="radio-widget-eq">
                                    <div className="eq-bar" style={{backgroundColor: widgetAccentColor}}></div>
                                    <div className="eq-bar" style={{backgroundColor: widgetAccentColor}}></div>
                                    <div className="eq-bar" style={{backgroundColor: widgetAccentColor}}></div>
                                    <div className="eq-bar" style={{backgroundColor: widgetAccentColor}}></div>
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            )}
        </>
    );
}

export default App;
