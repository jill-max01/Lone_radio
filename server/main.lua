-- \Made by .lone17 with ❤️

local currentVolume = 1.0 -- Default volume (1.0 = 100%)

RegisterNetEvent("playRadio")
RegisterNetEvent("stopRadio")
RegisterNetEvent("updateVolume")

AddEventHandler("playRadio", function(radioData)
    local src = source
    local name = radioData.radioname
    local radioUrl = radioData.url
    local volume = radioData.volume or currentVolume
    
    local ped = GetPlayerPed(src)
    local vehicle = GetVehiclePedIsIn(ped, false)

    -- Only allow playing radio if inside a vehicle
    if vehicle and vehicle ~= 0 then
        -- Set the State Bag on the vehicle entity
        -- Use true for the 3rd argument to sync to all clients
        Entity(vehicle).state:set('loneradio', {
            name = name,
            url = radioUrl,
            volume = volume,
            isPlaying = true
        }, true)
    end
end)

AddEventHandler("stopRadio", function()
    local src = source
    local ped = GetPlayerPed(src)
    local vehicle = GetVehiclePedIsIn(ped, false)

    if vehicle and vehicle ~= 0 then
        -- Clear the State Bag on the vehicle
        Entity(vehicle).state:set('loneradio', nil, true)
    end
end)

AddEventHandler("updateVolume", function(volume)
    local src = source
    local ped = GetPlayerPed(src)
    local vehicle = GetVehiclePedIsIn(ped, false)

    if vehicle and vehicle ~= 0 then
        local currentState = Entity(vehicle).state.loneradio
        if currentState and currentState.isPlaying then
            -- Create a new table to trigger the state bag change detector correctly
            local newState = {
                name = currentState.name,
                url = currentState.url,
                volume = volume,
                isPlaying = true
            }
            Entity(vehicle).state:set('loneradio', newState, true)
        end
    end
end)




