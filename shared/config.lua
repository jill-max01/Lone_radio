-- Made by .lone17 with ❤️

Config = {}

Config.command = "fmradio"

-- Admin toggle: if true, radio persists when player exits vehicle and auto-plays in next vehicle
-- Players can individually disable this from the radio settings UI
Config.persistRadio = true

--All streaming URLs sourced from https://www.internet-radio.com

Config.Radios = {
    { name = "Vanavil FM",        url = "https://s7.yesstreaming.net:9000/stream",                       freq = 88.5, genre = "Pop" },
    { name = "LONE FM",        url = "https://stream.zeno.fm/rttf20bp97zuv",                       freq = 87.1, genre = "Pop" },
    { name = "Pink Noise",        url = "https://uk1.internet-radio.com/proxy/pinknoise?mp=/stream;",    freq = 89.3, genre = "Pop" },
    { name = "Hawkar Radio",      url = "https://uk3.internet-radio.com/proxy/hawkar?mp=/stream;",       freq = 90.1, genre = "Rock" },
    { name = "0 Radio",           url = "https://uk7.internet-radio.com/proxy/0radio?mp=/stream",        freq = 91.5, genre = "Dance" },
    { name = "Majestic Jukebox",  url = "https://uk3.internet-radio.com/proxy/majesticjukebox?mp=/stream", freq = 92.7, genre = "Classic" },
    { name = "Dance UK",          url = "https://uk2.internet-radio.com/proxy/danceuk?mp=/stream;",      freq = 93.9, genre = "Dance" },
    { name = "MoveDaHouse",       url = "https://uk7.internet-radio.com/proxy/movedahouse?mp=/stream;",  freq = 94.5, genre = "Dance" },
    { name = "Radio Merge",       url = "https://uk7.internet-radio.com/proxy/radiomerge?mp=/stream;",   freq = 95.3, genre = "Pop" },
    { name = "1940s Radio",       url = "https://uk3.internet-radio.com/proxy/1940sradio?mp=/stream",    freq = 96.1, genre = "Classic" },
    { name = "Ambient Radio",     url = "https://uk2.internet-radio.com/proxy/ambientradio?mp=/stream;", freq = 97.3, genre = "Chill" },
    { name = "DifferentDrumz",    url = "https://differentdrumz.radioca.st:443/stream/1/",               freq = 98.5, genre = "Electronic" },
    { name = "Only Hit 90s",      url = "https://stream.onlyhit.us:443/stream/4/",                       freq = 99.1, genre = "Retro" },
    { name = "Only Hit 80s",      url = "https://stream.onlyhit.us:443/stream/3/",                       freq = 100.3, genre = "Retro" },
    { name = "Nature Sleep",      url = "https://az1.mediacp.eu:443/listen/natureradiosleep/stream/1/",  freq = 101.7, genre = "Chill" },
    { name = "PartyVibe",         url = "http://www.partyviberadio.com:8000/stream/1/",                  freq = 103.1, genre = "Electronic" },
    { name = "CDN Stream",        url = "https://shoutcast-new.cdnstream.com:443/stream/118/",           freq = 104.5, genre = "Rock" },
    { name = "Sonic FM",          url = "https://sonic.streamingchilenos.com:8138/stream/1/",            freq = 105.9, genre = "Pop" },
    { name = "Radio Romania",     url = "https://radio.sonicpanel.ro:8224/stream/1/",                    freq = 107.3, genre = "News" },
}

-- Wallpapers list
-- Drop your images into Lone_radio/web/dist/imgs/wallpapers/ 
-- and add the filename here.
Config.Wallpapers = {
    { id = 'dark', name = 'Classic Dark', url = '' },
    { id = 'wp1', name = 'Neon Drift', url = './imgs/wallpapers/wp1.jpg' },
    { id = 'wp2', name = 'Cyberpunk City', url = './imgs/wallpapers/wp2.jpg' },
    { id = 'wp3', name = 'Carbon Fiber', url = './imgs/wallpapers/wp3.jpg' }
}
