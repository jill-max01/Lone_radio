-- \Made by .lone17 with ❤️

local playerRadios = {} -- playerRadios[src] = { name, url, volume }

RegisterNetEvent("playRadio")
RegisterNetEvent("stopRadio")
RegisterNetEvent("stopVehicleRadio")
RegisterNetEvent("updateVolume")
RegisterNetEvent("loneradio:enterVehicle")

AddEventHandler("playRadio", function(radioData)
    local src = source
    local name = radioData.radioname
    local radioUrl = radioData.url
    local volume = radioData.volume or 50
    
    local ped = GetPlayerPed(src)
    local vehicle = GetVehiclePedIsIn(ped, false)

    if vehicle and vehicle ~= 0 then
        Entity(vehicle).state:set('loneradio', {
            name = name,
            url = radioUrl,
            volume = volume,
            isPlaying = true
        }, true)
    end

    -- Save player's radio for persistence
    playerRadios[src] = {
        name = name,
        url = radioUrl,
        volume = volume
    }
end)

-- Player explicitly stopped the radio (from UI pause button)
AddEventHandler("stopRadio", function()
    local src = source
    local ped = GetPlayerPed(src)
    local vehicle = GetVehiclePedIsIn(ped, false)

    if vehicle and vehicle ~= 0 then
        Entity(vehicle).state:set('loneradio', nil, true)
    end

    -- Player explicitly stopped -> clear saved radio (no persist)
    playerRadios[src] = nil
end)

-- Clear vehicle state bag only (used when exiting vehicle with persist)
AddEventHandler("stopVehicleRadio", function()
    local src = source
    local ped = GetPlayerPed(src)
    local vehicle = GetVehiclePedIsIn(ped, false)

    if vehicle and vehicle ~= 0 then
        Entity(vehicle).state:set('loneradio', nil, true)
    end
    -- Do NOT clear playerRadios[src] - player wants to keep their radio
end)

AddEventHandler("updateVolume", function(volume)
    local src = source
    local ped = GetPlayerPed(src)
    local vehicle = GetVehiclePedIsIn(ped, false)

    if vehicle and vehicle ~= 0 then
        local currentState = Entity(vehicle).state.loneradio
        if currentState and currentState.isPlaying then
            local newState = {
                name = currentState.name,
                url = currentState.url,
                volume = volume,
                isPlaying = true
            }
            Entity(vehicle).state:set('loneradio', newState, true)
        end
    end

    if playerRadios[src] then
        playerRadios[src].volume = volume
    end
end)

-- Player entered a new vehicle -> apply saved radio
AddEventHandler("loneradio:enterVehicle", function()
    local src = source

    if not Config.persistRadio then return end
    if not playerRadios[src] then return end

    local ped = GetPlayerPed(src)
    local vehicle = GetVehiclePedIsIn(ped, false)

    if vehicle and vehicle ~= 0 then
        local existingState = Entity(vehicle).state.loneradio
        if not existingState or not existingState.isPlaying then
            local saved = playerRadios[src]
            Entity(vehicle).state:set('loneradio', {
                name = saved.name,
                url = saved.url,
                volume = saved.volume,
                isPlaying = true
            }, true)
        end
    end
end)

-- Clean up on disconnect
AddEventHandler("playerDropped", function()
    local src = source
    playerRadios[src] = nil

    local ped = GetPlayerPed(src)
    if ped and ped ~= 0 then
        local vehicle = GetVehiclePedIsIn(ped, false)
        if vehicle and vehicle ~= 0 then
            local state = Entity(vehicle).state.loneradio
            if state and state.isPlaying then
                Entity(vehicle).state:set('loneradio', nil, true)
            end
        end
    end
end)
