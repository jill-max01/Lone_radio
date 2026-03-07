--Made by .lone17 with ❤️

xSound = exports.xsound

local currentlyPlayingRadio = nil
local exitedwhilePlayingRadio = nil
local songname

RegisterNUICallback("playRadio", function(data, cb)
    local radioUrl = data.url
    local volume = data.volume or 1.0

    if radioUrl then
        TriggerServerEvent("playRadio", { radioname = data.radioname,url = radioUrl, volume = volume })
        currentlyPlayingRadio = { name = data.name, url = radioUrl, volume = volume }
    end

    cb({})
end)

RegisterNetEvent("updateCurrentRadio", function(updatedRadio)
    currentlyPlayingRadio = updatedRadio
    SendNUIMessage({
        updateCurrentRadio = true,
        currentRadio = currentlyPlayingRadio.name
    })
end)

RegisterNUICallback("stopRadio", function(data, cb)
    TriggerServerEvent("stopRadio")
    currentlyPlayingRadio = nil
    cb({})
end)

RegisterNUICallback("updateVolume", function(data, cb)
    local volume = data.volume

    if currentlyPlayingRadio then
        currentlyPlayingRadio.volume = volume
        TriggerServerEvent("updateVolume", volume)
    end

    cb({})
end)

RegisterNUICallback("closeradio", function(data, cb)
    closeRadioMenu()

    cb({})
end)

-- Add volume control using xsound or any other audio library here

function openRadioMenu()
    local ped = PlayerPedId()
    local vehicle = GetVehiclePedIsIn(ped, false)
    
    -- Sync current UI state with the actual vehicle state bag
    if vehicle and vehicle ~= 0 then
        local state = Entity(vehicle).state.loneradio
        if state and state.isPlaying then
            currentlyPlayingRadio = state
        else
            currentlyPlayingRadio = nil
        end
    end

    SetNuiFocus(true, true)
    SendNUIMessage({
        openRadioMenu = true,
        radios = Config.Radios,
        currentlyPlayingRadio = currentlyPlayingRadio
    })
end

function closeRadioMenu()
    SetNuiFocus(false, false)
   
end

function closeRadioMenu2()
        SendNUIMessage({
            close = true,
            closeall = true,               
        })
        SetNuiFocus(false, false)

   
end

-- Example: bind this to a key (e.g., F8) to open/close the radio menu
RegisterCommand(Config.command, function()
    if IsPedInAnyVehicle(PlayerPedId(), false) then
        openRadioMenu()
     end
   
end)

-- Close the radio menu when the player is in a vehicle
Citizen.CreateThread(function()
    while true do
        Citizen.Wait(1000)
        if not IsPedInAnyVehicle(PlayerPedId(), false) then
           TriggerEvent("loneradio:pauseRadio")
           exitedwhilePlayingRadio = false
            closeRadioMenu()
        end
    end
end)

local musicId
local playing = false
-- Active radio tracker for distance/position updates
local activeVehicleRadios = {}
local updateLoopRunning = false

function ManageAudioLoop()
    if updateLoopRunning then return end
    updateLoopRunning = true

    Citizen.CreateThread(function()
        while true do
            local hasActiveRadios = false
            local plyCoords = GetEntityCoords(PlayerPedId())

            for netId, radioData in pairs(activeVehicleRadios) do
                hasActiveRadios = true
                local vehicle = NetToVeh(netId)
                local soundId = "radio_" .. netId

                if DoesEntityExist(vehicle) then
                    local vehCoords = GetEntityCoords(vehicle)
                    
                    if #(plyCoords - vehCoords) < 50.0 then
                        -- Update 3D position if close enough
                        if xSound:soundExists(soundId) then
                            xSound:Position(soundId, vehCoords)
                        end
                    else
                        -- Too far away, destroy local sound to save resources
                        if xSound:soundExists(soundId) then
                            xSound:Destroy(soundId)
                            activeVehicleRadios[netId].isLocalPlaying = false
                        end
                    end
                else
                    -- Vehicle no longer exists locally
                    if xSound:soundExists(soundId) then
                        xSound:Destroy(soundId)
                    end
                    activeVehicleRadios[netId] = nil
                end
            end

            if not hasActiveRadios then
                updateLoopRunning = false
                break
            end
            
            Citizen.Wait(100) -- Check 10 times a second for smooth 3D audio panning
        end
    end)
end

function PlayVehicleRadioLocal(netId, radioData)
    local vehicle = NetToVeh(netId)
    local soundId = "radio_" .. netId

    if DoesEntityExist(vehicle) then
        local vehCoords = GetEntityCoords(vehicle)
        if xSound:soundExists(soundId) then
            xSound:Destroy(soundId)
        end
        
        local vol = (radioData.volume or 1.0) / 100.0 -- Adjust according to UI scale 0-100
        xSound:PlayUrlPos(soundId, radioData.url, vol, vehCoords)
        xSound:Distance(soundId, 25.0) -- Radius players outside the car can hear the radio
        
        activeVehicleRadios[netId] = radioData
        activeVehicleRadios[netId].isLocalPlaying = true
        ManageAudioLoop()
    end
end

-- Listen to the global server vehicle state bag
AddStateBagChangeHandler('loneradio', nil, function(bagName, key, value, _reserved, replicated)
    if not value then
        -- Radio stopped
        local netId = tonumber(bagName:gsub('entity:', ''), 10)
        local soundId = "radio_" .. netId
        if xSound:soundExists(soundId) then
            xSound:Destroy(soundId)
        end
        activeVehicleRadios[netId] = nil

        -- If we are in this specific vehicle, close our UI mini-radio
        local currentVeh = GetVehiclePedIsIn(PlayerPedId(), false)
        if currentVeh ~= 0 and NetworkGetNetworkIdFromEntity(currentVeh) == netId then
            currentlyPlayingRadio = nil
            SendNUIMessage({ close = true })
        end
        return
    end

    -- Radio updated/started
    local netId = tonumber(bagName:gsub('entity:', ''), 10)
    
    -- Play it locally if the vehicle is rendered
    PlayVehicleRadioLocal(netId, value)

    -- If we are physically in this vehicle, update our UI to show the new radio
    local currentVeh = GetVehiclePedIsIn(PlayerPedId(), false)
    if currentVeh ~= 0 and NetworkGetNetworkIdFromEntity(currentVeh) == netId then
        currentlyPlayingRadio = value
        SendNUIMessage({
            showradio = true,
            name = value.name
        })
    end
end)

-- Handle entering a network area and discovering a vehicle that already has a radio playing
Citizen.CreateThread(function()
    while true do
        Citizen.Wait(2000)
        local ped = PlayerPedId()
        local plyCoords = GetEntityCoords(ped)
        
        -- Find nearby vehicles
        local vehicles = GetGamePool("CVehicle")
        for _, vehicle in ipairs(vehicles) do
            local vehCoords = GetEntityCoords(vehicle)
            if #(plyCoords - vehCoords) < 50.0 then
                local state = Entity(vehicle).state.loneradio
                if state and state.isPlaying then
                    local netId = NetworkGetNetworkIdFromEntity(vehicle)
                    local soundId = "radio_" .. netId
                    if not xSound:soundExists(soundId) then
                        PlayVehicleRadioLocal(netId, state)
                    end
                end
            end
        end
    end
end)