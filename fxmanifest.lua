fx_version 'cerulean'
game 'gta5'

name "lone_radio"
description "qbcore car radio script by lone"
author "Lone"
version "1.0.0"

shared_scripts {
	'shared/*.lua'
}

client_scripts {
	'client/*.lua'
}

server_scripts {
	'server/*.lua'
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
