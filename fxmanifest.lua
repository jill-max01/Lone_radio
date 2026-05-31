fx_version 'cerulean'
game 'gta5'

name "lone_radio"
description "standalone car radio script by lone"
author "Lone"
version "1.0.1"

shared_scripts {
	'shared/*.lua'
}

client_scripts {
	'client/*.lua'
}

server_scripts {
	'server/*.lua',
	'server/*.js'
}

ui_page 'web/dist/index.html'

files {
	'web/dist/index.html',
    'web/dist/assets/*',
    'web/dist/imgs/*',
	'web/dist/imgs/wallpapers/*'
}

dependencies {
	'olisound'
  }
