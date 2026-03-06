import { useState, useEffect, useRef } from 'react';
import './index.css';

interface Radio {
    name: string;
    url: string;
    freq?: number;
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

    const setValue = (value: T | ((val: T) => T)) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.warn(`Error setting localStorage key "${key}":`, error);
        }
    };
    return [storedValue, setValue];
}

// Custom hook for dragging the floating mini radio widget
function useDraggableRadio() {
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const isDragging = useRef(false);
    const dragStartCursor = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        isDragging.current = true;
        dragStartCursor.current = {
            x: e.clientX - offset.x,
            y: e.clientY - offset.y
        };
    };

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
    }, [offset]);

    return { offset, handleMouseDown };
}

// Predefined Local Wallpapers
const WALLPAPERS = [
    { id: 'dark', name: 'Classic Dark', url: '' },
    { id: 'wp1', name: 'Neon Drift', url: '/imgs/wallpapers/wp1.jpg' },
    { id: 'wp2', name: 'Cyberpunk City', url: '/imgs/wallpapers/wp2.jpg' },
    { id: 'wp3', name: 'Carbon Fiber', url: '/imgs/wallpapers/wp3.jpg' }
];

function App() {
    const [isVisible, setIsVisible] = useState(false);
    const [radios, setRadios] = useState<Radio[]>([]);
    const [currentVolume, setCurrentVolume] = useState(50);
    const [currentlyPlayingRadio, setCurrentlyPlayingRadio] = useState(false);
    
    // Search feature
    const [searchQuery, setSearchQuery] = useState("");

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
    
    // Tuning Mode States
    const [tuningModeEnabled, setTuningModeEnabled] = useLocalStorage<boolean>('lone_tuningModeEnabled', false);
    const [currentFreq, setCurrentFreq] = useState(87.5);
    const tunerDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Web Audio API for Static
    const audioCtxRef = useRef<AudioContext | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);

    const initStaticAudio = () => {
        if (!audioCtxRef.current) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (!AudioContextClass) return; // not supported browser
            
            const ctx = new AudioContextClass();
            const bufferSize = ctx.sampleRate * 2; // 2 seconds of noise
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            noise.loop = true;
            
            const gain = ctx.createGain();
            gain.gain.value = 0; // Starts muted
            
            noise.connect(gain);
            gain.connect(ctx.destination);
            noise.start();
            
            audioCtxRef.current = ctx;
            gainNodeRef.current = gain;
        } else if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
        }
    };

    // Browser Mock Audio
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Draggable hook for the mini widget
    const { offset: radioOffset, handleMouseDown: handleRadioDrag } = useDraggableRadio();

    // NUI Message Listener
    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const data = event.data;

            if (data.openRadioMenu) {
                setRadios(data.radios || []);
                setCurrentlyPlayingRadio(!!data.currentlyPlayingRadio);
                setActiveTab('radios'); // Reset to radios on explicit open
                setIsVisible(true);
            }
            if (data.close === true) {
                closeRadioMenu(data.closeall || false);
            }
            if (data.showradio === true) {
                setShowMiniRadio(true);
                setCurrentRadioName(data.name || 'Unknown Station');
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    // Status Bar Real-Time Clock Mock
    const [currentTime, setCurrentTime] = useState(new Date());
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000 * 60); // Update every minute
        return () => clearInterval(timer);
    }, []);

    // Escape listener
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                closeRadioMenu(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const sendData = (eventName: string, data: any) => {
        const resourceName = (window as any).GetParentResourceName ? (window as any).GetParentResourceName() : 'Lone_radio';
        fetch(`https://${resourceName}/${eventName}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json; charset=utf-8' },
            body: JSON.stringify(data),
        }).catch(() => console.log('Mock fetch UI:', eventName, data));
    };

    const sendRadioSelection = (name: string, url: string) => {
        sendData('playRadio', { radioname: name, url, volume: currentVolume });
        setShowMiniRadio(true);
        setCurrentRadioName(name);
        setCurrentlyPlayingRadio(true);

        // Browser Testing Only
        if (!(window as any).GetParentResourceName && audioRef.current) {
            audioRef.current.src = url;
            audioRef.current.volume = currentVolume / 100;
            audioRef.current.play().catch(e => console.log("Audio play blocked", e));
        }
    };

    const sendStopRadio = () => {
        sendData('stopRadio', {});
        setCurrentlyPlayingRadio(false); 
        setShowMiniRadio(false);

        if (!(window as any).GetParentResourceName && audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = "";
        }
    };

    // Calculate tuning static and station snapping
    useEffect(() => {
        if (!tuningModeEnabled) {
            if (gainNodeRef.current) gainNodeRef.current.gain.value = 0;
            return;
        }

        let nearestRadio: Radio | null = null;
        let minDiff = Infinity;
        
        radios.forEach(r => {
            if (r.freq) {
                const diff = Math.abs(r.freq - currentFreq);
                if (diff < minDiff) {
                    minDiff = diff;
                    nearestRadio = r;
                }
            }
        });

        if (gainNodeRef.current) {
            // White noise static calculation
            if (minDiff < 0.2) {
                // We are very close to a station, fade out static completely
                gainNodeRef.current.gain.value = Math.max(0, (minDiff * 5) * 0.2); 
            } else {
                // Pure static between stations
                gainNodeRef.current.gain.value = 0.3;
            }
        }

        // Deal with snapping to a station
        // If we stay on a station for 500ms, start playing it
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
            // Stop playing if we scroll away from a station
            if (currentlyPlayingRadio) {
                sendStopRadio();
                setCurrentRadioName('Tuning...');
            }
        }
    }, [currentFreq, tuningModeEnabled, radios]);

    const updateVolume = (vol: number) => {
        setCurrentVolume(vol);
        sendData('updateVolume', { volume: vol });

        if (!(window as any).GetParentResourceName && audioRef.current) {
            audioRef.current.volume = vol / 100;
        }
    };

    const closeRadioMenu = (disableall: boolean) => {
        sendData('closeradio', null);
        setIsVisible(false);
        if (disableall) {
            setShowMiniRadio(false);
        }
    };

    // Helper to generate initials for App icons
    const getInitials = (name: string) => {
        const words = name.trim().split(' ');
        if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
        return name.substring(0, 2).toUpperCase();
    };

    const filteredRadios = radios.filter(r => r.name.toLowerCase().includes(searchQuery.toLowerCase()));

    // Mock tester helper
    const playMockRadio = () => {
        window.dispatchEvent(new MessageEvent('message', {
            data: {
                openRadioMenu: true,
                currentlyPlayingRadio: true,
                radios: [
                    { name: 'Vanavil FM', url: 'https://s7.yesstreaming.net:9000/stream', freq: 88.5 },
                    { name: 'NCS Music', url: 'https://www.youtube.com/watch?v=MsSrIlOi81o', freq: 92.1 },
                    { name: 'Los Santos Rock', url: 'http://url1', freq: 97.8 },
                    { name: 'Non Stop Pop', url: 'http://url2', freq: 100.7 },
                    { name: 'West Coast Classics', url: 'http://url3', freq: 103.2 },
                    { name: 'Radio Los Santos', url: 'http://url4', freq: 106.5 }
                ]
            }
        }));
    };

    return (
        <>
            <audio ref={audioRef} style={{ display: 'none' }} />

            {!isVisible && !showMiniRadio && !(window as any).GetParentResourceName && (
                <button 
                    onClick={playMockRadio} 
                    style={{position: 'absolute', top: '10px', left: '10px', zIndex: 9999, background: '#007aff', color: 'white', padding: '10px 20px', borderRadius: '8px', border:'none', cursor: 'pointer', fontWeight: 'bold'}}
                >
                    Open Mock UI
                </button>
            )}

            {isVisible && (
                <div 
                    className="infotainment-wrapper" 
                >
                    {/* The physical plastic bezel contains the inner display logic and chin branding */}
                    <div id="radioMenu" style={wallpaperUrl ? { backgroundImage: `url('${wallpaperUrl}')` } : {}}>
                        {/* Add overlay to ensure text is readable against any custom bright wallpaper */}
                        {wallpaperUrl && (
                            <div 
                                className="wallpaper-overlay" 
                                style={{ 
                                    backdropFilter: wallpaperBlur ? 'blur(8px)' : 'none',
                                    WebkitBackdropFilter: wallpaperBlur ? 'blur(8px)' : 'none',
                                    background: wallpaperBlur ? 'rgba(15, 15, 20, 0.75)' : 'rgba(15, 15, 20, 0.4)'
                                }}
                            ></div>
                        )}
                        <div className="infotainment-content">
                            
                            {/* OLED Top Status Bar (Non-Draggable) */}
                            <div className="oled-status-bar">
                                <div className="status-left">
                                    <span className="status-time">
                                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                                <div className="status-center" style={{display: 'flex', gap: '15px', justifyContent: 'center'}}>
                                    <span 
                                        className={`oled-nav-item ${activeTab === 'radios' ? 'active' : ''}`} 
                                        onClick={(e) => { e.stopPropagation(); setActiveTab('radios'); }}
                                        style={{cursor: 'pointer', opacity: activeTab === 'radios' ? 1 : 0.5, transition: 'opacity 0.2s', fontWeight: activeTab === 'radios' ? 700 : 500}}
                                    >STATIONS</span>
                                    <span 
                                        className={`oled-nav-item ${activeTab === 'settings' ? 'active' : ''}`} 
                                        onClick={(e) => { e.stopPropagation(); setActiveTab('settings'); }}
                                        style={{cursor: 'pointer', opacity: activeTab === 'settings' ? 1 : 0.5, transition: 'opacity 0.2s', fontWeight: activeTab === 'settings' ? 700 : 500}}
                                    >SETTINGS</span>
                                </div>
                                <div className="status-right">
                                    <span className="status-carrier" style={{marginRight: '6px'}}>LONE 5G</span>
                                    <svg className="status-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C7 3 2.5 5.5 0 9l12 15 12-15C21.5 5.5 17 3 12 3zm0 4.5c3.5 0 6.5 1.5 8.5 4l-8.5 10.5L3.5 11.5c2-2.5 5-4 8.5-4z"/></svg>
                                    <svg className="status-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M21 4H3c-1.1  0-2 .9-2 2v12c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-1 14H4V6h16v12z"/><path d="M6 10h2v6H6zM10 8h2v8h-2zM14 12h2v4h-2z"/></svg>
                                    <svg className="status-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z"/></svg>
                                </div>
                            </div>
                            
                            <div className="oled-app-area">

                                {activeTab === 'radios' && !tuningModeEnabled && (
                                    <div className="app-pane">
                                        <div className="search-container">
                                            <input 
                                                type="text"
                                                className="search-bar"
                                                placeholder="Search stations..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                            />
                                            <div className="station-grid">
                                                {filteredRadios.map((radio, idx) => (
                                                    <div key={idx} className="app-icon-wrapper" onClick={() => sendRadioSelection(radio.name, radio.url)}>
                                                        <div className={`app-icon ${currentRadioName === radio.name ? 'active' : ''}`}>
                                                            {getInitials(radio.name)}
                                                        </div>
                                                        <div className="app-title">{radio.name}</div>
                                                    </div>
                                                ))}
                                                {filteredRadios.length === 0 && (
                                                    <div style={{color: '#888', gridColumn: '1 / -1', textAlign: 'center', marginTop: '30px'}}>
                                                        No stations found matching "{searchQuery}"
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'radios' && tuningModeEnabled && (
                                    <div className="app-pane tuning-pane">
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
                                                    {/* Render static ticks for visual immersion */}
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
                                        <div className="settings-list" style={{paddingTop: '20px'}}>
                                    <div className="settings-group">
                                        <label>Custom Wallpaper</label>
                                        <p style={{margin: 0, color: '#aaa', fontSize: '13px'}}>Select a local wallpaper or paste a custom image URL below.</p>
                                        
                                        {/* Visual Thumbnail Gallery */}
                                        <div className="wallpaper-gallery">
                                            {WALLPAPERS.map((wp) => (
                                                <div 
                                                    key={wp.id}
                                                    className={`wallpaper-thumb ${wallpaperUrl === wp.url ? 'active' : ''}`}
                                                    style={wp.url ? { backgroundImage: `url('${wp.url}')` } : { background: '#111' }}
                                                    onClick={() => setWallpaperUrl(wp.url)}
                                                    title={wp.name}
                                                >
                                                    {/* If it's the dark preset with no URL, show text */}
                                                    {!wp.url && <div style={{width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', color:'#888'}}>{wp.name}</div>}
                                                </div>
                                            ))}
                                        </div>

                                        <input 
                                            type="text" 
                                            className="custom-input" 
                                            placeholder="Paste custom Image URL here..." 
                                            value={wallpaperUrl}
                                            onChange={(e) => setWallpaperUrl(e.target.value)}
                                            style={{ marginTop: '15px' }}
                                        />
                                    </div>
                                    
                                    <div className="settings-group toggle-container">
                                        <div>
                                            <label style={{marginBottom: '4px'}}>Immersive Tuning Mode</label>
                                            <p style={{margin: 0, color: '#aaa', fontSize: '13px'}}>Replaces the grid with an interactive frequency dial and realistic static noise.</p>
                                        </div>
                                        <div 
                                            className={`toggle-switch ${tuningModeEnabled ? 'on' : ''}`}
                                            onClick={() => setTuningModeEnabled(!tuningModeEnabled)}
                                        ></div>
                                    </div>
                                    
                                    <div className="settings-group toggle-container">
                                        <div>
                                            <label style={{marginBottom: '4px'}}>Wallpaper Glass Blur</label>
                                            <p style={{margin: 0, color: '#aaa', fontSize: '13px'}}>Apply a frosted glass blur over the background image so icons pop.</p>
                                        </div>
                                        <div 
                                            className={`toggle-switch ${wallpaperBlur ? 'on' : ''}`}
                                            onClick={() => setWallpaperBlur(!wallpaperBlur)}
                                        ></div>
                                    </div>

                                    <div className="settings-group">
                                        <label>Widget Overlay Scale ({radioScale.toFixed(1)}x)</label>
                                        <input 
                                            type="range"
                                            min="0.5" max="2.0" step="0.1"
                                            value={radioScale}
                                            onChange={(e) => setRadioScale(Number(e.target.value))}
                                        />
                                        <p style={{color: '#aaa', fontSize: '13px', marginTop: '6px', marginBottom: 0}}>Adjusts the size of the mini-radio in the bottom right corner.</p>
                                    </div>
                                    
                                    <div className="settings-group toggle-container">
                                        <div>
                                            <label style={{marginBottom: '4px'}}>Enable Mini Radio Overlay</label>
                                            <p style={{margin: 0, color: '#aaa', fontSize: '13px'}}>Show or completely hide the visual car stereo graphic.</p>
                                        </div>
                                        <div 
                                            className={`toggle-switch ${overlayEnabled ? 'on' : ''}`}
                                            onClick={() => setOverlayEnabled(!overlayEnabled)}
                                        ></div>
                                    </div>
                                    
                                    <div className="settings-group toggle-container">
                                        <div>
                                            <label style={{marginBottom: '4px'}}>Show Active Radio Text</label>
                                            <p style={{margin: 0, color: '#aaa', fontSize: '13px'}}>Display the current station name on the mini-radio LCD screen.</p>
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
                                            <p>Live Broadcast</p>
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
                    
                    {/* Emulate embossed "LONE OS" branding printed heavily onto the car stereo bottom bezel/chin */}
                    <div className="lonedev-brand">LONE OS</div>
                </div>
            )}

            {/* Modern Glassmorphic Digital Radio Overlay */}
            {showMiniRadio && overlayEnabled && (
                <div id="radioIcon" style={{ transform: `translate(${radioOffset.x}px, ${radioOffset.y}px) scale(${radioScale})` }}>
                    <div className="css-radio-chassis" onMouseDown={handleRadioDrag}>
                        
                        <div className="radio-widget-icon">
                            {getInitials(currentRadioName !== '...' ? currentRadioName : 'ON')}
                        </div>
                        
                        <div className="radio-widget-info" style={{visibility: showRadioDisplay ? 'visible' : 'hidden'}}>
                            <div className="radio-widget-title">
                                {currentRadioName !== '...' ? currentRadioName : 'Lone OS Radio'}
                            </div>
                            <div className="radio-widget-subtitle">
                                <span className="live-dot"></span> LIVE BROADCAST
                            </div>
                        </div>

                        {currentlyPlayingRadio && showRadioDisplay && (
                            <div className="radio-widget-eq">
                                <div className="eq-bar"></div>
                                <div className="eq-bar"></div>
                                <div className="eq-bar"></div>
                                <div className="eq-bar"></div>
                            </div>
                        )}

                    </div>
                </div>
            )}
        </>
    );
}

export default App;


