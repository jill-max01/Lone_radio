-- Made by .lone17 with ❤️

local playerRadios  = {} -- playerRadios[src]       = { name, url, volume }
local lastEventTime = {} -- lastEventTime[src][event] = GetGameTimer() ms — rate-limit guard

-- ============================================================
-- Rate-limit helper
-- ============================================================
local RATE_LIMITS = {
    playRadio   = 1000, -- max once per second
    updateVolume = 200, -- max 5x per second (covers slider release, not drag)
}

local function isRateLimited(src, event)
    local now = GetGameTimer()
    if not lastEventTime[src] then lastEventTime[src] = {} end
    local last = lastEventTime[src][event] or 0
    if (now - last) < (RATE_LIMITS[event] or 500) then
        return true
    end
    lastEventTime[src][event] = now
    return false
end

-- ============================================================
-- Event handlers
-- ============================================================

RegisterNetEvent("playRadio")
AddEventHandler("playRadio", function(radioData)
    local src = source
    if isRateLimited(src, "playRadio") then return end

    local name     = radioData.radioname
    local radioUrl = radioData.url
    local volume   = radioData.volume or 50

    -- Basic server-side validation
    if type(radioUrl) ~= "string" or #radioUrl > 512 then return end
    if type(volume)   ~= "number" or volume < 0 or volume > 100 then
        volume = 50
    end

    local ped     = GetPlayerPed(src)
    local vehicle = GetVehiclePedIsIn(ped, false)

    if vehicle and vehicle ~= 0 then
        Entity(vehicle).state:set('loneradio', {
            name     = name,
            url      = radioUrl,
            volume   = volume,
            isPlaying = true
        }, true)
    end

    -- Save player's radio for persistence
    playerRadios[src] = { name = name, url = radioUrl, volume = volume }
end)

-- ============================================================

RegisterNetEvent("stopRadio")
AddEventHandler("stopRadio", function()
    local src     = source
    local ped     = GetPlayerPed(src)
    local vehicle = GetVehiclePedIsIn(ped, false)

    if vehicle and vehicle ~= 0 then
        Entity(vehicle).state:set('loneradio', nil, true)
    end

    -- Player explicitly stopped -> clear saved radio (no persist)
    playerRadios[src] = nil
end)

-- ============================================================

-- Clear vehicle state bag only (used when exiting vehicle with persist)
RegisterNetEvent("stopVehicleRadio")
AddEventHandler("stopVehicleRadio", function()
    local src     = source
    local ped     = GetPlayerPed(src)
    local vehicle = GetVehiclePedIsIn(ped, false)

    if vehicle and vehicle ~= 0 then
        Entity(vehicle).state:set('loneradio', nil, true)
    end
    -- Do NOT clear playerRadios[src] - player wants to keep their radio
end)

-- ============================================================

RegisterNetEvent("updateVolume")
AddEventHandler("updateVolume", function(volume)
    local src = source
    if isRateLimited(src, "updateVolume") then return end

    if type(volume) ~= "number" or volume < 0 or volume > 100 then return end

    local ped     = GetPlayerPed(src)
    local vehicle = GetVehiclePedIsIn(ped, false)

    if vehicle and vehicle ~= 0 then
        local currentState = Entity(vehicle).state.loneradio
        if currentState and currentState.isPlaying then
            Entity(vehicle).state:set('loneradio', {
                name      = currentState.name,
                url       = currentState.url,
                volume    = volume,
                isPlaying = true
            }, true)
        end
    end

    if playerRadios[src] then
        playerRadios[src].volume = volume
    end
end)

-- ============================================================

-- Player entered a new vehicle -> apply saved radio
RegisterNetEvent("loneradio:enterVehicle")
AddEventHandler("loneradio:enterVehicle", function()
    local src = source

    if not Config.persistRadio then return end
    if not playerRadios[src]   then return end

    local ped     = GetPlayerPed(src)
    local vehicle = GetVehiclePedIsIn(ped, false)

    if vehicle and vehicle ~= 0 then
        local existingState = Entity(vehicle).state.loneradio
        if not existingState or not existingState.isPlaying then
            local saved = playerRadios[src]
            Entity(vehicle).state:set('loneradio', {
                name      = saved.name,
                url       = saved.url,
                volume    = saved.volume,
                isPlaying = true
            }, true)
        end
    end
end)

-- ============================================================
-- Cleanup on disconnect
-- ============================================================

AddEventHandler("playerDropped", function()
    local src = source

    -- NOTE: GetPlayerPed on a dropped player is unreliable (ped may already be invalid).
    -- The entity statebag is automatically cleared by the server when the entity is deleted.
    -- We only need to clean up our own Lua table.
    playerRadios[src]  = nil
    lastEventTime[src] = nil
end)
